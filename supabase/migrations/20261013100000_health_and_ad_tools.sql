-- Phase 6: the Health page and the ad tools.
--
-- Health reads what's already recorded (orders, the WhatsApp outbox, website
-- events, job runs and pg_cron's own log) and adds no tables. The ad tools
-- add two: tracking links (tagged links for posts, bios and printed QR codes,
-- each with a short /l/<id> address) and the registry of ad creatives and
-- audiences that the ad naming scheme refers to.

-- ─── Channels ─────────────────────────────────────────────────────────────
-- Meta fills {{site_source_name}} with fb, ig, msg (Messenger) or an
-- (Audience Network): all Meta's, so all social.
create or replace function public.traffic_channel(
  p_source text, p_medium text, p_gclid text, p_fbclid text, p_referrer_name text
) returns text
language sql immutable set search_path = '' as $$
  with v as (
    select lower(coalesce(p_source, '')) as s, lower(coalesce(p_medium, '')) as m
  ), f as (
    select s, m,
      m in ('cpc', 'ppc', 'paid', 'paidsocial', 'paid_social', 'paid-social', 'display', 'cpm',
            'banner', 'retargeting', 'ads', 'ad') or p_gclid is not null as paid,
      s in ('instagram', 'ig', 'facebook', 'fb', 'meta', 'msg', 'an', 'threads', 'tiktok',
            'snapchat', 'x', 'twitter', 'youtube')
        or p_referrer_name in ('Instagram', 'Facebook', 'TikTok', 'X', 'Snapchat', 'YouTube')
        or p_fbclid is not null as social,
      s in ('google', 'bing', 'duckduckgo', 'yahoo')
        or p_referrer_name in ('Google', 'Bing', 'DuckDuckGo', 'Yahoo')
        or p_gclid is not null as search
    from v
  )
  select case
    when paid and social and p_gclid is null then 'Paid social'
    when paid and search then 'Paid search'
    when paid then 'Other paid'
    when m in ('qr', 'print', 'flyer', 'offline') then 'QR & print'
    when m in ('email', 'sms', 'whatsapp') or s = 'whatsapp' or p_referrer_name = 'WhatsApp' then 'Messaging'
    when social or m = 'social' then 'Organic social'
    when search or m = 'organic' then 'Organic search'
    when p_referrer_name is not null or s <> '' then 'Referral'
    else 'Direct'
  end
  from f;
$$;

-- ─── Tracking links ───────────────────────────────────────────────────────
-- Built in the admin's ad tools. utm_id is the link's own tag and its short
-- address (thesweetspotlb.com/l/<utm_id>), which is what QR codes carry: a
-- short code scans better, and a printed code keeps working.

create table public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  utm_id text not null unique check (utm_id ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  label text not null default '' check (char_length(label) <= 120),
  -- The page without tags, and the tagged address visitors land on.
  destination text not null check (destination ~ '^https?://' and char_length(destination) <= 500),
  url text not null check (url ~ '^https?://' and char_length(url) <= 1000),
  utm_source text not null check (utm_source ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  utm_medium text not null check (utm_medium ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  utm_campaign text not null check (utm_campaign ~ '^[a-z0-9][a-z0-9_-]{0,99}$'),
  utm_content text not null default '' check (utm_content ~ '^[a-z0-9_-]{0,100}$'),
  utm_term text not null default '' check (utm_term ~ '^[a-z0-9_-]{0,100}$'),
  archived boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.tracking_links enable row level security;
create policy "Managers read links" on public.tracking_links
  for select to authenticated using ((select public.is_staff('manager')));
create policy "Managers add links" on public.tracking_links
  for insert to authenticated with check ((select public.is_staff('manager')));
create policy "Managers change links" on public.tracking_links
  for update to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));
revoke all on public.tracking_links from anon, authenticated;
grant select, insert, update on public.tracking_links to authenticated;
-- The website reads a link by its id to send /l/<id> on (secret key).
grant all on public.tracking_links to service_role;

-- ─── Ad registry ──────────────────────────────────────────────────────────
-- The creatives and audiences that ad names refer to, so a name like
-- prospect_website_purchase_rt001_v1 or 261001-01-product-lotus-crepe can be
-- looked up, and the builders hand out the next free number.

create table public.ad_registry (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('creative', 'audience')),
  -- 261001-01-product-lotus-crepe, or rt001.
  code text not null check (code ~ '^[a-z0-9][a-z0-9-]{1,99}$'),
  -- An audience's full name (fb_rt001_site-visitors_30d); a creative's label.
  name text not null default '' check (char_length(name) <= 200),
  -- The parts the code was built from.
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  note text not null default '' check (char_length(note) <= 500),
  archived boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kind, code)
);

alter table public.ad_registry enable row level security;
create policy "Managers read the ad registry" on public.ad_registry
  for select to authenticated using ((select public.is_staff('manager')));
create policy "Managers add to the ad registry" on public.ad_registry
  for insert to authenticated with check ((select public.is_staff('manager')));
create policy "Managers change the ad registry" on public.ad_registry
  for update to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));
revoke all on public.ad_registry from anon, authenticated;
grant select, insert, update on public.ad_registry to authenticated;
grant all on public.ad_registry to service_role;

-- Visits by link, and the Health page's visit trail.
create index analytics_events_utm_id_idx on public.analytics_events (utm_id, visit_id)
  where utm_id is not null;
create index analytics_events_visit_idx on public.analytics_events (visit_id, occurred_at)
  where visit_id is not null;

/**
 * What each tracking link brought: visits that arrived with its utm_id, and
 * the orders credited to those visits (order_attribution's rules, so the
 * numbers agree with the dashboards). Robots and staff are left out.
 */
create function public.tracking_link_results()
returns table (utm_id text, visits integer, orders integer, sales_cents integer, last_visit timestamptz)
language sql stable security definer set search_path = '' as $$
  with since as (
    select (min(l.created_at) at time zone 'Asia/Beirut')::date as day from public.tracking_links l
  ),
  tagged as (
    select e.utm_id, e.visit_id, min(e.occurred_at) as at
    from public.analytics_events e
    join public.tracking_links l on l.utm_id = e.utm_id
    where not e.bot and not e.internal and e.visit_id is not null
    group by e.utm_id, e.visit_id
  ),
  credited as (
    select a.order_id, a.total_cents, a.visit_id
    from since s
    cross join lateral public.order_attribution(s.day, (now() at time zone 'Asia/Beirut')::date) a
    where s.day is not null and a.visit_id is not null
  )
  select t.utm_id, count(distinct t.visit_id)::int, count(distinct c.order_id)::int,
    coalesce(sum(c.total_cents), 0)::int, max(t.at)
  from tagged t
  left join credited c on c.visit_id = t.visit_id
  where (select public.is_staff('manager'))
  group by t.utm_id;
$$;

revoke execute on function public.tracking_link_results() from public, anon;
grant execute on function public.tracking_link_results() to authenticated;

-- ─── Health ───────────────────────────────────────────────────────────────

/**
 * Why a problem event needs nothing from anyone: a robot, staff testing, or
 * another company's script (Meta's pixel, Google's tag) failing on our page.
 */
create function public.health_handled(p_event text, p_params jsonb, p_bot boolean, p_internal boolean)
returns text
language sql immutable set search_path = '' as $$
  select case
    when p_bot then 'robot'
    when p_internal then 'staff'
    when p_event = 'client_error' and coalesce(p_params ->> 'source', '') ~*
      '(facebook\.(net|com)|googletagmanager|google-analytics|doubleclick|gstatic|googleapis)'
      then 'other_script'
  end;
$$;

/**
 * Which Health group a problem event belongs to: attention (a shopper hit
 * something broken), friction (not a bug, but worth a look: a refused code, a
 * missing page, trying to order while closed) or handled. Null for events
 * that aren't problems.
 */
create function public.health_bucket(p_event text, p_params jsonb, p_bot boolean, p_internal boolean)
returns text
language sql immutable set search_path = '' as $$
  select case
    when p_event not in ('client_error', 'not_found', 'place_order_failed', 'promo_rejected') then null
    when public.health_handled(p_event, p_params, p_bot, p_internal) is not null then 'handled'
    when p_event = 'client_error' then 'attention'
    when p_event = 'place_order_failed'
      and coalesce(p_params ->> 'reason', '') in ('failed', 'unavailable', 'network', '') then 'attention'
    else 'friction'
  end;
$$;

/**
 * The few numbers behind "Needs attention" (the admin home, the Health page
 * and the badge on its menu link). Managers only; null for anyone else.
 */
create function public.health_attention() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'waiting', (
      select count(*) from public.orders
      where status = 'received' and placed_at < now() - interval '10 minutes'
    ),
    'alerts_failed', (
      select count(*) from public.notifications
      where status = 'failed' and created_at >= now() - interval '48 hours'
    ),
    'alerts_stuck', (
      select count(*) from public.notifications
      where status in ('queued', 'sending')
        and created_at < now() - interval '15 minutes' and created_at >= now() - interval '48 hours'
    ),
    'errors', (
      select count(*) from public.analytics_events e
      where e.event_name in ('client_error', 'place_order_failed')
        and e.occurred_at >= now() - interval '24 hours'
        and public.health_bucket(e.event_name, e.params, e.bot, e.internal) = 'attention'
    ),
    'jobs_failed', (
      select coalesce(jsonb_agg(j.job order by j.job), '[]')
      from (
        select distinct on (r.job) r.job, r.outcome
        from public.job_runs r
        where r.queued_at >= now() - interval '7 days' and r.outcome <> 'pending'
        order by r.job, r.queued_at desc
      ) j
      where j.outcome in ('failed', 'unknown')
    ),
    'cron_failed', (
      select coalesce(jsonb_agg(c.jobname order by c.jobname), '[]')
      from (
        select distinct on (d.jobid) j.jobname, d.status
        from cron.job_run_details d
        join cron.job j on j.jobid = d.jobid
        where d.start_time >= now() - interval '2 days'
        order by d.jobid, d.start_time desc
      ) c
      where c.status = 'failed'
    ),
    'relay_orders', (
      select count(*) from public.orders
      where not is_test and meta_relayed_at is null
        and placed_at < now() - interval '1 hour' and placed_at >= now() - interval '7 days'
    ),
    'database_bytes', pg_database_size(current_database())
  )
  where (select public.is_staff('manager'));
$$;

/** Everything the Health page's overview shows. Managers only. */
create function public.health_overview() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'orders', (
      select jsonb_build_object(
        'today', count(*) filter (where not is_test
          and placed_at >= public.beirut_start((now() at time zone 'Asia/Beirut')::date)),
        'tests_today', count(*) filter (where is_test
          and placed_at >= public.beirut_start((now() at time zone 'Asia/Beirut')::date)),
        'waiting', count(*) filter (where status = 'received' and placed_at < now() - interval '10 minutes'),
        'oldest_waiting', min(placed_at) filter (where status = 'received'),
        'last_order', max(placed_at) filter (where not is_test)
      )
      from public.orders
      where placed_at >= now() - interval '30 days' or status = 'received'
    ),
    'alerts', (
      select jsonb_build_object(
        'sent', count(*) filter (where status = 'sent'),
        'failed', count(*) filter (where status = 'failed'),
        'waiting', count(*) filter (where status in ('queued', 'sending')),
        'last_sent', max(sent_at),
        'last_error', (
          select jsonb_build_object('at', n.created_at, 'error', n.last_error)
          from public.notifications n
          where n.status = 'failed'
          order by n.created_at desc limit 1
        )
      )
      from public.notifications
      where created_at >= now() - interval '7 days'
    ),
    'alert_settings', (select s.value from public.site_settings s where s.key = 'order_alerts'),
    'events', (
      select jsonb_build_object(
        'last_hour', count(*) filter (where occurred_at >= now() - interval '1 hour' and not bot and not internal),
        'week', count(*) filter (where not bot and not internal),
        'robots', count(*) filter (where bot and occurred_at >= now() - interval '24 hours'),
        'staff', count(*) filter (where internal and occurred_at >= now() - interval '24 hours'),
        'last_at', max(occurred_at) filter (where not bot and not internal),
        'last_any', max(occurred_at)
      )
      from public.analytics_events
      where occurred_at >= now() - interval '7 days'
    ),
    'relay', jsonb_build_object(
      'orders', (
        select count(*) from public.orders
        where not is_test and meta_relayed_at is null
          and placed_at < now() - interval '15 minutes' and placed_at >= now() - interval '7 days'
      ),
      'events', (
        select count(*) from public.analytics_events
        where meta_event_id is not null and meta_relayed_at is null and not bot and not internal
          and event_name <> 'purchase'
          and occurred_at < now() - interval '15 minutes' and occurred_at >= now() - interval '7 days'
      ),
      'last_sent', greatest(
        (select max(meta_relayed_at) from public.orders where not is_test),
        (select max(meta_relayed_at) from public.analytics_events where not internal)
      )
    ),
    'imports', jsonb_build_object(
      'meta', (select jsonb_build_object('day', max(day), 'at', max(imported_at))
        from public.ad_performance where platform = 'meta'),
      'google_ads', (select jsonb_build_object('day', max(day), 'at', max(imported_at))
        from public.ad_performance where platform = 'google'),
      'ga4', (select jsonb_build_object('day', max(day), 'at', max(imported_at))
        from public.insight_rows where source = 'ga4'),
      'gsc', (select jsonb_build_object('day', max(day), 'at', max(imported_at))
        from public.insight_rows where source = 'gsc'),
      'instagram', (select jsonb_build_object('day', max(day), 'at', max(imported_at))
        from public.insight_rows where source = 'instagram'),
      'facebook', (select jsonb_build_object('day', max(day), 'at', max(imported_at))
        from public.insight_rows where source = 'facebook')
    ),
    'jobs', (
      select coalesce(jsonb_agg(to_jsonb(j) order by j.job), '[]')
      from (
        select r.job,
          (array_agg(r.outcome order by r.queued_at desc))[1] as outcome,
          max(r.queued_at) as last_run,
          max(r.queued_at) filter (where r.outcome = 'ok') as last_ok,
          count(*) filter (where r.outcome in ('failed', 'unknown')
            and r.queued_at >= now() - interval '24 hours')::int as failed_24h,
          (array_agg(coalesce(r.error, r.response ->> 'error') order by r.queued_at desc)
            filter (where r.outcome in ('failed', 'unknown')))[1] as last_error
        from public.job_runs r
        where r.queued_at >= now() - interval '30 days'
        group by r.job
      ) j
    ),
    'cron', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.name), '[]')
      from (
        select j.jobname as name, j.schedule, j.active,
          max(d.start_time) as last_run,
          (array_agg(d.status order by d.start_time desc))[1] as status,
          (array_agg(d.return_message order by d.start_time desc)
            filter (where d.status = 'failed'))[1] as last_error,
          count(d.runid) filter (where d.status = 'failed'
            and d.start_time >= now() - interval '24 hours')::int as failed_24h
        from cron.job j
        left join cron.job_run_details d
          on d.jobid = j.jobid and d.start_time >= now() - interval '2 days'
        group by j.jobid, j.jobname, j.schedule, j.active
      ) c
    ),
    'database', jsonb_build_object(
      'bytes', pg_database_size(current_database()),
      'events_bytes', pg_total_relation_size('public.analytics_events')
    )
  )
  where (select public.is_staff('manager'));
$$;

/**
 * Problems recorded by the website in [p_from, p_to): groups of the same
 * problem with how often and on how many visits, and the latest visits that
 * hit one. Managers only.
 */
create function public.health_problems(p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security definer set search_path = '' as $$
  with e as (
    select e.occurred_at, e.event_name, e.visit_id, e.path, e.params,
      e.device_type, e.browser, e.os,
      public.health_bucket(e.event_name, e.params, e.bot, e.internal) as bucket,
      coalesce(public.health_handled(e.event_name, e.params, e.bot, e.internal), '') as handled,
      left(case e.event_name
        when 'client_error' then coalesce(e.params ->> 'message', '')
        when 'not_found' then coalesce(e.params ->> 'requested', e.path, '')
        else coalesce(e.params ->> 'reason', '')
      end, 200) as detail
    from public.analytics_events e
    where e.occurred_at >= p_from and e.occurred_at < p_to
      and e.event_name in ('client_error', 'not_found', 'place_order_failed', 'promo_rejected')
  ),
  g as (
    select bucket, event_name as event, detail, handled,
      count(*)::int as times,
      count(distinct visit_id)::int as visits,
      max(occurred_at) as last_seen,
      (array_agg(visit_id order by occurred_at desc) filter (where visit_id is not null))[1] as latest_visit,
      (array_agg(distinct path) filter (where path is not null))[1:3] as pages,
      (array_agg(distinct upper(params ->> 'code')) filter (where params ? 'code'))[1:5] as codes,
      (array_agg(distinct params ->> 'source') filter (where params ? 'source'))[1:2] as sources,
      (array_agg(distinct browser) filter (where browser is not null))[1:3] as browsers
    from e
    group by bucket, event_name, detail, handled
    order by array_position(array['attention', 'friction', 'handled'], bucket), count(*) desc
    limit 150
  ),
  v as (
    select visit_id, min(occurred_at) as first_at, max(occurred_at) as last_at,
      count(*)::int as problems, bool_or(bucket = 'attention') as attention,
      min(device_type) as device, min(browser) as browser, min(os) as os
    from e
    where bucket in ('attention', 'friction') and visit_id is not null
    group by visit_id
    order by max(occurred_at) desc
    limit 30
  )
  select jsonb_build_object(
    'counts', (
      select jsonb_build_object(
        'attention', count(*) filter (where bucket = 'attention'),
        'friction', count(*) filter (where bucket = 'friction'),
        'handled', count(*) filter (where bucket = 'handled'))
      from e
    ),
    'groups', (
      select coalesce(jsonb_agg(to_jsonb(g)
        order by array_position(array['attention', 'friction', 'handled'], g.bucket), g.times desc), '[]')
      from g
    ),
    'visits', (select coalesce(jsonb_agg(to_jsonb(v) order by v.last_at desc), '[]') from v)
  )
  where (select public.is_staff('manager'));
$$;

revoke execute on function public.health_attention() from public, anon;
revoke execute on function public.health_overview() from public, anon;
revoke execute on function public.health_problems(timestamptz, timestamptz) from public, anon;
grant execute on function public.health_attention() to authenticated;
grant execute on function public.health_overview() to authenticated;
grant execute on function public.health_problems(timestamptz, timestamptz) to authenticated;

-- ─── Housekeeping ─────────────────────────────────────────────────────────
-- pg_cron logs every run (about 450 a day here) and job_runs grows by ~170
-- a day; neither is worth keeping for long on the free plan's 500 MB.
create function public.housekeeping() returns void
language sql security definer set search_path = '' as $$
  delete from cron.job_run_details where end_time < now() - interval '14 days';
  delete from public.job_runs where queued_at < now() - interval '60 days';
$$;

revoke execute on function public.housekeeping() from public, anon, authenticated;

select cron.schedule('housekeeping', '45 3 * * *', $$select public.housekeeping()$$);
