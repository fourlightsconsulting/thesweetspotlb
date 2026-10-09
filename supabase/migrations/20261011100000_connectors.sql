-- Connectors: scheduled jobs that bring in ad and audience numbers, and the
-- sweep that retries anything the website couldn't send at the time.
--
--   meta-ads   hourly      Meta ads (spend and results, per ad, day and placement)
--   social     every 6 h   Instagram and Facebook page numbers, per day
--   google     daily       GA4 and Search Console, plus Google Ads cost via GA4
--   sweep      10 minutes  WhatsApp alerts and Meta events still waiting (the website)
--
-- pg_cron starts each job through run_job(), which posts to it with pg_net
-- and records a job_runs row; reconcile_jobs() fills in the outcome from
-- pg_net's response. (pg_cron alone reports a job as succeeded as soon as
-- the call is queued, whatever then happens; ported from Thirty, 152.)
--
-- The jobs check a shared secret generated here, kept in Vault, never in a
-- file: pg_net sends it, and the jobs ask job_secret_ok() whether it's right.

create extension if not exists pg_net with schema extensions;

-- ─── Where the jobs live ──────────────────────────────────────────────────

insert into public.site_settings (key, value, is_public)
values (
  'jobs',
  jsonb_build_object(
    'functions_url', 'https://ddzultrxxexqzvjvjqug.supabase.co/functions/v1',
    'site_url', 'https://thesweetspotlb.com'
  ),
  false
)
on conflict (key) do nothing;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'job_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'job_secret',
      'Sent by run_job() to the scheduled jobs, which check it with job_secret_ok().'
    );
  end if;
end;
$$;

/** Whether a job request carries the shared secret. The jobs' server-side clients only. */
create function public.job_secret_ok(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.decrypted_secret = p_secret and length(p_secret) >= 32
     from vault.decrypted_secrets s where s.name = 'job_secret'),
    false
  );
$$;

revoke execute on function public.job_secret_ok(text) from public, anon, authenticated;
grant execute on function public.job_secret_ok(text) to service_role;

-- ─── Runs ─────────────────────────────────────────────────────────────────

create table public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  -- A manual run (with a date range or a dry run) records who asked.
  requested_by uuid references auth.users (id) on delete set null,
  request jsonb not null default '{}',
  pg_net_id bigint,
  queued_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text not null default 'pending'
    check (outcome in ('pending', 'ok', 'skipped', 'failed', 'unknown')),
  status_code integer,
  -- What the job answered ({ ok, imported, warnings… }), or the error.
  response jsonb,
  error text
);

create index job_runs_job_idx on public.job_runs (job, queued_at desc);
create index job_runs_pending_idx on public.job_runs (queued_at) where outcome = 'pending';

alter table public.job_runs enable row level security;
create policy "Managers read job runs" on public.job_runs
  for select to authenticated using ((select public.is_staff('manager')));
revoke all on public.job_runs from anon, authenticated;
grant select on public.job_runs to authenticated;
grant all on public.job_runs to service_role;

/**
 * Starts a job: posts to it (with the secret) and records the run. `p_body`
 * goes to the job: { since, until } for a backfill, { dry_run: true } to
 * fetch without writing. Managers can start one from the admin.
 */
create function public.run_job(p_job text, p_body jsonb default '{}')
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_settings jsonb;
  v_url text;
  v_secret text;
  v_request bigint;
  v_run bigint;
begin
  if current_user = 'authenticated' and not public.is_staff('manager') then
    raise exception 'run_job: managers only' using errcode = '42501';
  end if;
  select value into v_settings from public.site_settings where key = 'jobs';
  v_url := case p_job
    when 'meta-ads' then (v_settings ->> 'functions_url') || '/import-meta-ads'
    when 'social' then (v_settings ->> 'functions_url') || '/import-social'
    when 'google' then (v_settings ->> 'functions_url') || '/import-google'
    when 'sweep' then (v_settings ->> 'site_url') || '/api/jobs/sweep'
  end;
  if v_url is null then
    raise exception 'run_job: unknown job "%"', p_job;
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'job_secret';

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-secret', v_secret),
    body := coalesce(p_body, '{}'),
    -- The imports can take a while (Meta pages through results).
    timeout_milliseconds := 120000
  ) into v_request;

  insert into public.job_runs (job, requested_by, request, pg_net_id)
  values (p_job, (select auth.uid()), coalesce(p_body, '{}'), v_request)
  returning id into v_run;
  return v_run;
end;
$$;

revoke execute on function public.run_job(text, jsonb) from public, anon;
grant execute on function public.run_job(text, jsonb) to authenticated, service_role;

/**
 * Fills in finished runs from pg_net's responses. A job that answers
 * { "ok": true, "skipped": … } (not set up yet) is `skipped`, not failed.
 */
create function public.reconcile_jobs() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_done integer;
begin
  with responses as (
    select r.id, r.status_code, r.timed_out, r.error_msg,
      case when r.content ~ '^\s*\{' then r.content::jsonb end as body
    from net._http_response r
  )
  update public.job_runs j
  set finished_at = now(),
      status_code = r.status_code,
      response = r.body,
      error = case
        when r.timed_out then 'Timed out'
        when r.error_msg is not null then left(r.error_msg, 500)
        when r.status_code not between 200 and 299 then
          left(coalesce(r.body ->> 'error', r.body ->> 'stage', 'HTTP ' || r.status_code), 500)
      end,
      outcome = case
        when r.status_code between 200 and 299 and (r.body ->> 'skipped') is not null then 'skipped'
        when r.status_code between 200 and 299 and coalesce(r.body ->> 'ok', 'true') <> 'false' then 'ok'
        else 'failed'
      end
  from responses r
  where r.id = j.pg_net_id and j.outcome = 'pending';
  get diagnostics v_done = row_count;

  -- pg_net keeps responses for a few hours; a run never seen by then is unknown.
  update public.job_runs set outcome = 'unknown', finished_at = now()
  where outcome = 'pending' and queued_at < now() - interval '3 hours';

  -- Keep successes a month and problems half a year.
  delete from public.job_runs where outcome in ('ok', 'skipped') and queued_at < now() - interval '30 days';
  delete from public.job_runs where queued_at < now() - interval '180 days';
  return v_done;
end;
$$;

revoke execute on function public.reconcile_jobs() from public, anon, authenticated;
grant execute on function public.reconcile_jobs() to service_role;

-- ─── Ad results ───────────────────────────────────────────────────────────
-- One row per platform, account, day, ad and placement: Meta (imported),
-- Google Ads (cost by campaign, through GA4) and spend entered by hand
-- (flyers, influencers…). Results are as each platform reports them; our own
-- orders are the truth, these are for cost and reach.

create table public.ad_performance (
  id bigint generated always as identity primary key,
  platform text not null check (platform in ('meta', 'google', 'manual')),
  account_id text not null default '',
  day date not null,
  campaign_id text not null default '',
  campaign_name text not null default '',
  adset_id text not null default '',
  adset_name text not null default '',
  ad_id text not null default '',
  ad_name text not null default '',
  -- facebook / instagram / messenger…, and feed / story / reels…; 'all' when not split.
  publisher text not null default 'all',
  placement text not null default 'all',
  spend_cents integer not null default 0 check (spend_cents >= 0),
  impressions integer,
  clicks integer,
  link_clicks integer,
  landing_page_views integer,
  add_to_cart integer,
  initiate_checkout integer,
  purchases integer,
  purchase_value_cents integer,
  messaging_started integer,
  video_views integer,
  profile_visits integer,
  -- Manual spend: what it was for.
  note text not null default '' check (char_length(note) <= 200),
  imported_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (platform, account_id, day, campaign_id, adset_id, ad_id, publisher, placement)
);

create index ad_performance_day_idx on public.ad_performance (day, platform);

create trigger ad_performance_audit after insert or update or delete on public.ad_performance
  for each row execute function public.audit_row();

alter table public.ad_performance enable row level security;
create policy "Managers read ad results" on public.ad_performance
  for select to authenticated using ((select public.is_staff('manager')));
-- By hand, only manual spend; the imports write the rest with the secret key.
create policy "Managers add spend" on public.ad_performance
  for insert to authenticated
  with check ((select public.is_staff('manager')) and platform = 'manual');
create policy "Managers change spend" on public.ad_performance
  for update to authenticated
  using ((select public.is_staff('manager')) and platform = 'manual')
  with check ((select public.is_staff('manager')) and platform = 'manual');
create policy "Managers remove spend" on public.ad_performance
  for delete to authenticated
  using ((select public.is_staff('manager')) and platform = 'manual');

revoke all on public.ad_performance from anon, authenticated;
grant select, insert, update, delete on public.ad_performance to authenticated;
grant all on public.ad_performance to service_role;

/**
 * Replaces one platform account's rows for [since, until] with `p_rows`, in
 * one transaction: the platforms revise recent days, and a window replaced
 * whole can't leave yesterday's version of a row beside today's.
 */
create function public.replace_ad_performance(
  p_platform text, p_account_id text, p_since date, p_until date, p_rows jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_deleted integer;
  v_inserted integer;
begin
  if p_platform not in ('meta', 'google') then
    raise exception 'replace_ad_performance: only imported platforms';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'replace_ad_performance: rows must be an array';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) r
    where (r ->> 'day')::date not between p_since and p_until
  ) then
    raise exception 'replace_ad_performance: a row falls outside % – %', p_since, p_until;
  end if;

  delete from public.ad_performance
  where platform = p_platform and account_id = p_account_id and day between p_since and p_until;
  get diagnostics v_deleted = row_count;

  insert into public.ad_performance (
    platform, account_id, day, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name,
    publisher, placement, spend_cents, impressions, clicks, link_clicks, landing_page_views,
    add_to_cart, initiate_checkout, purchases, purchase_value_cents, messaging_started,
    video_views, profile_visits
  )
  select p_platform, p_account_id, r.day,
    coalesce(r.campaign_id, ''), coalesce(r.campaign_name, ''),
    coalesce(r.adset_id, ''), coalesce(r.adset_name, ''),
    coalesce(r.ad_id, ''), coalesce(r.ad_name, ''),
    coalesce(r.publisher, 'all'), coalesce(r.placement, 'all'),
    coalesce(r.spend_cents, 0), r.impressions, r.clicks, r.link_clicks, r.landing_page_views,
    r.add_to_cart, r.initiate_checkout, r.purchases, r.purchase_value_cents, r.messaging_started,
    r.video_views, r.profile_visits
  from jsonb_to_recordset(p_rows) as r (
    day date, campaign_id text, campaign_name text, adset_id text, adset_name text,
    ad_id text, ad_name text, publisher text, placement text, spend_cents integer,
    impressions integer, clicks integer, link_clicks integer, landing_page_views integer,
    add_to_cart integer, initiate_checkout integer, purchases integer,
    purchase_value_cents integer, messaging_started integer, video_views integer,
    profile_visits integer
  );
  get diagnostics v_inserted = row_count;
  return jsonb_build_object('deleted', v_deleted, 'inserted', v_inserted);
end;
$$;

revoke execute on function public.replace_ad_performance(text, text, date, date, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_ad_performance(text, text, date, date, jsonb) to service_role;

-- ─── Audience and search numbers ──────────────────────────────────────────
-- What only Google and Meta know, as one long table: a source and report
-- (ga4/overview, ga4/page, gsc/query, instagram/account…), a day, up to three
-- dimensions (a page, a search term, a country…) and its numbers. Search
-- position is stored as position × impressions, so averages over any rows
-- stay right (sum ÷ impressions).

create table public.insight_rows (
  source text not null check (source in ('ga4', 'gsc', 'instagram', 'facebook')),
  report text not null check (report ~ '^[a-z_]{2,30}$'),
  day date not null,
  dim1 text not null default '',
  dim2 text not null default '',
  dim3 text not null default '',
  metrics jsonb not null default '{}' check (jsonb_typeof(metrics) = 'object'),
  imported_at timestamptz not null default now(),
  primary key (source, report, day, dim1, dim2, dim3)
);

alter table public.insight_rows enable row level security;
create policy "Managers read insights" on public.insight_rows
  for select to authenticated using ((select public.is_staff('manager')));
revoke all on public.insight_rows from anon, authenticated;
grant select on public.insight_rows to authenticated;
grant all on public.insight_rows to service_role;

/** Replaces one report's rows for [since, until] (GA4, Search Console). */
create function public.replace_insight_rows(
  p_source text, p_report text, p_since date, p_until date, p_rows jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_deleted integer;
  v_inserted integer;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'replace_insight_rows: rows must be an array';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) r
    where (r ->> 'day')::date not between p_since and p_until
  ) then
    raise exception 'replace_insight_rows: a row falls outside % – %', p_since, p_until;
  end if;
  delete from public.insight_rows
  where source = p_source and report = p_report and day between p_since and p_until;
  get diagnostics v_deleted = row_count;
  insert into public.insight_rows (source, report, day, dim1, dim2, dim3, metrics)
  select p_source, p_report, r.day, coalesce(r.dim1, ''), coalesce(r.dim2, ''),
    coalesce(r.dim3, ''), coalesce(jsonb_strip_nulls(r.metrics), '{}')
  from jsonb_to_recordset(p_rows) as r (day date, dim1 text, dim2 text, dim3 text, metrics jsonb)
  on conflict (source, report, day, dim1, dim2, dim3) do update set metrics = excluded.metrics;
  get diagnostics v_inserted = row_count;
  return jsonb_build_object('deleted', v_deleted, 'inserted', v_inserted);
end;
$$;

/**
 * Adds rows, keeping earlier numbers where the new ones are missing
 * (Instagram's daily figures come and go between calls; a later pass
 * fills the gaps without erasing what an earlier one found).
 */
create function public.merge_insight_rows(p_source text, p_rows jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  insert into public.insight_rows as i (source, report, day, dim1, dim2, dim3, metrics)
  select p_source, r.report, r.day, coalesce(r.dim1, ''), coalesce(r.dim2, ''),
    coalesce(r.dim3, ''), coalesce(jsonb_strip_nulls(r.metrics), '{}')
  from jsonb_to_recordset(p_rows) as r (report text, day date, dim1 text, dim2 text, dim3 text, metrics jsonb)
  on conflict (source, report, day, dim1, dim2, dim3)
  do update set metrics = i.metrics || excluded.metrics, imported_at = now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.replace_insight_rows(text, text, date, date, jsonb)
  from public, anon, authenticated;
revoke execute on function public.merge_insight_rows(text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_insight_rows(text, text, date, date, jsonb) to service_role;
grant execute on function public.merge_insight_rows(text, jsonb) to service_role;

-- ─── Schedules (UTC) ──────────────────────────────────────────────────────

select cron.schedule('meta-ads', '10 * * * *', $$select public.run_job('meta-ads')$$);
select cron.schedule('social', '20 */6 * * *', $$select public.run_job('social')$$);
-- 01:30 in Beirut (summer time); an hour earlier in winter, which is fine.
select cron.schedule('google', '30 22 * * *', $$select public.run_job('google')$$);
select cron.schedule('sweep', '*/10 * * * *', $$select public.run_job('sweep')$$);
select cron.schedule('reconcile-jobs', '*/5 * * * *', $$select public.reconcile_jobs()$$);
