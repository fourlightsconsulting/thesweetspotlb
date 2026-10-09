-- First-party tracking: what visitors do on the website, recorded by our own
-- server (POST /api/e) with the secret key, never by the browser directly.
--
-- One row per event. A visitor id (one browser) and a visit id (30 minutes
-- of activity, across tabs) tie events together; the visit's campaign tags
-- and click ids are recorded as they arrive, and which visit gets credit for
-- an order is decided later by the attribution model (phase 5). Robots are
-- stamped `bot` and staff browsing `internal`, never dropped, so a wrong rule
-- stays reversible; dashboards leave both out.
--
-- Personal data: the IP address and user agent are kept for 30 days (the
-- Meta Conversions API needs them, and only for recent events), then cleared
-- by purge_event_pii(). Nothing typed in a form is ever stored here.

create table public.analytics_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  event_name text not null check (event_name ~ '^[a-z][a-z0-9_]{1,40}$'),
  visitor_id text check (char_length(visitor_id) <= 64),
  visit_id text check (char_length(visit_id) <= 64),
  locale public.locale,
  path text check (char_length(path) <= 300),
  landing_page text check (char_length(landing_page) <= 300),
  referrer text check (char_length(referrer) <= 300),
  utm_source text check (char_length(utm_source) <= 120),
  utm_medium text check (char_length(utm_medium) <= 120),
  utm_campaign text check (char_length(utm_campaign) <= 200),
  utm_term text check (char_length(utm_term) <= 200),
  utm_content text check (char_length(utm_content) <= 200),
  utm_id text check (char_length(utm_id) <= 120),
  gclid text check (char_length(gclid) <= 200),
  fbclid text check (char_length(fbclid) <= 300),
  fbp text check (char_length(fbp) <= 120),
  fbc text check (char_length(fbc) <= 500),
  -- What the event is about.
  item_id text check (char_length(item_id) <= 64),
  order_id uuid references public.orders (id) on delete set null,
  value_cents integer,
  -- Who, roughly: from the request, never from a form.
  device_type text check (device_type in ('mobile', 'tablet', 'desktop')),
  browser text check (char_length(browser) <= 40),
  os text check (char_length(os) <= 40),
  country text check (char_length(country) <= 2),
  city text check (char_length(city) <= 80),
  client_ip text check (char_length(client_ip) <= 64),
  user_agent text check (char_length(user_agent) <= 500),
  bot boolean not null default false,
  bot_reason text,
  internal boolean not null default false,
  -- The Meta Conversions API: the id the browser pixel used for the same
  -- event (so Meta counts it once), and when the server sent it.
  meta_event_id text check (char_length(meta_event_id) <= 120),
  meta_relayed_at timestamptz,
  -- Anything else the event carries (sanitised; no personal data).
  params jsonb not null default '{}' check (jsonb_typeof(params) = 'object')
);

create index analytics_events_occurred_idx on public.analytics_events (occurred_at desc);
create index analytics_events_name_idx on public.analytics_events (event_name, occurred_at desc);
create index analytics_events_visitor_idx on public.analytics_events (visitor_id, occurred_at)
  where visitor_id is not null;
create index analytics_events_order_idx on public.analytics_events (order_id)
  where order_id is not null;
create index analytics_events_meta_pending_idx on public.analytics_events (occurred_at)
  where meta_event_id is not null and meta_relayed_at is null;

alter table public.analytics_events enable row level security;

-- Managers read it (dashboards); only the website's server writes it.
create policy "Managers read events" on public.analytics_events
  for select to authenticated using ((select public.is_staff('manager')));

revoke all on public.analytics_events from anon, authenticated;
grant select on public.analytics_events to authenticated;
grant all on public.analytics_events to service_role;

/** Clears the IP address and user agent from events older than 30 days. */
create function public.purge_event_pii() returns integer
language sql security definer set search_path = '' as $$
  with cleared as (
    update public.analytics_events
    set client_ip = null, user_agent = null
    where occurred_at < now() - interval '30 days'
      and (client_ip is not null or user_agent is not null)
    returning 1
  )
  select count(*)::int from cleared;
$$;

revoke execute on function public.purge_event_pii() from public, anon, authenticated;
grant execute on function public.purge_event_pii() to service_role;

/**
 * How full the database is, for the admin's analytics switch: the free plan
 * goes read-only at 500 MB, which would stop orders saving. Managers and up.
 */
create function public.database_usage()
returns table (database_bytes bigint, events_bytes bigint, events integer)
language sql stable security definer set search_path = '' as $$
  select
    pg_database_size(current_database()),
    pg_total_relation_size('public.analytics_events'),
    (select count(*)::int from public.analytics_events)
  where (select public.is_staff('manager'));
$$;

revoke execute on function public.database_usage() from public, anon;
grant execute on function public.database_usage() to authenticated, service_role;

-- The website's tracking switches, read with the public settings.
insert into public.site_settings (key, value, is_public)
values ('tracking', '{"first_party": true}', true)
on conflict (key) do nothing;

-- Daily: clear old IP addresses and user agents (pg_cron, at 03:15 UTC).
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('purge-event-pii', '15 3 * * *', 'select public.purge_event_pii()');
