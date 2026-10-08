-- The admin's change history (an item's edits, the price log), with the
-- names of who made each change. Managers can't read the staff list itself,
-- so this returns just the display names alongside the audit rows.

/**
 * Audit rows, newest first: optionally one table, one row, and only changes
 * touching one column (e.g. price_cents for the price log). Managers and up.
 */
create function public.audit_trail(
  p_table text default null,
  p_row_id text default null,
  p_column text default null,
  p_limit integer default 50
)
returns table (
  at timestamptz, actor_name text, table_name text, row_id text, action text, changes jsonb
)
language sql stable security definer set search_path = '' as $$
  select a.at, coalesce(s.display_name, 'Someone'), a.table_name, a.row_id, a.action, a.changes
  from public.audit_log a
  left join public.staff s on s.user_id = a.actor
  where (select public.is_staff('manager'))
    and (p_table is null or a.table_name = p_table)
    and (p_row_id is null or a.row_id = p_row_id)
    and (p_column is null or a.changes ? p_column)
  order by a.at desc
  limit least(greatest(p_limit, 1), 500);
$$;

revoke execute on function public.audit_trail(text, text, text, integer) from public, anon;
grant execute on function public.audit_trail(text, text, text, integer) to authenticated, service_role;
