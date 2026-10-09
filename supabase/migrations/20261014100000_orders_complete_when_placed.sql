-- Until the shop tracks orders (through Odoo, later), an order counts as
-- completed, and paid, the moment it's placed: the customer sends it to the
-- shop on WhatsApp and the shop takes it from there. Staff can still cancel
-- one (a prank, a duplicate, a change of mind), so completed is no longer
-- final; cancelled still is.

create function public.complete_placed_order() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.status := 'completed';
  new.payment_status := 'paid';
  new.completed_at := new.placed_at;
  return new;
end;
$$;

create trigger orders_complete_when_placed
  before insert on public.orders
  for each row execute function public.complete_placed_order();

revoke execute on function public.complete_placed_order() from public, anon, authenticated;

create or replace function public.guard_order_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'cancelled' or (old.status = 'completed' and new.status <> 'cancelled') then
      raise exception 'order %: % is final', old.number, old.status using errcode = '23514';
    end if;
    if new.status <> 'cancelled' and public.order_status_rank(new.status) <= public.order_status_rank(old.status) then
      raise exception 'order %: can''t go from % back to %', old.number, old.status, new.status
        using errcode = '23514';
    end if;
    if (new.status = 'ready' and new.fulfilment <> 'pickup')
      or (new.status = 'out_for_delivery' and new.fulfilment <> 'delivery') then
      raise exception 'order %: % doesn''t apply to a % order', old.number, new.status, new.fulfilment
        using errcode = '23514';
    end if;
    case new.status
      when 'preparing' then new.preparing_at := now();
      when 'ready', 'out_for_delivery' then
        new.ready_at := now();
        new.preparing_at := coalesce(new.preparing_at, now());
      when 'completed' then
        new.completed_at := now();
        new.preparing_at := coalesce(new.preparing_at, now());
        new.ready_at := coalesce(new.ready_at, now());
      when 'cancelled' then new.cancelled_at := now();
      else null;
    end case;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Orders already placed count the same way.
update public.orders
set status = 'completed', payment_status = 'paid'
where status in ('received', 'preparing', 'ready', 'out_for_delivery');
