-- Tidy-ups from Supabase's database advisors after the first push.
--
-- 1. Trigger functions aren't API calls: nobody executes them directly.
-- 2. One policy per table and action. A "for all" edit policy also covers
--    reads, so tables with a public read policy were checking two policies
--    on every select; edits now have their own insert / update / delete
--    policies.

-- ─── 1. Trigger functions ─────────────────────────────────────────────────

revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.link_customer_to_user() from public, anon, authenticated;
revoke execute on function public.guard_staff_change() from public, anon, authenticated;
revoke execute on function public.guard_option() from public, anon, authenticated;
revoke execute on function public.guard_customer_update() from public, anon, authenticated;
revoke execute on function public.guard_order_update() from public, anon, authenticated;
revoke execute on function public.guard_menu_staff_update() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ─── 2. One policy per action ─────────────────────────────────────────────

-- Managers edit these; everyone (or every staff member) reads them through
-- the table's existing select policy.
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('branches', 'Managers edit branches'),
      ('branch_hours', 'Managers edit hours'),
      ('branch_closures', 'Managers edit closures'),
      ('delivery_zones', 'Managers edit zones'),
      ('categories', 'Managers edit categories'),
      ('option_groups', 'Managers edit option groups'),
      ('product_option_groups', 'Managers edit product options'),
      ('discount_codes', 'Managers edit codes'),
      ('site_settings', 'Managers edit settings')
    ) as v (tbl, old_policy)
  loop
    execute format('drop policy %I on public.%I', t.old_policy, t.tbl);
    execute format(
      'create policy "Managers add" on public.%I for insert to authenticated with check ((select public.is_staff(''manager'')))',
      t.tbl);
    execute format(
      'create policy "Managers change" on public.%I for update to authenticated using ((select public.is_staff(''manager''))) with check ((select public.is_staff(''manager'')))',
      t.tbl);
    execute format(
      'create policy "Managers remove" on public.%I for delete to authenticated using ((select public.is_staff(''manager'')))',
      t.tbl);
  end loop;
end;
$$;

-- Staff: owners manage the team; everyone may change their own display name
-- (guard_staff_change stops anyone changing their own role or access).
drop policy "Owners manage staff" on public.staff;
drop policy "Staff rename themselves" on public.staff;

create policy "Owners add staff" on public.staff
  for insert to authenticated with check ((select public.is_staff('owner')));
create policy "Owners change staff; staff rename themselves" on public.staff
  for update to authenticated
  using ((select public.is_staff('owner')) or (user_id = (select auth.uid()) and is_active))
  with check ((select public.is_staff('owner')) or user_id = (select auth.uid()));
create policy "Owners remove staff" on public.staff
  for delete to authenticated using ((select public.is_staff('owner')));
