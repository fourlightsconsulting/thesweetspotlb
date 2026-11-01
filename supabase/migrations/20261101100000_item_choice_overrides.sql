-- Choices & add-ons become templates that items follow until changed.
--
-- option_groups (kind "options") and options are the templates. An item's
-- groups live in product_option_groups: NULL in a field means "as the
-- template". product_options holds only what differs on that item, one row
-- per choice: its own name or price, off on this item, removed from it, or a
-- choice that exists only here. With no template (group_id NULL), the group
-- and its choices are entirely the item's own.

alter table public.product_option_groups drop constraint product_option_groups_pkey;
alter table public.product_option_groups drop constraint product_option_groups_group_id_fkey;

alter table public.product_option_groups
  add column id uuid not null default gen_random_uuid() primary key,
  -- The group's key in a customer's selections, stable for this item.
  add column key public.slug,
  add column name_en text,
  add column name_ar text,
  add column min_select smallint check (min_select >= 0),
  add column max_select smallint check (max_select >= 1),
  alter column group_id drop not null,
  add foreign key (group_id) references public.option_groups (id) on delete set null;

update public.product_option_groups l
set key = g.key
from public.option_groups g
where g.id = l.group_id;

alter table public.product_option_groups
  alter column key set not null,
  add unique (product_id, key),
  add unique (product_id, group_id),
  add check (min_select is null or max_select is null or min_select <= max_select),
  add check (
    group_id is not null
    or (name_en is not null and name_ar is not null and min_select is not null and max_select is not null)
  );

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.product_option_groups (id) on delete cascade,
  -- The template's choice; NULL for a choice that exists only on this item.
  option_id uuid references public.options (id) on delete cascade,
  key public.slug not null,
  name_en text,
  name_ar text,
  price_cents public.cents,
  is_available boolean not null default true,
  is_removed boolean not null default false,
  -- On a template choice: set only once the item has its own order.
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (link_id, key),
  unique (link_id, option_id),
  check (
    option_id is not null
    or (name_en is not null and name_ar is not null and price_cents is not null and sort_order is not null)
  )
);

create index product_options_option_idx on public.product_options (option_id) where option_id is not null;

create trigger product_options_updated_at before update on public.product_options
  for each row execute function public.set_updated_at();
create trigger product_options_audit after insert or update or delete on public.product_options
  for each row execute function public.audit_row();

alter table public.product_options enable row level security;
create policy "Anyone reads item choices" on public.product_options
  for select to anon, authenticated using (true);
create policy "Managers add" on public.product_options
  for insert to authenticated with check ((select public.is_staff('manager')));
create policy "Managers change" on public.product_options
  for update to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));
create policy "Managers remove" on public.product_options
  for delete to authenticated using ((select public.is_staff('manager')));

revoke all on public.product_options from anon, authenticated;
grant select on public.product_options to anon, authenticated;
grant insert, update, delete on public.product_options to authenticated;
grant all on public.product_options to service_role;

-- Deleting a template: the items using it keep the group as it is now, as
-- their own. Slots belong to their bundle and are removed with it.
create function public.keep_template_on_items() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.kind <> 'options' then
    return old;
  end if;

  -- Choices only on the item stay after the template's, unless it has its own order.
  update public.product_options r
  set sort_order = r.sort_order + 1000000
  from public.product_option_groups l
  where r.link_id = l.id and l.group_id = old.id and r.option_id is null
    and not exists (
      select 1 from public.product_options s
      where s.link_id = l.id and s.option_id is not null and s.sort_order is not null
    );

  insert into public.product_options (link_id, option_id, key)
  select l.id, o.id, o.key
  from public.product_option_groups l
  join public.options o on o.group_id = old.id
  where l.group_id = old.id
    and not exists (select 1 from public.product_options r where r.link_id = l.id and r.option_id = o.id);

  update public.product_options r
  set option_id = null,
    name_en = coalesce(r.name_en, o.name_en),
    name_ar = coalesce(r.name_ar, o.name_ar),
    price_cents = coalesce(r.price_cents, o.price_cents),
    is_available = r.is_available and o.is_available,
    sort_order = coalesce(r.sort_order, o.sort_order)
  from public.options o
  where r.option_id = o.id and o.group_id = old.id;

  delete from public.product_options r
  using public.product_option_groups l
  where r.link_id = l.id and l.group_id = old.id and r.is_removed;

  update public.product_option_groups l
  set name_en = coalesce(l.name_en, old.name_en),
    name_ar = coalesce(l.name_ar, old.name_ar),
    min_select = coalesce(l.min_select, old.min_select),
    max_select = coalesce(l.max_select, old.max_select)
  where l.group_id = old.id;

  return old;
end;
$$;

create trigger option_groups_keep_on_items before delete on public.option_groups
  for each row execute function public.keep_template_on_items();

-- An item's page saves all its groups together: exactly these groups and
-- differences, in this order. Unchanged rows aren't touched, so the audit log
-- only shows real changes.
create function public.save_item_groups(p_product uuid, p_groups jsonb) returns void
language plpgsql set search_path = '' as $$
declare
  v_group jsonb;
  v_link uuid;
  v_position integer := 0;
begin
  if not public.is_staff('manager') then
    raise exception 'item groups: managers only' using errcode = '42501';
  end if;
  if not exists (select 1 from public.products p where p.id = p_product and p.kind = 'item') then
    raise exception 'item groups: only menu items have them';
  end if;

  delete from public.product_option_groups l
  where l.product_id = p_product
    and not exists (select 1 from jsonb_array_elements(p_groups) g where g ->> 'key' = l.key);

  for v_group in select * from jsonb_array_elements(p_groups) loop
    v_position := v_position + 1;
    insert into public.product_option_groups as l (
      product_id, group_id, key, name_en, name_ar, min_select, max_select, default_options, sort_order
    ) values (
      p_product,
      (v_group ->> 'groupId')::uuid,
      v_group ->> 'key',
      v_group ->> 'nameEn',
      v_group ->> 'nameAr',
      (v_group ->> 'min')::smallint,
      (v_group ->> 'max')::smallint,
      array(select jsonb_array_elements_text(v_group -> 'defaults')),
      v_position * 10
    )
    on conflict (product_id, key) do update
    set group_id = excluded.group_id,
      name_en = excluded.name_en,
      name_ar = excluded.name_ar,
      min_select = excluded.min_select,
      max_select = excluded.max_select,
      default_options = excluded.default_options,
      sort_order = excluded.sort_order
    where (l.group_id, l.name_en, l.name_ar, l.min_select, l.max_select, l.default_options, l.sort_order)
      is distinct from
      (excluded.group_id, excluded.name_en, excluded.name_ar, excluded.min_select, excluded.max_select,
       excluded.default_options, excluded.sort_order);

    select l.id into v_link
    from public.product_option_groups l
    where l.product_id = p_product and l.key = v_group ->> 'key';

    delete from public.product_options r
    where r.link_id = v_link
      and not exists (select 1 from jsonb_array_elements(v_group -> 'choices') c where c ->> 'key' = r.key);

    insert into public.product_options as r (
      link_id, option_id, key, name_en, name_ar, price_cents, is_available, is_removed, sort_order
    )
    select v_link,
      (c ->> 'optionId')::uuid,
      c ->> 'key',
      c ->> 'nameEn',
      c ->> 'nameAr',
      (c ->> 'price')::integer,
      (c ->> 'available')::boolean,
      (c ->> 'removed')::boolean,
      (c ->> 'sort')::integer
    from jsonb_array_elements(v_group -> 'choices') c
    on conflict (link_id, key) do update
    set option_id = excluded.option_id,
      name_en = excluded.name_en,
      name_ar = excluded.name_ar,
      price_cents = excluded.price_cents,
      is_available = excluded.is_available,
      is_removed = excluded.is_removed,
      sort_order = excluded.sort_order
    where (r.option_id, r.name_en, r.name_ar, r.price_cents, r.is_available, r.is_removed, r.sort_order)
      is distinct from
      (excluded.option_id, excluded.name_en, excluded.name_ar, excluded.price_cents, excluded.is_available,
       excluded.is_removed, excluded.sort_order);
  end loop;
end;
$$;

revoke execute on function public.save_item_groups(uuid, jsonb) from public, anon;
grant execute on function public.save_item_groups(uuid, jsonb) to authenticated;
