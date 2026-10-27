-- Synthetic records and every purge/update roll back; no jobs are started.
begin;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  prefix text := 'regression-' || gen_random_uuid();
  social_visit text := prefix || '-social';
  search_visit text := prefix || '-search';
  organic_visit text := prefix || '-organic';
  tagged_visit text := prefix || '-retagged';
  direct_visit text := prefix || '-direct';
  visitor text := prefix || '-visitor';
  at_time timestamptz := now() - interval '10 minutes';
  summary record;
  placed record;
  old_order uuid;
  fresh_order uuid;
  old_event bigint;
  fresh_event bigint;
  day_in_beirut date := (now() at time zone 'Asia/Beirut')::date;
  payload jsonb;
begin
  insert into public.analytics_events (visit_id, visitor_id, event_name, occurred_at, path, utm_source, utm_medium, utm_campaign, referrer)
  values
    (social_visit, visitor, 'page_view', at_time, '/en', 'instagram', 'paid_social', 'Desserts', 'https://www.instagram.com/'),
    (social_visit, visitor, 'page_view', at_time + interval '1 minute', '/en/order', null, null, null, 'https://www.instagram.com/'),
    (social_visit, visitor, 'purchase', at_time + interval '2 minutes', '/en/checkout', '', ' ', null, 'https://www.instagram.com/'),
    (organic_visit, prefix, 'page_view', at_time, '/en', null, null, null, 'https://www.google.com/'),
    (organic_visit, prefix, 'page_view', at_time + interval '1 minute', '/en/order', null, null, null, 'https://www.google.com/'),
    (tagged_visit, prefix, 'page_view', at_time, '/en', 'instagram', 'paid_social', 'Old campaign', null),
    (tagged_visit, prefix, 'page_view', at_time + interval '1 minute', '/en/order', 'facebook', 'paid_social', 'New campaign', null),
    (tagged_visit, prefix, 'page_view', at_time + interval '2 minutes', '/en/checkout', null, null, null, 'https://www.instagram.com/'),
    (direct_visit, prefix, 'page_view', at_time, '/en', null, null, null, null);
  insert into public.analytics_events (visit_id, visitor_id, event_name, occurred_at, path, gclid, referrer)
  values
    (search_visit, prefix, 'page_view', at_time, '/en', 'test-click', 'https://www.google.com/'),
    (search_visit, prefix, 'page_view', at_time + interval '1 minute', '/en/order', null, 'https://www.google.com/');
  insert into public.analytics_events (visit_id, visitor_id, event_name, occurred_at, utm_source, utm_medium, internal)
    values (social_visit, visitor, 'page_view', at_time + interval '3 minutes', 'staff', 'email', true);

  select * into summary from public.visit_summaries(at_time - interval '1 minute', now() + interval '1 minute') where visit_id = social_visit;
  assert summary.channel = 'Paid social' and summary.paid and summary.source = 'instagram' and summary.campaign = 'Desserts', 'Internal navigation must preserve paid social attribution';
  assert summary.touch_at = at_time and summary.page_views = 2 and summary.ordered, 'The actual paid touch and visit totals are preserved';
  select * into summary from public.visit_summaries(at_time - interval '1 minute', now() + interval '1 minute') where visit_id = search_visit;
  assert summary.channel = 'Paid search' and summary.paid, 'The Google click id survives internal navigation';
  select * into summary from public.visit_summaries(at_time - interval '1 minute', now() + interval '1 minute') where visit_id = organic_visit;
  assert summary.channel = 'Organic search' and not summary.paid, 'Organic traffic stays organic';
  select * into summary from public.visit_summaries(at_time - interval '1 minute', now() + interval '1 minute') where visit_id = tagged_visit;
  assert summary.source = 'facebook' and summary.campaign = 'New campaign', 'A later explicit campaign replaces the previous tagged touch';
  select * into summary from public.visit_summaries(at_time - interval '1 minute', now() + interval '1 minute') where visit_id = direct_visit;
  assert summary.channel = 'Direct' and not summary.paid, 'Direct visits stay direct';

  payload := jsonb_build_object(
    'idempotency_key', gen_random_uuid(), 'branch', 'tripoli', 'locale', 'en',
    'fulfilment', 'pickup', 'name', 'Retention regression', 'phone', '+15555550123',
    'discount_cents', 0, 'delivery_fee_cents', 0, 'quoted_total_cents', 100,
    'tracking', jsonb_build_object('visitor_id', visitor, 'ip', '192.0.2.1', 'user_agent', 'Regression test'),
    'lines', jsonb_build_array(jsonb_build_object('product', 'regression-item', 'name_en', 'Test dessert',
      'name_ar', 'تجربة', 'base_price_cents', 100, 'quantity', 1, 'options', '[]'::jsonb))
  );
  select * into placed from public.create_order(payload);
  fresh_order := placed.order_id;
  select * into summary from public.order_attribution(day_in_beirut, day_in_beirut) where order_id = fresh_order;
  assert summary.channel = 'Paid social' and summary.rule = 'ad' and summary.campaign = 'Desserts', 'Orders credit the preserved paid touch';

  payload := jsonb_set(payload, '{idempotency_key}', to_jsonb(gen_random_uuid()));
  select * into placed from public.create_order(payload);
  old_order := placed.order_id;
  update public.orders set placed_at = now() - interval '31 days' where id = old_order;
  insert into public.analytics_events (event_name, occurred_at, client_ip, user_agent)
    values ('page_view', now() - interval '31 days', '192.0.2.1', 'Regression test') returning id into old_event;
  insert into public.analytics_events (event_name, occurred_at, client_ip, user_agent)
    values ('page_view', now() - interval '1 day', '192.0.2.1', 'Regression test') returning id into fresh_event;

  perform public.purge_event_pii();
  assert (select client_ip is null and client_user_agent is null and total_cents = 100 and customer_name = 'Retention regression' from public.orders where id = old_order), 'Old order request metadata is cleared without changing the order';
  assert (select client_ip = '192.0.2.1' and client_user_agent = 'Regression test' from public.orders where id = fresh_order), 'Recent orders retain metadata for the retry window';
  assert (select client_ip is null and user_agent is null from public.analytics_events where id = old_event), 'Old event metadata is cleared';
  assert (select client_ip = '192.0.2.1' and user_agent = 'Regression test' from public.analytics_events where id = fresh_event), 'Recent event metadata is retained';
end;
$$;

rollback;
