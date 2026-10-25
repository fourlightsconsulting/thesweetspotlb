-- The Store page saves its whole draft in one transaction, through the
-- signed-in manager's client. RLS continues to apply to every table.
create function public.save_store_settings(payload jsonb) returns void
language plpgsql set search_path = '' as $$
declare
  v_branch uuid := (payload ->> 'branchId')::uuid;
  v_row jsonb;
  v_day jsonb;
  v_position integer;
  v_weekday integer;
  v_id uuid;
begin
  if not public.is_staff('manager') then
    raise exception 'store settings: managers only' using errcode = '42501';
  end if;
  update public.branches set ordering = payload ->> 'ordering',
    pickup_eta_min = (payload ->> 'pickupMin')::int,
    pickup_eta_max = (payload ->> 'pickupMax')::int,
    delivery_eta_min = (payload ->> 'deliveryMin')::int,
    delivery_eta_max = (payload ->> 'deliveryMax')::int
  where id = v_branch;
  if not found then raise exception 'Unknown branch' using errcode = '23503'; end if;

  v_position := 0;
  for v_row in select * from jsonb_array_elements(payload -> 'zones') loop
    v_position := v_position + 10;
    insert into public.delivery_zones as z (id, branch_id, name, fee_cents, sort_order)
      values ((v_row ->> 'id')::uuid, v_branch, v_row ->> 'name', (v_row ->> 'fee')::int, v_position)
      on conflict (id) do update set name = excluded.name, fee_cents = excluded.fee_cents, sort_order = excluded.sort_order
      where z.branch_id = v_branch;
    if not found then raise exception 'Zone belongs to another branch' using errcode = '23503'; end if;
  end loop;

  -- Apply moves before deleting emptied zones. Keep existing area slugs and
  -- order snapshots stable when a name is edited.
  v_position := 0;
  for v_row in select * from jsonb_array_elements(payload -> 'areas') loop
    v_position := v_position + 10;
    insert into public.delivery_areas as a (id, branch_id, zone_id, slug, name_en, name_ar, is_active, sort_order)
      values ((v_row ->> 'id')::uuid, v_branch, (v_row ->> 'zoneId')::uuid, v_row ->> 'slug', v_row ->> 'nameEn', v_row ->> 'nameAr', (v_row ->> 'active')::boolean, v_position)
      on conflict (id) do update set zone_id = excluded.zone_id, name_en = excluded.name_en,
        name_ar = excluded.name_ar, is_active = excluded.is_active, sort_order = excluded.sort_order
      where a.branch_id = v_branch;
    if not found then raise exception 'Area belongs to another branch' using errcode = '23503'; end if;
  end loop;
  delete from public.delivery_areas where branch_id = v_branch and id in
    (select value::uuid from jsonb_array_elements_text(payload -> 'removedAreaIds'));
  delete from public.delivery_zones where branch_id = v_branch and id in
    (select value::uuid from jsonb_array_elements_text(payload -> 'removedZoneIds'));

  for v_row in select * from jsonb_array_elements(payload -> 'hours') loop
    v_id := (v_row ->> 'branchId')::uuid;
    update public.branches set last_order_minutes = (v_row ->> 'lastOrderMinutes')::int where id = v_id;
    if not found then raise exception 'Unknown hours branch' using errcode = '23503'; end if;
    delete from public.branch_hours where branch_id = v_id;
    v_weekday := 0;
    for v_day in select * from jsonb_array_elements(v_row -> 'week') loop
      if (v_day ->> 'open')::boolean then
        insert into public.branch_hours (branch_id, weekday, opens_at, closes_at)
          values (v_id, v_weekday, (v_day ->> 'opens')::time, (v_day ->> 'closes')::time);
      end if;
      v_weekday := v_weekday + 1;
    end loop;
  end loop;

  delete from public.branch_closures where id in
    (select value::uuid from jsonb_array_elements_text(payload -> 'removedClosureIds'));
  for v_row in select * from jsonb_array_elements(payload -> 'closures') loop
    insert into public.branch_closures (id, branch_id, on_date, note)
      values ((v_row ->> 'id')::uuid, (v_row ->> 'branchId')::uuid, (v_row ->> 'date')::date, v_row ->> 'note')
      on conflict (id) do update set branch_id = excluded.branch_id, on_date = excluded.on_date, note = excluded.note;
  end loop;
  if payload -> 'alerts' <> 'null'::jsonb then
    insert into public.site_settings (key, value, is_public)
      values ('order_alerts', payload -> 'alerts', false)
      on conflict (key) do update set value = excluded.value, is_public = false;
  end if;
end;
$$;
revoke execute on function public.save_store_settings(jsonb) from public, anon;
grant execute on function public.save_store_settings(jsonb) to authenticated;
