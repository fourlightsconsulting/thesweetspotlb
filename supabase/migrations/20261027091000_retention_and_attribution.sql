-- The daily purge also covers the request metadata saved with orders.
create or replace function public.purge_event_pii() returns integer
language sql security definer set search_path = '' as $$
  with cleared_events as (
    update public.analytics_events
    set client_ip = null, user_agent = null
    where occurred_at < now() - interval '30 days'
      and (client_ip is not null or user_agent is not null)
    returning 1
  ), cleared_orders as (
    update public.orders
    set client_ip = null, client_user_agent = null
    where placed_at < now() - interval '30 days'
      and (client_ip is not null or client_user_agent is not null)
    returning 1
  )
  select ((select count(*) from cleared_events) + (select count(*) from cleared_orders))::int;
$$;

revoke execute on function public.purge_event_pii() from public, anon, authenticated;
grant execute on function public.purge_event_pii() to service_role;

-- Keep the last explicit campaign/click touch ahead of later referrer-only
-- events: document.referrer survives client navigation after URL tags are gone.
create or replace function public.visit_summaries(p_since timestamptz, p_until timestamptz)
returns table (
  visit_id text, visitor_id text, started_at timestamptz, touch_at timestamptz,
  landing_page text, exit_page text, device text, locale text, country text,
  source text, medium text, campaign text, term text, content text, channel text, paid boolean,
  page_views integer, item_views integer, carts integer, checkouts integer,
  ordered boolean, events integer
)
language sql stable set search_path = '' as $$
  with ev as (
    select e.* from public.analytics_events e
    where e.visit_id is not null and not e.bot and not e.internal
      and e.occurred_at >= p_since and e.occurred_at < p_until
  ),
  touches as (
    select e.id, e.visit_id, e.occurred_at,
      nullif(trim(e.utm_source), '') as utm_source,
      nullif(trim(e.utm_medium), '') as utm_medium,
      nullif(trim(e.utm_campaign), '') as utm_campaign,
      nullif(trim(e.utm_term), '') as utm_term,
      nullif(trim(e.utm_content), '') as utm_content,
      nullif(trim(e.gclid), '') as gclid,
      nullif(trim(e.fbclid), '') as fbclid,
      nullif(trim(e.referrer), '') as referrer
    from ev e
  ),
  tagged as (
    select distinct on (e.visit_id) e.visit_id, e.occurred_at, e.utm_source, e.utm_medium,
      e.utm_campaign, e.utm_term, e.utm_content, e.gclid, e.fbclid, e.referrer
    from touches e
    where coalesce(e.utm_source, e.utm_medium, e.utm_campaign, e.gclid, e.fbclid, e.referrer) is not null
    order by e.visit_id,
      (coalesce(e.utm_source, e.utm_medium, e.utm_campaign, e.gclid, e.fbclid) is not null) desc,
      e.occurred_at desc, e.id desc
  ),
  agg as (
    select e.visit_id,
      min(e.visitor_id) as visitor_id,
      min(e.occurred_at) as started_at,
      (array_agg(e.path order by e.occurred_at) filter (where e.event_name = 'page_view'))[1] as landing_page,
      (array_agg(e.path order by e.occurred_at desc) filter (where e.event_name = 'page_view'))[1] as exit_page,
      (array_agg(e.device_type order by e.occurred_at) filter (where e.device_type is not null))[1] as device,
      (array_agg(e.locale::text order by e.occurred_at) filter (where e.locale is not null))[1] as locale,
      (array_agg(e.country order by e.occurred_at) filter (where e.country is not null))[1] as country,
      count(*) filter (where e.event_name = 'page_view')::int as page_views,
      count(*) filter (where e.event_name = 'view_item')::int as item_views,
      count(*) filter (where e.event_name = 'add_to_cart')::int as carts,
      count(*) filter (where e.event_name = 'begin_checkout')::int as checkouts,
      bool_or(e.event_name in ('order_placed', 'purchase')) as ordered,
      count(*)::int as events
    from ev e
    group by e.visit_id
  )
  select a.visit_id, a.visitor_id, a.started_at, coalesce(t.occurred_at, a.started_at),
    a.landing_page, a.exit_page, a.device, a.locale, a.country,
    coalesce(nullif(trim(t.utm_source), ''), public.referrer_name(t.referrer), 'Direct'),
    coalesce(nullif(trim(t.utm_medium), ''),
      case when t.gclid is not null then 'cpc' when t.referrer is not null then 'referral' else '(none)' end),
    nullif(trim(t.utm_campaign), ''), nullif(trim(t.utm_term), ''), nullif(trim(t.utm_content), ''),
    public.traffic_channel(t.utm_source, t.utm_medium, t.gclid, t.fbclid, public.referrer_name(t.referrer)),
    public.traffic_channel(t.utm_source, t.utm_medium, t.gclid, t.fbclid, public.referrer_name(t.referrer))
      in ('Paid social', 'Paid search', 'Other paid'),
    a.page_views, a.item_views, a.carts, a.checkouts, coalesce(a.ordered, false), a.events
  from agg a
  left join tagged t on t.visit_id = a.visit_id;
$$;

-- Existing grants stay restricted; these helpers run inside the manager dashboards.
revoke execute on function public.visit_summaries(timestamptz, timestamptz) from public, anon, authenticated;

-- Clear any request metadata already beyond the retention window now.
do $$ begin perform public.purge_event_pii(); end; $$;
