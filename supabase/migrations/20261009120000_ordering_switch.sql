-- Online ordering gets three settings instead of a pause switch:
--   hours   take orders during opening hours (the default);
--   open    take orders whatever the hours say (previews, events, late nights);
--   paused  take no orders (rushes, a broken machine).

alter table public.branches
  add column ordering text not null default 'hours'
    check (ordering in ('hours', 'open', 'paused'));

update public.branches set ordering = 'paused' where ordering_paused;

alter table public.branches drop column ordering_paused;

/**
 * Whether the branch takes online orders at this moment: online ordering on
 * and not paused; then either switched open, or not a closure day and inside
 * opening hours minus the last-order margin. Sessions past midnight count for
 * the day they started.
 */
create or replace function public.branch_is_open(p_branch uuid, p_at timestamptz default now()) returns boolean
language plpgsql stable set search_path = '' as $$
declare
  b public.branches;
  local_ts timestamp;
  dow int;
  mins int;
  h public.branch_hours;
  open_m int;
  close_m int;
begin
  select * into b from public.branches where id = p_branch;
  if not found or not b.accepts_online_orders or b.ordering = 'paused' then
    return false;
  end if;
  if b.ordering = 'open' then
    return true;
  end if;

  local_ts := p_at at time zone b.time_zone;
  dow := extract(dow from local_ts);
  mins := extract(hour from local_ts)::int * 60 + extract(minute from local_ts)::int;

  -- Yesterday's session, if it runs past midnight.
  select * into h from public.branch_hours where branch_id = p_branch and weekday = (dow + 6) % 7;
  if found and h.closes_at <= h.opens_at
    and not exists (
      select 1 from public.branch_closures c
      where c.branch_id = p_branch and c.on_date = local_ts::date - 1
    ) then
    close_m := extract(hour from h.closes_at)::int * 60 + extract(minute from h.closes_at)::int;
    if mins < close_m - b.last_order_minutes then
      return true;
    end if;
  end if;

  if exists (select 1 from public.branch_closures c where c.branch_id = p_branch and c.on_date = local_ts::date) then
    return false;
  end if;

  select * into h from public.branch_hours where branch_id = p_branch and weekday = dow;
  if not found then
    return false;
  end if;
  open_m := extract(hour from h.opens_at)::int * 60 + extract(minute from h.opens_at)::int;
  close_m := extract(hour from h.closes_at)::int * 60 + extract(minute from h.closes_at)::int;
  if h.closes_at <= h.opens_at then
    close_m := close_m + 1440;
  end if;
  return mins >= open_m and mins < close_m - b.last_order_minutes;
end;
$$;
