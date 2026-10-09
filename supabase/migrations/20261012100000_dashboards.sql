-- Dashboards: where visits come from, which visit gets credit for each
-- order, and one summary function per dashboard tab (orders, website,
-- marketing). Dates are Beirut calendar days, inclusive. Robots, staff
-- browsing and staff test orders are left out everywhere.

-- Staff test orders (placed from a browser with the staff cookie) stay on
-- the board but out of the numbers.
alter table public.orders add column is_test boolean not null default false;

-- ─── Where a visit came from ──────────────────────────────────────────────

/** A referring address as a name: "Google", "Instagram", or the site's host. */
create function public.referrer_name(p_referrer text) returns text
language sql immutable set search_path = '' as $$
  select case
    when h is null or h = '' then null
    when h ~ '(^|\.)google\.' then 'Google'
    when h ~ '(^|\.)bing\.com$' then 'Bing'
    when h ~ 'duckduckgo\.com$' then 'DuckDuckGo'
    when h ~ '(^|\.)yahoo\.' then 'Yahoo'
    when h ~ 'instagram\.com$' then 'Instagram'
    when h ~ '(facebook\.com|fb\.com|fb\.me)$' then 'Facebook'
    when h ~ '^(t\.co|twitter\.com|x\.com)$' then 'X'
    when h ~ 'tiktok\.com$' then 'TikTok'
    when h ~ '(wa\.me|whatsapp\.com)$' then 'WhatsApp'
    when h ~ '(youtube\.com|youtu\.be)$' then 'YouTube'
    when h ~ 'snapchat\.com$' then 'Snapchat'
    when h ~ '(chatgpt\.com|openai\.com)$' then 'ChatGPT'
    else h
  end
  from (
    select regexp_replace(
      lower(substring(p_referrer from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:?#]+)')),
      '^(www\.|m\.|l\.|lm\.)', ''
    ) as h
  ) x;
$$;

/**
 * The channel of a visit, from its tags and referrer. Paid needs a paid
 * utm_medium (cpc, paid…) or a Google Ads click id; a bare fbclid is any
 * Facebook or Instagram link, paid or not.
 */
create function public.traffic_channel(
  p_source text, p_medium text, p_gclid text, p_fbclid text, p_referrer_name text
) returns text
language sql immutable set search_path = '' as $$
  with v as (
    select lower(coalesce(p_source, '')) as s, lower(coalesce(p_medium, '')) as m
  ), f as (
    select s, m,
      m in ('cpc', 'ppc', 'paid', 'paidsocial', 'paid_social', 'paid-social', 'display', 'cpm',
            'banner', 'retargeting', 'ads', 'ad') or p_gclid is not null as paid,
      s in ('instagram', 'ig', 'facebook', 'fb', 'meta', 'tiktok', 'snapchat', 'x', 'twitter', 'youtube')
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

/** Midnight at the start of a Beirut date. */
create function public.beirut_start(p_day date) returns timestamptz
language sql immutable set search_path = '' as $$
  select p_day::timestamp at time zone 'Asia/Beirut';
$$;

/**
 * Every visit with events in [since, until): its source (the last tagged
 * event, else direct), landing and exit pages, device, and how far it got.
 * Robots and staff are left out.
 */
create function public.visit_summaries(p_since timestamptz, p_until timestamptz)
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
  tagged as (
    select distinct on (e.visit_id) e.visit_id, e.occurred_at, e.utm_source, e.utm_medium,
      e.utm_campaign, e.utm_term, e.utm_content, e.gclid, e.fbclid, e.referrer
    from ev e
    where coalesce(e.utm_source, e.utm_medium, e.utm_campaign, e.gclid, e.fbclid, e.referrer) is not null
    order by e.visit_id, e.occurred_at desc
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

-- ─── Which visit gets credit for an order ─────────────────────────────────

/**
 * Each order placed in the period (not cancelled, not a test) and the visit
 * credited with it, from Thirty's model (migration 203): among the visits of
 * the person (their browser, and every browser that ordered with the same
 * phone number) in the 30 days before the order, the last paid ad tap wins;
 * else the last visit from anywhere but direct; else direct.
 */
create function public.order_attribution(p_from date, p_to date)
returns table (
  order_id uuid, placed_at timestamptz, total_cents integer, food_cents integer,
  channel text, source text, medium text, campaign text, term text, content text,
  rule text, visit_id text
)
language sql stable set search_path = '' as $$
  with placed as (
    select o.id, o.placed_at, o.visitor_id, o.customer_id, o.total_cents,
      o.subtotal_cents - o.discount_cents as food
    from public.orders o
    where not o.is_test and o.status <> 'cancelled'
      and o.placed_at >= public.beirut_start(p_from) and o.placed_at < public.beirut_start(p_to + 1)
  ),
  people as (
    select p.id as order_id, p.visitor_id from placed p where p.visitor_id is not null
    union
    select p.id, o.visitor_id
    from placed p join public.orders o on o.customer_id = p.customer_id
    where o.visitor_id is not null
  ),
  visits as (
    select * from public.visit_summaries(
      public.beirut_start(p_from) - interval '30 days', public.beirut_start(p_to + 1))
  ),
  ranked as (
    select pe.order_id, v.*,
      row_number() over (
        partition by pe.order_id
        order by v.paid desc, (v.channel <> 'Direct') desc, v.touch_at desc
      ) as pick
    from people pe
    join placed p on p.id = pe.order_id
    join visits v on v.visitor_id = pe.visitor_id
      and v.touch_at <= p.placed_at and v.touch_at > p.placed_at - interval '30 days'
  )
  select p.id, p.placed_at, p.total_cents, p.food,
    coalesce(r.channel, 'Direct'), coalesce(r.source, 'Direct'), coalesce(r.medium, '(none)'),
    r.campaign, r.term, r.content,
    case when r.paid then 'ad' when coalesce(r.channel, 'Direct') <> 'Direct' then 'last_non_direct' else 'direct' end,
    r.visit_id
  from placed p
  left join ranked r on r.order_id = p.id and r.pick = 1;
$$;

revoke execute on function public.visit_summaries(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.order_attribution(date, date) from public, anon, authenticated;

-- ─── Orders ───────────────────────────────────────────────────────────────

create function public.dashboard_orders(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz := public.beirut_start(p_from);
  v_until timestamptz := public.beirut_start(p_to + 1);
  v jsonb;
begin
  if not public.is_staff('manager') then
    raise exception 'dashboards: managers only' using errcode = '42501';
  end if;

  with o as (
    select * from public.orders
    where not is_test and placed_at >= v_since and placed_at < v_until
  ),
  live as (select * from o where status <> 'cancelled'),
  lines as (
    select i.*, l.status from public.order_items i join live l on l.id = i.order_id
  ),
  first_orders as (
    select customer_id, min(placed_at) as first_at
    from public.orders where not is_test and status <> 'cancelled' group by customer_id
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'placed', (select count(*) from o),
        'orders', count(*),
        'open', count(*) filter (where status not in ('completed', 'cancelled')),
        'completed', count(*) filter (where status = 'completed'),
        'cancelled', (select count(*) from o where status = 'cancelled'),
        'sales_cents', coalesce(sum(total_cents), 0),
        'food_cents', coalesce(sum(subtotal_cents - discount_cents), 0),
        'discount_cents', coalesce(sum(discount_cents), 0),
        'delivery_cents', coalesce(sum(delivery_fee_cents), 0),
        'customers', count(distinct customer_id),
        -- Customers whose first order ever falls in the period.
        'new_customers', (select count(*) from first_orders f where f.first_at >= v_since and f.first_at < v_until),
        'items', (select coalesce(sum(quantity), 0) from lines)
      ) from live l
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d::date,
        'orders', (select count(*) from live where (placed_at at time zone 'Asia/Beirut')::date = d::date),
        'sales_cents', (select coalesce(sum(total_cents), 0) from live where (placed_at at time zone 'Asia/Beirut')::date = d::date),
        'cancelled', (select count(*) from o where status = 'cancelled' and (placed_at at time zone 'Asia/Beirut')::date = d::date)
      ) order by d), '[]')
      from generate_series(p_from, p_to, interval '1 day') d
    ),
    'fulfilment', (
      select coalesce(jsonb_agg(jsonb_build_object('name', fulfilment, 'orders', n, 'sales_cents', s)), '[]')
      from (select fulfilment, count(*) n, sum(total_cents) s from live group by fulfilment) x
    ),
    'zones', (
      select coalesce(jsonb_agg(jsonb_build_object('name', zone, 'orders', n, 'sales_cents', s) order by n desc), '[]')
      from (
        select delivery_zone_name_en as zone, count(*) n, sum(total_cents) s
        from live where fulfilment = 'delivery' group by 1
      ) x
    ),
    'heatmap', (
      select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'hour', hour, 'value', n)), '[]')
      from (
        select extract(dow from placed_at at time zone 'Asia/Beirut')::int as dow,
          extract(hour from placed_at at time zone 'Asia/Beirut')::int as hour, count(*) as n
        from live group by 1, 2
      ) x
    ),
    'timings', (
      select jsonb_build_object(
        'to_start', percentile_cont(0.5) within group (order by extract(epoch from preparing_at - placed_at) / 60)
          filter (where preparing_at is not null),
        'to_ready', percentile_cont(0.5) within group (order by extract(epoch from ready_at - preparing_at) / 60)
          filter (where ready_at is not null and preparing_at is not null),
        'pickup_total', percentile_cont(0.5) within group (order by extract(epoch from completed_at - placed_at) / 60)
          filter (where completed_at is not null and fulfilment = 'pickup'),
        'delivery_total', percentile_cont(0.5) within group (order by extract(epoch from completed_at - placed_at) / 60)
          filter (where completed_at is not null and fulfilment = 'delivery'),
        'late', count(*) filter (where completed_at > placed_at + make_interval(mins => eta_max_minutes)),
        'timed', count(*) filter (where completed_at is not null)
      ) from live
    ),
    'cancel_reasons', (
      select coalesce(jsonb_agg(jsonb_build_object('name', reason, 'orders', n) order by n desc), '[]')
      from (
        select coalesce(nullif(cancel_reason, ''), 'No reason given') reason, count(*) n
        from o where status = 'cancelled' group by 1
      ) x
    ),
    'basket', (
      select coalesce(jsonb_agg(jsonb_build_object('name', size, 'orders', n) order by size), '[]')
      from (
        select least(qty, 5) size, count(*) n
        from (select order_id, sum(quantity) qty from lines group by order_id) q group by 1
      ) x
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object('id', product_slug, 'name', name, 'quantity', q, 'sales_cents', s) order by q desc), '[]')
      from (
        select product_slug, max(name_en) as name, sum(quantity) q, sum(line_total_cents) s
        from lines group by product_slug order by 3 desc limit 15
      ) x
    ),
    'options', (
      select coalesce(jsonb_agg(jsonb_build_object('name', name, 'quantity', q, 'sales_cents', s) order by q desc), '[]')
      from (
        select x.option_name_en as name, sum(l.quantity) q, sum(x.price_cents * l.quantity) s
        from public.order_item_options x join lines l on l.id = x.order_item_id
        where x.price_cents > 0 group by 1 order by 2 desc limit 12
      ) x
    ),
    'attach', (
      select jsonb_build_object(
        'lines', count(*),
        'with_add_ons', count(*) filter (where exists (
          select 1 from public.order_item_options x where x.order_item_id = lines.id and x.price_cents > 0))
      ) from lines
    ),
    'codes', (
      select coalesce(jsonb_agg(jsonb_build_object('name', discount_code, 'orders', n, 'discount_cents', d, 'sales_cents', s) order by n desc), '[]')
      from (
        select discount_code, count(*) n, sum(discount_cents) d, sum(total_cents) s
        from live where discount_code is not null group by 1
      ) x
    )
  ) into v;
  return v;
end;
$$;

-- ─── Website ──────────────────────────────────────────────────────────────

create function public.dashboard_web(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz := public.beirut_start(p_from);
  v_until timestamptz := public.beirut_start(p_to + 1);
  v jsonb;
begin
  if not public.is_staff('manager') then
    raise exception 'dashboards: managers only' using errcode = '42501';
  end if;

  with visits as (select * from public.visit_summaries(v_since, v_until)),
  first_seen as (
    select visitor_id, min(occurred_at) as first_at
    from public.analytics_events
    where visitor_id in (select visitor_id from visits) and not bot and not internal
    group by visitor_id
  ),
  ev as (
    select * from public.analytics_events
    where not bot and not internal and occurred_at >= v_since and occurred_at < v_until
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'visits', count(*),
        'visitors', count(distinct visitor_id),
        'new_visitors', (select count(*) from first_seen where first_at >= v_since),
        'engaged', count(*) filter (where page_views >= 2 or events > page_views),
        'page_views', coalesce(sum(page_views), 0),
        'item_views', count(*) filter (where item_views > 0),
        'carts', count(*) filter (where carts > 0),
        'checkouts', count(*) filter (where checkouts > 0),
        'orders', count(*) filter (where ordered)
      ) from visits
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d::date,
        'visits', (select count(*) from visits where (started_at at time zone 'Asia/Beirut')::date = d::date),
        'orders', (select count(*) from visits where ordered and (started_at at time zone 'Asia/Beirut')::date = d::date)
      ) order by d), '[]')
      from generate_series(p_from, p_to, interval '1 day') d
    ),
    'channels', (
      select coalesce(jsonb_agg(jsonb_build_object('name', channel, 'visits', n, 'orders', o) order by n desc), '[]')
      from (select channel, count(*) n, count(*) filter (where ordered) o from visits group by 1) x
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('name', name, 'visits', n, 'orders', o) order by n desc), '[]')
      from (
        select source || ' / ' || medium as name, count(*) n, count(*) filter (where ordered) o
        from visits group by 1 order by 2 desc limit 12
      ) x
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(device, 'unknown'), 'visits', n, 'orders', o) order by n desc), '[]')
      from (select device, count(*) n, count(*) filter (where ordered) o from visits group by 1) x
    ),
    'languages', (
      select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(locale, 'unknown'), 'visits', n, 'orders', o) order by n desc), '[]')
      from (select locale, count(*) n, count(*) filter (where ordered) o from visits group by 1) x
    ),
    'returning', (
      select coalesce(jsonb_agg(jsonb_build_object('name', kind, 'visits', n, 'orders', o)), '[]')
      from (
        select case when f.first_at >= v.started_at - interval '1 minute' then 'New' else 'Returning' end kind,
          count(*) n, count(*) filter (where v.ordered) o
        from visits v left join first_seen f on f.visitor_id = v.visitor_id group by 1
      ) x
    ),
    'landing_pages', (
      select coalesce(jsonb_agg(jsonb_build_object('name', landing_page, 'visits', n, 'orders', o) order by n desc), '[]')
      from (
        select landing_page, count(*) n, count(*) filter (where ordered) o
        from visits where landing_page is not null group by 1 order by 2 desc limit 10
      ) x
    ),
    'exit_pages', (
      select coalesce(jsonb_agg(jsonb_build_object('name', exit_page, 'visits', n) order by n desc), '[]')
      from (
        select exit_page, count(*) n from visits
        where exit_page is not null and not ordered group by 1 order by 2 desc limit 10
      ) x
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object('id', item_id, 'views', views, 'adds', adds) order by views desc), '[]')
      from (
        select item_id, count(*) filter (where event_name = 'view_item') views,
          count(*) filter (where event_name = 'add_to_cart') adds
        from ev where item_id is not null group by 1 order by 2 desc limit 15
      ) x
    ),
    'heatmap', (
      select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'hour', hour, 'value', n)), '[]')
      from (
        select extract(dow from started_at at time zone 'Asia/Beirut')::int as dow,
          extract(hour from started_at at time zone 'Asia/Beirut')::int as hour, count(*) as n
        from visits group by 1, 2
      ) x
    ),
    'abandoned', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'visit', visit_id, 'at', started_at, 'step', step, 'channel', channel, 'device', device,
        'value_cents', (
          select max(e.value_cents) from ev e
          where e.visit_id = a.visit_id and e.event_name in ('begin_checkout', 'view_cart', 'add_to_cart')
        )
      ) order by started_at desc), '[]')
      from (
        select *, case when checkouts > 0 then 'checkout' else 'cart' end as step
        from visits where carts > 0 and not ordered order by started_at desc limit 25
      ) a
    ),
    'popup', (
      select jsonb_build_object(
        'viewed', count(*) filter (where event_name = 'popup_viewed'),
        'clicked', count(*) filter (where event_name = 'popup_cta'),
        'copied', count(*) filter (where event_name = 'popup_code_copied'),
        'dismissed', count(*) filter (where event_name = 'popup_dismissed')
      ) from ev
    ),
    'problems', (
      select jsonb_build_object(
        'errors', count(*) filter (where event_name = 'client_error'),
        'not_found', count(*) filter (where event_name = 'not_found'),
        'failed_orders', count(*) filter (where event_name = 'place_order_failed')
      ) from ev
    ),
    'ga4', jsonb_build_object(
      'countries', (
        select coalesce(jsonb_agg(jsonb_build_object('name', dim1, 'visits', n) order by n desc), '[]')
        from (
          select dim1, sum((metrics ->> 'sessions')::numeric) n from public.insight_rows
          where source = 'ga4' and report = 'geo' and day between p_from and p_to
          group by 1 order by 2 desc nulls last limit 8
        ) x
      ),
      'cities', (
        select coalesce(jsonb_agg(jsonb_build_object('name', dim2 || ', ' || dim1, 'visits', n) order by n desc), '[]')
        from (
          select dim1, dim2, sum((metrics ->> 'sessions')::numeric) n from public.insight_rows
          where source = 'ga4' and report = 'geo' and day between p_from and p_to
          group by 1, 2 order by 3 desc nulls last limit 8
        ) x
      ),
      'audience', (
        select coalesce(jsonb_agg(jsonb_build_object('name', dim1 || ' · ' || dim2, 'users', (metrics ->> 'users')::numeric)), '[]')
        from public.insight_rows
        where source = 'ga4' and report = 'audience'
          and day = (select max(day) from public.insight_rows where source = 'ga4' and report = 'audience' and day <= p_to)
      ),
      'engagement_seconds', (
        select sum((metrics ->> 'engagement_seconds')::numeric) / nullif(sum((metrics ->> 'users')::numeric), 0)
        from public.insight_rows
        where source = 'ga4' and report = 'overview' and day between p_from and p_to
      ),
      'sessions', (
        select sum((metrics ->> 'sessions')::numeric) from public.insight_rows
        where source = 'ga4' and report = 'overview' and day between p_from and p_to
      )
    )
  ) into v;
  return v;
end;
$$;

-- ─── Marketing ────────────────────────────────────────────────────────────

create function public.dashboard_marketing(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz := public.beirut_start(p_from);
  v_until timestamptz := public.beirut_start(p_to + 1);
  v jsonb;
begin
  if not public.is_staff('manager') then
    raise exception 'dashboards: managers only' using errcode = '42501';
  end if;

  with ads as (select * from public.ad_performance where day between p_from and p_to),
  credit as (select * from public.order_attribution(p_from, p_to)),
  visits as (select * from public.visit_summaries(v_since, v_until)),
  completed as (
    select id from public.orders
    where not is_test and status = 'completed' and placed_at >= v_since and placed_at < v_until
  ),
  -- Ad names as they arrive in links (utm_campaign = the campaign's name).
  credit_by_campaign as (
    select lower(campaign) as campaign, lower(content) as content,
      count(*) n, sum(total_cents) s, sum(food_cents) f
    from credit where rule = 'ad' group by 1, 2
  )
  select jsonb_build_object(
    'spend', (
      select jsonb_build_object(
        'total_cents', coalesce(sum(spend_cents), 0),
        'meta_cents', coalesce(sum(spend_cents) filter (where platform = 'meta'), 0),
        'google_cents', coalesce(sum(spend_cents) filter (where platform = 'google'), 0),
        'manual_cents', coalesce(sum(spend_cents) filter (where platform = 'manual'), 0)
      ) from ads
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d::date,
        'spend_cents', (select coalesce(sum(spend_cents), 0) from ads where day = d::date),
        'ad_orders', (select count(*) from credit where rule = 'ad' and (placed_at at time zone 'Asia/Beirut')::date = d::date),
        'ad_sales_cents', (select coalesce(sum(total_cents), 0) from credit where rule = 'ad' and (placed_at at time zone 'Asia/Beirut')::date = d::date)
      ) order by d), '[]')
      from generate_series(p_from, p_to, interval '1 day') d
    ),
    'credit', (
      select jsonb_build_object(
        'orders', count(*),
        'sales_cents', coalesce(sum(total_cents), 0),
        'ad_orders', count(*) filter (where rule = 'ad'),
        'ad_sales_cents', coalesce(sum(total_cents) filter (where rule = 'ad'), 0),
        'ad_food_cents', coalesce(sum(food_cents) filter (where rule = 'ad'), 0)
      ) from credit
    ),
    'channels', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', c.channel, 'visits', coalesce(vv.n, 0), 'orders', c.n, 'sales_cents', c.s) order by c.s desc), '[]')
      from (select channel, count(*) n, sum(total_cents) s from credit group by 1) c
      left join (select channel, count(*) n from visits group by 1) vv on vv.channel = c.channel
    ),
    'campaigns_credit', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', coalesce(campaign, '(no campaign)'), 'source', source, 'orders', n, 'sales_cents', s) order by s desc), '[]')
      from (
        select campaign, min(source) source, count(*) n, sum(total_cents) s
        from credit where rule <> 'direct' group by 1 order by 4 desc limit 15
      ) x
    ),
    'meta', (
      select jsonb_build_object(
        'impressions', coalesce(sum(impressions), 0),
        'clicks', coalesce(sum(clicks), 0),
        'link_clicks', coalesce(sum(link_clicks), 0),
        'landing_page_views', coalesce(sum(landing_page_views), 0),
        'add_to_cart', coalesce(sum(add_to_cart), 0),
        'initiate_checkout', coalesce(sum(initiate_checkout), 0),
        'purchases', coalesce(sum(purchases), 0),
        'purchase_value_cents', coalesce(sum(purchase_value_cents), 0),
        'messaging_started', coalesce(sum(messaging_started), 0),
        'profile_visits', coalesce(sum(profile_visits), 0),
        'video_views', coalesce(sum(video_views), 0)
      ) from ads where platform = 'meta'
    ),
    'funnel', jsonb_build_object(
      'paid_visits', (select count(*) from visits where paid),
      'paid_carts', (select count(*) from visits where paid and carts > 0),
      'paid_checkouts', (select count(*) from visits where paid and checkouts > 0),
      'ad_orders', (select count(*) from credit where rule = 'ad'),
      'ad_completed', (select count(*) from credit c where rule = 'ad' and c.order_id in (select id from completed))
    ),
    'campaigns', (
      select coalesce(jsonb_agg(c order by (c ->> 'spend_cents')::int desc), '[]')
      from (
        select jsonb_build_object(
          'id', a.campaign_id, 'name', a.campaign_name, 'platform', a.platform,
          'spend_cents', sum(a.spend_cents), 'impressions', sum(a.impressions),
          'link_clicks', sum(coalesce(a.link_clicks, a.clicks)), 'meta_purchases', sum(a.purchases),
          'messaging_started', sum(a.messaging_started),
          'orders', coalesce((select sum(n) from credit_by_campaign cc where cc.campaign = lower(a.campaign_name)), 0),
          'sales_cents', coalesce((select sum(s) from credit_by_campaign cc where cc.campaign = lower(a.campaign_name)), 0),
          'ads', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'id', ad_id, 'name', ad_name, 'adset', adset_name, 'spend_cents', sp,
              'impressions', im, 'link_clicks', lc, 'meta_purchases', pu,
              'orders', coalesce((select sum(n) from credit_by_campaign cc
                where cc.campaign = lower(a.campaign_name) and cc.content = lower(x.ad_name)), 0)
            ) order by sp desc), '[]')
            from (
              select ad_id, max(ad_name) ad_name, max(adset_name) adset_name, sum(spend_cents) sp,
                sum(impressions) im, sum(coalesce(link_clicks, clicks)) lc, sum(purchases) pu
              from ads b where b.platform = a.platform and b.campaign_id = a.campaign_id and b.ad_id <> ''
              group by ad_id
            ) x
          )
        ) as c
        from ads a where a.platform in ('meta', 'google')
        group by a.platform, a.campaign_id, a.campaign_name
      ) z
    ),
    'placements', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', publisher || ' · ' || replace(placement, '_', ' '), 'spend_cents', s,
        'impressions', i, 'link_clicks', l, 'meta_purchases', p) order by s desc), '[]')
      from (
        select publisher, placement, sum(spend_cents) s, sum(impressions) i,
          sum(coalesce(link_clicks, clicks)) l, sum(purchases) p
        from ads where platform = 'meta' group by 1, 2
      ) x
    ),
    'manual', (
      select coalesce(jsonb_agg(jsonb_build_object('name', campaign_name, 'spend_cents', s) order by s desc), '[]')
      from (select campaign_name, sum(spend_cents) s from ads where platform = 'manual' group by 1) x
    ),
    'codes', (
      select coalesce(jsonb_agg(jsonb_build_object('name', discount_code, 'orders', n, 'discount_cents', d, 'sales_cents', s) order by n desc), '[]')
      from (
        select discount_code, count(*) n, sum(discount_cents) d, sum(total_cents) s
        from public.orders
        where not is_test and status <> 'cancelled' and discount_code is not null
          and placed_at >= v_since and placed_at < v_until
        group by 1
      ) x
    ),
    'social', (
      select coalesce(jsonb_object_agg(source, s), '{}')
      from (
        select source, jsonb_build_object(
          'followers', (
            select (r.metrics ->> 'followers')::numeric from public.insight_rows r
            where r.source = i.source and r.metrics ? 'followers' and r.day <= p_to
            order by r.day desc limit 1
          ),
          'new_followers', sum((metrics ->> 'new_followers')::numeric),
          'reach', sum((metrics ->> 'reach')::numeric),
          'views', sum((metrics ->> 'views')::numeric),
          'interactions', sum((metrics ->> 'interactions')::numeric),
          'profile_views', sum(coalesce((metrics ->> 'profile_views')::numeric, (metrics ->> 'page_views')::numeric)),
          'website_clicks', sum((metrics ->> 'website_clicks')::numeric),
          'daily', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'day', d.day, 'reach', (d.metrics ->> 'reach')::numeric,
              'new_followers', (d.metrics ->> 'new_followers')::numeric,
              'interactions', (d.metrics ->> 'interactions')::numeric) order by d.day), '[]')
            from public.insight_rows d where d.source = i.source and d.day between p_from and p_to
          )
        ) s
        from public.insight_rows i
        where source in ('instagram', 'facebook') and day between p_from and p_to
        group by source
      ) x
    ),
    'search', (
      select jsonb_build_object(
        'clicks', coalesce(sum((metrics ->> 'clicks')::numeric), 0),
        'impressions', coalesce(sum((metrics ->> 'impressions')::numeric), 0),
        'position', sum((metrics ->> 'position_sum')::numeric) / nullif(sum((metrics ->> 'impressions')::numeric), 0),
        'queries', (
          select coalesce(jsonb_agg(jsonb_build_object('name', dim1, 'clicks', c, 'impressions', i,
            'position', round((ps / nullif(i, 0))::numeric, 1)) order by c desc, i desc), '[]')
          from (
            select dim1, sum((metrics ->> 'clicks')::numeric) c, sum((metrics ->> 'impressions')::numeric) i,
              sum((metrics ->> 'position_sum')::numeric) ps
            from public.insight_rows where source = 'gsc' and report = 'query' and day between p_from and p_to
            group by 1 order by 2 desc, 3 desc limit 15
          ) x
        ),
        'pages', (
          select coalesce(jsonb_agg(jsonb_build_object('name', dim1, 'clicks', c, 'impressions', i) order by c desc), '[]')
          from (
            select dim1, sum((metrics ->> 'clicks')::numeric) c, sum((metrics ->> 'impressions')::numeric) i
            from public.insight_rows where source = 'gsc' and report = 'page' and day between p_from and p_to
            group by 1 order by 2 desc limit 10
          ) x
        )
      )
      from public.insight_rows where source = 'gsc' and report = 'total' and day between p_from and p_to
    )
  ) into v;
  return v;
end;
$$;

revoke execute on function public.dashboard_orders(date, date) from public, anon;
revoke execute on function public.dashboard_web(date, date) from public, anon;
revoke execute on function public.dashboard_marketing(date, date) from public, anon;
grant execute on function public.dashboard_orders(date, date) to authenticated;
grant execute on function public.dashboard_web(date, date) to authenticated;
grant execute on function public.dashboard_marketing(date, date) to authenticated;

-- The order page shows which visit got credit for an order (managers).
create function public.order_source(p_order uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(a) - 'order_id' - 'total_cents' - 'food_cents'
  from public.orders o
  cross join lateral public.order_attribution(
    (o.placed_at at time zone 'Asia/Beirut')::date, (o.placed_at at time zone 'Asia/Beirut')::date) a
  where o.id = p_order and a.order_id = p_order and (select public.is_staff('manager'));
$$;

revoke execute on function public.order_source(uuid) from public, anon;
grant execute on function public.order_source(uuid) to authenticated;
