-- WHISH is available for either fulfilment method. Keep the existing defaults
-- for orders submitted by clients that omit their payment choice.
alter table public.orders
  drop constraint orders_check2,
  add constraint orders_payment_method_matches_fulfilment check (
    payment_method = 'whish' or ((fulfilment = 'delivery') = (payment_method = 'cash_on_delivery'))
  );

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
    delivery_area_id, delivery_area_name_en, delivery_area_name_ar,
    address_street, address_floor, delivery_note,
    subtotal_cents, discount_cents, delivery_fee_cents, discount_code_id, discount_code,
    quoted_total_cents, eta_min_minutes, eta_max_minutes,
    visitor_id, visit_id, fbp, fbc, client_ip, client_user_agent
  ) values (
    v_key, v_branch.id, v_customer, v_fulfilment,
    coalesce((payload ->> 'payment_method')::public.payment_method,
      case when v_delivery then 'cash_on_delivery'::public.payment_method
        else 'pay_at_pickup'::public.payment_method end),
    (payload ->> 'locale')::public.locale,
    payload ->> 'name', payload ->> 'phone',
    case when v_delivery then (
      select z.id from public.delivery_areas z
      where z.branch_id = v_branch.id and z.slug = payload #>> '{area,slug}'
    ) end,
    case when v_delivery then payload #>> '{area,name_en}' end,
    case when v_delivery then payload #>> '{area,name_ar}' end,
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
