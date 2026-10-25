-- Separate shared delivery fees from individual, bilingual delivery areas.
alter table public.delivery_zones rename to delivery_areas;
alter table public.delivery_areas rename constraint delivery_zones_pkey to delivery_areas_pkey;
alter table public.delivery_areas rename constraint delivery_zones_branch_id_fkey to delivery_areas_branch_id_fkey;
alter table public.delivery_areas rename constraint delivery_zones_branch_id_slug_key to delivery_areas_branch_id_slug_key;
alter trigger delivery_zones_updated_at on public.delivery_areas rename to delivery_areas_updated_at;
alter trigger delivery_zones_audit on public.delivery_areas rename to delivery_areas_audit;
alter policy "Anyone reads live zones" on public.delivery_areas rename to "Anyone reads live areas";

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name text not null check (name = btrim(name) and length(name) between 1 and 60),
  fee_cents public.cents not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, branch_id)
);
create unique index delivery_zones_name_idx on public.delivery_zones (branch_id, lower(name));
create trigger delivery_zones_updated_at before update on public.delivery_zones
  for each row execute function public.set_updated_at();
create trigger delivery_zones_audit after insert or update or delete on public.delivery_zones
  for each row execute function public.audit_row();

alter table public.delivery_zones enable row level security;
create policy "Anyone reads delivery fees" on public.delivery_zones
  for select to anon, authenticated using (true);
create policy "Managers add" on public.delivery_zones
  for insert to authenticated with check ((select public.is_staff('manager')));
create policy "Managers change" on public.delivery_zones
  for update to authenticated using ((select public.is_staff('manager')))
  with check ((select public.is_staff('manager')));
create policy "Managers remove" on public.delivery_zones
  for delete to authenticated using ((select public.is_staff('manager')));
grant select on public.delivery_zones to anon, authenticated;
grant insert, update, delete on public.delivery_zones to authenticated;
grant all on public.delivery_zones to service_role;

-- Equal fees start together. In staging this creates Zone A ($2) for the
-- six existing Tripoli areas, without changing any area's identity or fee.
insert into public.delivery_zones (branch_id, name, fee_cents, sort_order)
select branch_id, 'Zone ' || chr(64 + (row_number() over w)::int), fee_cents,
  (row_number() over w)::int * 10
from (select distinct branch_id, fee_cents from public.delivery_areas) fees
window w as (partition by branch_id order by fee_cents);

alter table public.delivery_areas add column zone_id uuid;
update public.delivery_areas a set zone_id = z.id
from public.delivery_zones z
where z.branch_id = a.branch_id and z.fee_cents = a.fee_cents;
alter table public.delivery_areas
  alter column zone_id set not null,
  drop column fee_cents,
  drop column min_order_cents,
  add constraint delivery_areas_zone_branch_fkey foreign key (zone_id, branch_id)
    references public.delivery_zones (id, branch_id) on delete restrict;
create index delivery_areas_zone_idx on public.delivery_areas (zone_id, branch_id);

alter table public.orders rename column delivery_zone_id to delivery_area_id;
alter table public.orders rename column delivery_zone_name_en to delivery_area_name_en;
alter table public.orders rename column delivery_zone_name_ar to delivery_area_name_ar;
alter table public.orders rename constraint orders_delivery_zone_id_fkey to orders_delivery_area_id_fkey;

comment on table public.delivery_zones is 'Named delivery fee groups managed in admin; names are not shown at checkout.';
comment on table public.delivery_areas is 'Bilingual delivery areas; each inherits its zone delivery fee.';

-- Refresh function bodies after renaming the area table and order columns.

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
    case when v_delivery then 'cash_on_delivery'::public.payment_method
      else 'pay_at_pickup'::public.payment_method end,
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

create or replace function public.get_order_status(token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'number', o.number,
    'status', o.status,
    'fulfilment', o.fulfilment,
    'payment_method', o.payment_method,
    'placed_at', o.placed_at,
    'eta_min_minutes', o.eta_min_minutes,
    'eta_max_minutes', o.eta_max_minutes,
    'customer_name', o.customer_name,
    'area_en', o.delivery_area_name_en,
    'area_ar', o.delivery_area_name_ar,
    'subtotal_cents', o.subtotal_cents,
    'discount_cents', o.discount_cents,
    'delivery_fee_cents', o.delivery_fee_cents,
    'total_cents', o.total_cents,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name_en', i.name_en, 'name_ar', i.name_ar, 'quantity', i.quantity,
        'line_total_cents', i.line_total_cents, 'note', i.note,
        'options_en', (select string_agg(x.option_name_en, ' · ') from public.order_item_options x where x.order_item_id = i.id),
        'options_ar', (select string_agg(x.option_name_ar, ' · ') from public.order_item_options x where x.order_item_id = i.id)
      ) order by i.position), '[]')
      from public.order_items i where i.order_id = o.id
    )
  )
  from public.orders o where o.public_token = token;
$$;

create or replace function public.dashboard_orders(p_from date, p_to date) returns jsonb
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
    'areas', (
      select coalesce(jsonb_agg(jsonb_build_object('name', area, 'orders', n, 'sales_cents', s) order by n desc), '[]')
      from (
        select delivery_area_name_en as area, count(*) n, sum(total_cents) s
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
