-- Run with: supabase db query --linked --file supabase/tests/delivery_zones.sql
-- Every test, including the order and notification queue entries, rolls back.
begin;
do $$
declare
  b uuid := (select id from public.branches where slug = 'tripoli');
  other_branch uuid := gen_random_uuid();
  z1 uuid := gen_random_uuid();
  z2 uuid := gen_random_uuid();
  a1 uuid := gen_random_uuid();
  a2 uuid := gen_random_uuid();
  order_row record;
  snapshot jsonb;
  test_name text := 'Test zone ' || z1;
begin
  insert into public.branches (id, slug, name_en, name_ar)
    values (other_branch, 'test-' || other_branch, 'Test branch', 'فرع تجريبي');
  insert into public.delivery_zones (id, branch_id, name, fee_cents)
    values (z1, b, test_name, 200), (z2, b, 'Test zone ' || z2, 500);
  insert into public.delivery_areas (id, branch_id, zone_id, slug, name_en, name_ar)
    values (a1, b, z1, 'test-' || a1, 'Test area one', 'منطقة تجريبية'),
      (a2, b, z1, 'test-' || a2, 'Test area two', 'منطقة تجريبية ثانية');

  assert (select count(*) = 2 from public.delivery_areas a join public.delivery_zones z on z.id = a.zone_id where a.id in (a1, a2) and z.fee_cents = 200), 'Areas inherit their zone fee';
  update public.delivery_zones set fee_cents = 450 where id = z1;
  assert (select count(*) = 2 from public.delivery_areas a join public.delivery_zones z on z.id = a.zone_id where a.id in (a1, a2) and z.fee_cents = 450), 'One zone fee update applies to every area';
  update public.delivery_areas set zone_id = z2 where id = a2;
  assert (select z.fee_cents = 500 from public.delivery_areas a join public.delivery_zones z on z.id = a.zone_id where a.id = a2), 'Moving an area changes its inherited fee';
  update public.delivery_zones set fee_cents = 0 where id = z2;
  assert (select z.fee_cents = 0 from public.delivery_areas a join public.delivery_zones z on z.id = a.zone_id where a.id = a2), 'Free delivery is valid';

  begin
    insert into public.delivery_areas (branch_id, zone_id, slug, name_en, name_ar)
      values (other_branch, z1, 'test-cross-branch', 'Wrong branch', 'خطأ');
    raise exception 'Cross-branch area assignment was allowed';
  exception when foreign_key_violation then null;
  end;
  begin
    delete from public.delivery_zones where id = z1;
    raise exception 'Deleting a populated zone was allowed';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.delivery_zones (branch_id, name, fee_cents) values (b, upper(test_name), 100);
    raise exception 'Duplicate zone names were allowed';
  exception when unique_violation then null;
  end;
  begin
    insert into public.delivery_zones (branch_id, name, fee_cents) values (b, 'Negative fee', -1);
    raise exception 'Negative delivery fee was allowed';
  exception when check_violation then null;
  end;

  select * into order_row from public.create_order(jsonb_build_object(
    'idempotency_key', gen_random_uuid(), 'branch', 'tripoli', 'locale', 'en',
    'fulfilment', 'delivery', 'name', 'Zone test', 'phone', '+96170000000',
    'area', jsonb_build_object('slug', 'test-' || a1, 'name_en', 'Test area one', 'name_ar', 'منطقة تجريبية'),
    'street', 'Test street', 'discount_cents', 0, 'delivery_fee_cents', 450,
    'quoted_total_cents', 550, 'lines', jsonb_build_array(jsonb_build_object(
      'product', (select slug from public.products limit 1), 'name_en', 'Test dessert',
      'name_ar', 'حلوى', 'base_price_cents', 100, 'quantity', 1, 'options', '[]'::jsonb
    ))
  ));
  assert (select delivery_area_id = a1 and delivery_fee_cents = 450 and total_cents = 550 from public.orders where id = order_row.order_id), 'Order stores the chosen area and delivery fee';
  snapshot := public.get_order_status(order_row.public_token);
  assert snapshot ->> 'area_en' = 'Test area one', 'Order lookup uses area columns';
  update public.delivery_zones set fee_cents = 600 where id = z1;
  assert (select delivery_fee_cents = 450 from public.orders where id = order_row.order_id), 'Zone fee edits do not rewrite past orders';
  update public.delivery_areas set is_active = false where id = a2;
end;
$$;

-- Anonymous visitors see only active areas and cannot change zone prices.
set local role anon;
do $$
begin
  assert not exists(select 1 from public.delivery_areas where not is_active), 'Inactive areas are hidden by RLS';
  begin
    update public.delivery_zones set fee_cents = 1;
    raise exception 'Anonymous zone edits were allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
