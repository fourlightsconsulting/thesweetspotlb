-- Running the shop from the admin: order alerts move to a private setting,
-- and two read-only summaries for the Customers and Offers pages.

-- ─── Order alerts ─────────────────────────────────────────────────────────
-- Branch rows are public (the website shows hours and phone numbers), so the
-- numbers that get new-order alerts move to a staff-only setting:
-- order_alerts = { enabled, phones: ["+961…"] }.

insert into public.site_settings (key, value, is_public)
select 'order_alerts',
  jsonb_build_object(
    'enabled', true,
    'phones', coalesce(jsonb_agg(distinct b.alert_phone) filter (where b.alert_phone is not null), '[]')
  ),
  false
from public.branches b
on conflict (key) do nothing;

alter table public.branches drop column alert_phone;

/**
 * Saves an order exactly as the website priced it, in one transaction.
 *
 * The website's server calls this with the secret key once it has checked
 * the order (opening hours, items and choices, the code with
 * check_discount_code). Nothing here re-prices or refuses the order: staff
 * check every order before starting it, so if the website and the database
 * ever disagree, the order still arrives and staff talk it through with the
 * customer. Products, options, the delivery area and the code are linked
 * when they exist here; names and prices are always the snapshot the
 * customer saw, and quoted_total_cents is the total they were shown. Each
 * number in the order_alerts setting gets a WhatsApp alert queued.
 *
 * payload: { idempotency_key, branch, locale, fulfilment, name, phone,
 *   zone?: { slug, name_en, name_ar }, street?, floor?, delivery_note?,
 *   discount_code?, discount_cents, delivery_fee_cents, quoted_total_cents,
 *   tracking?: { visitor_id, visit_id, fbp, fbc, ip, user_agent },
 *   lines: [{ product, name_en, name_ar, base_price_cents, quantity, note?,
 *     options: [{ group, group_name_en, group_name_ar, option, name_en, name_ar, price_cents }] }] }
 */
create or replace function public.create_order(payload jsonb)
returns table (order_id uuid, order_number bigint, public_token uuid, total_cents integer, already_placed boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_key uuid := (payload ->> 'idempotency_key')::uuid;
  v_fulfilment public.fulfilment := (payload ->> 'fulfilment')::public.fulfilment;
  v_delivery boolean := (payload ->> 'fulfilment') = 'delivery';
  v_tracking jsonb := coalesce(payload -> 'tracking', '{}');
  v_branch public.branches;
  v_code_id uuid;
  v_customer uuid;
  v_order uuid;
  v_item uuid;
  v_line jsonb;
  v_subtotal int;
  v_discount int;
  v_position int := 0;
begin
  -- A retry of an order that already went through.
  return query
    select o.id, o.number, o.public_token, o.total_cents, true
    from public.orders o where o.idempotency_key = v_key;
  if found then
    return;
  end if;

  select * into v_branch from public.branches where slug = payload ->> 'branch';
  if not found then
    raise exception 'unknown branch "%"', payload ->> 'branch';
  end if;
  if jsonb_typeof(payload -> 'lines') is distinct from 'array' or jsonb_array_length(payload -> 'lines') = 0 then
    raise exception 'an order needs at least one line';
  end if;

  -- Each line costs its base price plus its options, as sent.
  select coalesce(sum((
      (l ->> 'base_price_cents')::int + coalesce((
        select sum((x ->> 'price_cents')::int) from jsonb_array_elements(coalesce(l -> 'options', '[]')) x
      ), 0)
    ) * (l ->> 'quantity')::int), 0)
  into v_subtotal
  from jsonb_array_elements(payload -> 'lines') l;
  v_discount := least(greatest(coalesce((payload ->> 'discount_cents')::int, 0), 0), v_subtotal);

  insert into public.customers as c (phone, name, preferred_locale)
  values (payload ->> 'phone', payload ->> 'name', (payload ->> 'locale')::public.locale)
  on conflict (phone) do update
    set name = excluded.name, preferred_locale = excluded.preferred_locale
  returning c.id into v_customer;

  if v_discount > 0 then
    select d.id into v_code_id from public.discount_codes d where d.code = upper(payload ->> 'discount_code');
  end if;

  insert into public.orders as o (
    idempotency_key, branch_id, customer_id, fulfilment, payment_method, locale,
    customer_name, customer_phone,
    delivery_zone_id, delivery_zone_name_en, delivery_zone_name_ar,
    address_street, address_floor, delivery_note,
    subtotal_cents, discount_cents, delivery_fee_cents, discount_code_id, discount_code,
    quoted_total_cents, eta_min_minutes, eta_max_minutes,
    visitor_id, visit_id, fbp, fbc, client_ip, client_user_agent
  ) values (
    v_key, v_branch.id, v_customer, v_fulfilment,
    case when v_delivery then 'cash_on_delivery'::public.payment_method
      else 'pay_at_pickup'::public.payment_method end,
    (payload ->> 'locale')::public.locale,
    payload ->> 'name', payload ->> 'phone',
    case when v_delivery then (
      select z.id from public.delivery_zones z
      where z.branch_id = v_branch.id and z.slug = payload #>> '{zone,slug}'
    ) end,
    case when v_delivery then payload #>> '{zone,name_en}' end,
    case when v_delivery then payload #>> '{zone,name_ar}' end,
    case when v_delivery then payload ->> 'street' end,
    case when v_delivery then coalesce(payload ->> 'floor', '') end,
    case when v_delivery then coalesce(payload ->> 'delivery_note', '') end,
    v_subtotal, v_discount,
    case when v_delivery then coalesce((payload ->> 'delivery_fee_cents')::int, 0) else 0 end,
    v_code_id,
    case when v_discount > 0 then upper(payload ->> 'discount_code') end,
    (payload ->> 'quoted_total_cents')::int,
    case when v_delivery then v_branch.delivery_eta_min else v_branch.pickup_eta_min end,
    case when v_delivery then v_branch.delivery_eta_max else v_branch.pickup_eta_max end,
    -- Tracking fields are best effort: trimmed to fit, never a reason to fail.
    left(v_tracking ->> 'visitor_id', 64), left(v_tracking ->> 'visit_id', 64),
    left(v_tracking ->> 'fbp', 120), left(v_tracking ->> 'fbc', 500),
    left(v_tracking ->> 'ip', 64), left(v_tracking ->> 'user_agent', 500)
  )
  returning o.id into v_order;

  for v_line in select * from jsonb_array_elements(payload -> 'lines') loop
    v_position := v_position + 1;
    insert into public.order_items as i (
      order_id, position, product_id, product_slug, name_en, name_ar,
      base_price_cents, unit_price_cents, quantity, note
    ) values (
      v_order, v_position,
      (select p.id from public.products p where p.slug = v_line ->> 'product'),
      v_line ->> 'product', v_line ->> 'name_en', v_line ->> 'name_ar',
      (v_line ->> 'base_price_cents')::int,
      (v_line ->> 'base_price_cents')::int + coalesce((
        select sum((x ->> 'price_cents')::int) from jsonb_array_elements(coalesce(v_line -> 'options', '[]')) x
      ), 0),
      (v_line ->> 'quantity')::int,
      left(coalesce(v_line ->> 'note', ''), 140)
    )
    returning i.id into v_item;

    insert into public.order_item_options (
      order_item_id, option_id, group_key, option_key, group_name_en, group_name_ar,
      option_name_en, option_name_ar, price_cents
    )
    select v_item,
      (select o.id from public.options o join public.option_groups g on g.id = o.group_id
       where g.key = x ->> 'group' and o.key = x ->> 'option'),
      x ->> 'group', x ->> 'option', x ->> 'group_name_en', x ->> 'group_name_ar',
      x ->> 'name_en', x ->> 'name_ar', (x ->> 'price_cents')::int
    from jsonb_array_elements(coalesce(v_line -> 'options', '[]')) x;
  end loop;

  insert into public.notifications (order_id, kind, recipient, template, payload)
  select distinct v_order, 'new_order_alert', p.phone, 'new_order_alert', jsonb_build_object('order_id', v_order)
  from public.site_settings s
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(s.value -> 'phones') = 'array' then s.value -> 'phones' else '[]' end
  ) as p (phone)
  where s.key = 'order_alerts'
    and coalesce(s.value ->> 'enabled', 'true') = 'true'
    and p.phone ~ '^\+[1-9][0-9]{7,14}$';

  return query
    select o.id, o.number, o.public_token, o.total_cents, false
    from public.orders o where o.id = v_order;
end;
$$;

-- ─── Summaries for the admin ──────────────────────────────────────────────
-- Views run as the person asking (security_invoker), so the tables' row
-- level security still decides what they see: staff, nobody else.
-- Cancelled orders don't count.

create view public.customer_summaries with (security_invoker = true) as
select
  c.id,
  c.phone,
  c.name,
  c.email,
  c.preferred_locale,
  c.marketing_opt_in_at,
  c.created_at,
  count(o.id) filter (where o.status <> 'cancelled')::int as orders,
  coalesce(sum(o.total_cents) filter (where o.status <> 'cancelled'), 0)::bigint as spent_cents,
  min(o.placed_at) filter (where o.status <> 'cancelled') as first_order_at,
  max(o.placed_at) filter (where o.status <> 'cancelled') as last_order_at
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

create view public.discount_code_usage with (security_invoker = true) as
select
  d.id as code_id,
  count(o.id) filter (where o.status <> 'cancelled')::int as uses,
  coalesce(sum(o.discount_cents) filter (where o.status <> 'cancelled'), 0)::bigint as discount_cents,
  coalesce(sum(o.total_cents) filter (where o.status <> 'cancelled'), 0)::bigint as sales_cents,
  max(o.placed_at) filter (where o.status <> 'cancelled') as last_used_at
from public.discount_codes d
left join public.orders o on o.discount_code_id = d.id
group by d.id;

revoke all on public.customer_summaries, public.discount_code_usage from anon, authenticated;
grant select on public.customer_summaries, public.discount_code_usage to authenticated;
grant select on public.customer_summaries, public.discount_code_usage to service_role;

-- The order board looks orders up by phone and number.
create index orders_phone_idx on public.orders (customer_phone, placed_at desc);
