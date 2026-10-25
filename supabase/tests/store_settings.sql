-- The entire Store draft saves together; all test edits roll back.
begin;
do $$
declare
  actor uuid := (select user_id from public.staff where is_active and role >= 'manager' order by role desc limit 1);
begin
  assert actor is not null, 'A staging manager is required for this test';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', actor::text, true);
end;
$$;
set local role authenticated;
do $$
declare
  b uuid := (select id from public.branches where slug = 'tripoli');
  z1 uuid := gen_random_uuid();
  z2 uuid := gen_random_uuid();
  a1 uuid := gen_random_uuid();
  a2 uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  draft jsonb;
  next_draft jsonb;
begin
  draft := jsonb_build_object(
    'branchId', b, 'ordering', 'paused', 'pickupMin', 12, 'pickupMax', 18,
    'deliveryMin', 35, 'deliveryMax', 50,
    'zones', jsonb_build_array(
      jsonb_build_object('id', z1, 'name', 'Test ' || z1, 'fee', 250),
      jsonb_build_object('id', z2, 'name', 'Test ' || z2, 'fee', 450)),
    'areas', jsonb_build_array(
      jsonb_build_object('id', a1, 'zoneId', z1, 'slug', 'test-' || a1, 'nameEn', 'Test one', 'nameAr', 'تجربة', 'active', true),
      jsonb_build_object('id', a2, 'zoneId', z1, 'slug', 'test-' || a2, 'nameEn', 'Test two', 'nameAr', 'تجربة ثانية', 'active', true)),
    'hours', jsonb_build_array(jsonb_build_object('branchId', b, 'lastOrderMinutes', 20,
      'week', (select jsonb_agg(jsonb_build_object('open', true, 'opens', '13:00', 'closes', '01:00')) from generate_series(0,6)))),
    'closures', jsonb_build_array(jsonb_build_object('id', c, 'branchId', b, 'date', (current_date + 100)::text, 'note', 'Store save test')),
    'removedZoneIds', '[]'::jsonb, 'removedAreaIds', '[]'::jsonb, 'removedClosureIds', '[]'::jsonb,
    'alerts', null
  );
  perform public.save_store_settings(draft);
  assert (select ordering = 'paused' and pickup_eta_min = 12 and delivery_eta_max = 50 and last_order_minutes = 20 from public.branches where id = b), 'Ordering and ready times save together';
  assert (select count(*) = 7 from public.branch_hours where branch_id = b and opens_at = '13:00' and closes_at = '01:00'), 'All opening hours save together';
  assert exists(select 1 from public.branch_closures where id = c), 'Closed days are part of the same save';

  -- Array order has no delivery meaning; moving an area still updates its zone.
  next_draft := jsonb_set(draft, '{zones}', jsonb_build_array(draft #> '{zones,1}', draft #> '{zones,0}'));
  next_draft := jsonb_set(next_draft, '{areas}', jsonb_build_array(jsonb_set(draft #> '{areas,1}', '{zoneId}', to_jsonb(z2)), draft #> '{areas,0}'));
  perform public.save_store_settings(next_draft);

  assert (select zone_id = z2 from public.delivery_areas where id = a2), 'Area reassignment persists';

  -- A late failure must undo earlier ordering, fee and hours updates.
  begin
    perform public.save_store_settings(jsonb_set(jsonb_set(next_draft, '{ordering}', '"open"'), '{removedZoneIds}', jsonb_build_array(z1)));
    raise exception 'Deleting a populated zone should fail';
  exception when foreign_key_violation then null;
  end;
  assert (select ordering = 'paused' from public.branches where id = b), 'Failed saves roll back the entire draft';

  -- Explicit removals leave unrelated areas and closures untouched.
  next_draft := jsonb_set(next_draft, '{areas}', '[]');
  next_draft := jsonb_set(next_draft, '{zones}', '[]');
  next_draft := jsonb_set(next_draft, '{closures}', '[]');
  next_draft := jsonb_set(next_draft, '{removedAreaIds}', jsonb_build_array(a1, a2));
  next_draft := jsonb_set(next_draft, '{removedZoneIds}', jsonb_build_array(z1, z2));
  next_draft := jsonb_set(next_draft, '{removedClosureIds}', jsonb_build_array(c));
  perform public.save_store_settings(next_draft);
  assert not exists(select 1 from public.delivery_zones where id in (z1,z2)), 'Empty zones can be removed in the combined save';
  assert (select count(*) >= 6 from public.delivery_areas where branch_id = b), 'Other existing areas are preserved';
end;
$$;
reset role;
-- A signed-out caller cannot invoke the save function.
set local role anon;
do $$
begin
  begin
    perform public.save_store_settings('{}'::jsonb);
    raise exception 'Anonymous Store save was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
