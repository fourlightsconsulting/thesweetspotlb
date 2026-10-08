-- The Sweet Spot: core schema.
--
-- Supabase holds what the website and its admin need; the ERP (Odoo) holds
-- in-store sales, stock and finance. Here: the online menu (categories,
-- products, option groups; bundles reuse the option tables), branches with
-- opening hours and delivery zones, customers keyed by phone, web orders with
-- snapshots of what was ordered, discount codes, staff roles, site settings
-- (home ticker, welcome popup), an audit log of staff changes, and an outbox
-- for the WhatsApp order alerts. Tracking and marketing tables come in later
-- migrations.
--
-- Conventions: money is integer US cents; customer-facing text has English
-- and Arabic columns (_en / _ar); phone numbers are E.164 (+96171234567);
-- slugs and keys are lowercase and match the website's ids.

-- ─── Types ────────────────────────────────────────────────────────────────

create type public.locale as enum ('en', 'ar');
create type public.fulfilment as enum ('pickup', 'delivery');
create type public.order_status as enum (
  'received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'
);
create type public.payment_method as enum ('cash_on_delivery', 'pay_at_pickup');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');
create type public.product_kind as enum ('item', 'bundle');
create type public.product_tag as enum ('fav', 'new', 'limited');
-- options: add-ons and choices with a price each. items: a bundle slot, whose
-- choices are menu items.
create type public.option_group_kind as enum ('options', 'items');
create type public.discount_kind as enum ('percent', 'amount');
-- In rising order of access, so roles compare with >=.
create type public.staff_role as enum ('staff', 'manager', 'owner');
create type public.notification_status as enum ('queued', 'sending', 'sent', 'failed');

create domain public.e164_phone as text check (value ~ '^\+[1-9][0-9]{7,14}$');
create domain public.slug as text check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
create domain public.cents as integer check (value >= 0);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── Audit log ────────────────────────────────────────────────────────────
-- Who changed what in the admin, including price history. Written by the
-- audit_row() trigger on the tables staff edit; changes made without a
-- signed-in user (seeds, the website's server, background jobs) aren't logged.

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid references auth.users (id) on delete set null,
  table_name text not null,
  -- The row's key; composite keys are joined with ":".
  row_id text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  -- Updates: the changed columns as {column: [old, new]}. Inserts and deletes: the row.
  changes jsonb not null
);

create index audit_log_row_idx on public.audit_log (table_name, row_id, at desc);
create index audit_log_at_idx on public.audit_log (at desc);

/** Trigger: logs a staff change. Arguments name the key columns (default "id"). */
create function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changes jsonb := '{}';
  v_key text;
  v_id text := '';
begin
  if v_actor is null then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key <> 'updated_at' and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_array(v_old -> v_key, v_new -> v_key));
      end if;
    end loop;
    if v_changes = '{}' then
      return null;
    end if;
  else
    v_changes := v_row;
  end if;
  if tg_nargs = 0 then
    v_id := v_row ->> 'id';
  else
    for i in 0 .. tg_nargs - 1 loop
      v_id := v_id || case when i > 0 then ':' else '' end || coalesce(v_row ->> tg_argv[i], '');
    end loop;
  end if;
  insert into public.audit_log (actor, table_name, row_id, action, changes)
  values (v_actor, tg_table_name, v_id, lower(tg_op), v_changes);
  return null;
end;
$$;

-- ─── Staff ────────────────────────────────────────────────────────────────
-- Admin access. Owners manage staff and connectors; managers the menu,
-- prices, offers, site and store settings, and see the dashboards; staff
-- work the orders.

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null default 'staff',
  display_name text not null check (char_length(display_name) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();
create trigger staff_audit after insert or update or delete on public.staff
  for each row execute function public.audit_row('user_id');

/** True when the signed-in user is active staff with at least this role. */
create function public.is_staff(minimum public.staff_role default 'staff') returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.role >= minimum from public.staff s where s.user_id = (select auth.uid()) and s.is_active),
    false
  );
$$;

-- Nobody can lock themselves out, and there's always an active owner.
create function public.guard_staff_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' and old.user_id = (select auth.uid())
    and (tg_op = 'DELETE' or new.role <> old.role or not new.is_active) then
    raise exception 'staff: you can''t change your own role or access' using errcode = '42501';
  end if;
  if tg_op <> 'INSERT' and old.role = 'owner' and old.is_active
    and (tg_op = 'DELETE' or new.role <> 'owner' or not new.is_active)
    and not exists (
      select 1 from public.staff s
      where s.role = 'owner' and s.is_active and s.user_id <> old.user_id
    ) then
    raise exception 'staff: there must be at least one active owner' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger staff_guard before update or delete on public.staff
  for each row execute function public.guard_staff_change();

/** The team list for owners, with sign-in emails (which live in auth.users). */
create function public.staff_directory()
returns table (
  user_id uuid, email text, display_name text, role public.staff_role,
  is_active boolean, last_sign_in_at timestamptz, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select s.user_id, u.email::text, s.display_name, s.role, s.is_active, u.last_sign_in_at, s.created_at
  from public.staff s
  join auth.users u on u.id = s.user_id
  where (select public.is_staff('owner'))
  order by s.created_at;
$$;

-- ─── Branches ─────────────────────────────────────────────────────────────

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  name_en text not null,
  name_ar text not null,
  address_en text not null default '',
  address_ar text not null default '',
  phone public.e164_phone,
  -- Where new-order alerts go (WhatsApp).
  alert_phone public.e164_phone,
  maps_url text,
  time_zone text not null default 'Asia/Beirut',
  accepts_online_orders boolean not null default false,
  -- A pause switch for rushes or a broken machine; the site shows ordering as closed.
  ordering_paused boolean not null default false,
  -- Online orders stop this many minutes before closing.
  last_order_minutes smallint not null default 15 check (last_order_minutes between 0 and 180),
  pickup_eta_min smallint not null default 10,
  pickup_eta_max smallint not null default 15,
  delivery_eta_min smallint not null default 30,
  delivery_eta_max smallint not null default 45,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (0 < pickup_eta_min and pickup_eta_min <= pickup_eta_max),
  check (0 < delivery_eta_min and delivery_eta_min <= delivery_eta_max)
);

create trigger branches_updated_at before update on public.branches
  for each row execute function public.set_updated_at();
create trigger branches_audit after insert or update or delete on public.branches
  for each row execute function public.audit_row();

create table public.branch_hours (
  branch_id uuid not null references public.branches (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  opens_at time not null,
  -- At or before opens_at means after midnight (12 pm – 1 am).
  closes_at time not null,
  primary key (branch_id, weekday)
);

create trigger branch_hours_audit after insert or update or delete on public.branch_hours
  for each row execute function public.audit_row('branch_id', 'weekday');

create table public.branch_closures (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  on_date date not null,
  note text not null default '',
  unique (branch_id, on_date)
);

create trigger branch_closures_audit after insert or update or delete on public.branch_closures
  for each row execute function public.audit_row();

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  slug public.slug not null,
  name_en text not null,
  name_ar text not null,
  fee_cents public.cents not null,
  min_order_cents public.cents not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, slug)
);

create trigger delivery_zones_updated_at before update on public.delivery_zones
  for each row execute function public.set_updated_at();
create trigger delivery_zones_audit after insert or update or delete on public.delivery_zones
  for each row execute function public.audit_row();

/**
 * Whether the branch takes online orders at this moment: online ordering on,
 * not paused, not a closure day, and inside opening hours minus the
 * last-order margin. Sessions past midnight count for the day they started.
 */
create function public.branch_is_open(p_branch uuid, p_at timestamptz default now()) returns boolean
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
  if not found or not b.accepts_online_orders or b.ordering_paused then
    return false;
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

-- ─── Menu ─────────────────────────────────────────────────────────────────
-- A bundle is a product of kind "bundle" whose option groups include slots
-- (kind "items"): each slot is one pick, from its listed items (options rows
-- pointing at products, their price the surcharge) and, if set, every
-- available item in its source category. A slot with a single item is a
-- fixed part of the bundle. Picked items keep their own option groups
-- (required choices, add-ons) at their usual prices.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  -- Set for a heading inside a category (Milkshakes under Cold drinks).
  parent_id uuid references public.categories (id) on delete restrict,
  slug public.slug not null unique,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  -- A bundled photo's file name, or a path in the "menu" storage bucket.
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger categories_audit after insert or update or delete on public.categories
  for each row execute function public.audit_row();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  kind public.product_kind not null default 'item',
  slug public.slug not null unique,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  price_cents public.cents not null,
  image_path text,
  tag public.product_tag,
  sort_order integer not null default 0,
  -- Listed on the menu at all.
  is_active boolean not null default true,
  -- False while sold out: still listed, can't be ordered.
  is_available boolean not null default true,
  -- False for dine-in-only dishes (the waffle sandwich).
  orderable_online boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger products_audit after insert or update or delete on public.products
  for each row execute function public.audit_row();

create index products_category_idx on public.products (category_id, sort_order);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  key public.slug not null unique,
  kind public.option_group_kind not null default 'options',
  name_en text not null,
  name_ar text not null,
  -- min 1 + max 1: a required single choice; min 0: optional, up to max.
  min_select smallint not null default 0 check (min_select >= 0),
  max_select smallint not null check (max_select >= 1),
  -- Bundle slots only: every available item in this category is a choice.
  source_category_id uuid references public.categories (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_select <= max_select),
  -- A slot is exactly one pick.
  check (kind = 'options' or (min_select = 1 and max_select = 1)),
  check (kind = 'items' or source_category_id is null)
);

create trigger option_groups_updated_at before update on public.option_groups
  for each row execute function public.set_updated_at();
create trigger option_groups_audit after insert or update or delete on public.option_groups
  for each row execute function public.audit_row();

create table public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups (id) on delete cascade,
  key public.slug not null,
  name_en text not null,
  name_ar text not null,
  -- The add-on's price, or for a bundle slot the surcharge for this item.
  price_cents public.cents not null default 0,
  -- Bundle slots only: the item this choice picks (key is its slug).
  product_id uuid references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, key)
);

create trigger options_updated_at before update on public.options
  for each row execute function public.set_updated_at();
create trigger options_audit after insert or update or delete on public.options
  for each row execute function public.audit_row();

create index options_group_idx on public.options (group_id, sort_order);
create index options_product_idx on public.options (product_id) where product_id is not null;

-- Slot choices point at items (not bundles); add-ons point at nothing.
create function public.guard_option() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_kind public.option_group_kind;
begin
  select g.kind into v_kind from public.option_groups g where g.id = new.group_id;
  if v_kind = 'items' and new.product_id is null then
    raise exception 'options: a bundle slot''s choice must point at a menu item' using errcode = '23514';
  end if;
  if v_kind = 'options' and new.product_id is not null then
    raise exception 'options: only bundle slots point at menu items' using errcode = '23514';
  end if;
  if new.product_id is not null and exists (
    select 1 from public.products p where p.id = new.product_id and p.kind = 'bundle'
  ) then
    raise exception 'options: a bundle can''t contain another bundle' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger options_guard before insert or update on public.options
  for each row execute function public.guard_option();

create table public.product_option_groups (
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.option_groups (id) on delete restrict,
  sort_order integer not null default 0,
  -- Option keys preselected in the customiser.
  default_options text[] not null default '{}',
  primary key (product_id, group_id)
);

create trigger product_option_groups_audit after insert or update or delete on public.product_option_groups
  for each row execute function public.audit_row('product_id', 'group_id');

-- ─── Customers ────────────────────────────────────────────────────────────
-- Everyone who orders on the website is a customer, keyed by phone. Signing
-- in (phone code, later) links the login to the same record, so guest
-- history carries over. A verified email completes the profile.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  phone public.e164_phone not null unique,
  name text not null default '' check (char_length(name) <= 80),
  email text unique check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  email_verified_at timestamptz,
  profile_completed boolean generated always as (
    name <> '' and email is not null and email_verified_at is not null
  ) stored,
  preferred_locale public.locale not null default 'en',
  -- Null means no marketing messages.
  marketing_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- Signed-in customers can only change these; the rest is set by the server.
create function public.guard_customer_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not public.is_staff() then
    if new.phone is distinct from old.phone or new.user_id is distinct from old.user_id
      or new.email_verified_at is distinct from old.email_verified_at
      or new.created_at is distinct from old.created_at then
      raise exception 'customers: only name, email, language and marketing choice can be changed'
        using errcode = '42501';
    end if;
    -- A new email needs verifying again.
    if new.email is distinct from old.email then
      new.email_verified_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger customers_guard before update on public.customers
  for each row execute function public.guard_customer_update();

/** Links a phone login to its customer record (creating one) once the code is confirmed. */
create function public.link_customer_to_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.phone is not null and new.phone <> '' and new.phone_confirmed_at is not null then
    insert into public.customers (phone, user_id)
    values ('+' || ltrim(new.phone, '+'), new.id)
    on conflict (phone) do update set user_id = excluded.user_id
      where public.customers.user_id is null;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_phone_confirmed
  after insert or update of phone, phone_confirmed_at on auth.users
  for each row execute function public.link_customer_to_user();

-- ─── Discount codes ───────────────────────────────────────────────────────

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{3,24}$'),
  description text not null default '',
  kind public.discount_kind not null,
  -- Percent (20 = 20%) or cents off.
  value integer not null check (value > 0),
  min_subtotal_cents public.cents not null default 0,
  max_discount_cents integer check (max_discount_cents > 0),
  -- Counts the phone number's earlier orders (cancelled ones don't count).
  first_order_only boolean not null default false,
  usage_limit integer check (usage_limit > 0),
  usage_limit_per_customer integer check (usage_limit_per_customer > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100),
  check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create trigger discount_codes_updated_at before update on public.discount_codes
  for each row execute function public.set_updated_at();
create trigger discount_codes_audit after insert or update or delete on public.discount_codes
  for each row execute function public.audit_row();

-- ─── Orders ───────────────────────────────────────────────────────────────

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Shown to people as TSS-1001.
  number bigint not null unique default nextval('public.order_number_seq'),
  -- The unguessable part of the customer's order-status link.
  public_token uuid not null unique default gen_random_uuid(),
  -- One per checkout attempt: a retried submit returns the same order.
  idempotency_key uuid not null unique,
  branch_id uuid not null references public.branches (id),
  customer_id uuid not null references public.customers (id),
  status public.order_status not null default 'received',
  fulfilment public.fulfilment not null,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  locale public.locale not null default 'en',
  -- As the customer entered them for this order.
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_phone public.e164_phone not null,
  delivery_zone_id uuid references public.delivery_zones (id),
  delivery_zone_name_en text,
  delivery_zone_name_ar text,
  address_street text check (char_length(address_street) <= 160),
  address_floor text check (char_length(address_floor) <= 80),
  delivery_note text check (char_length(delivery_note) <= 140),
  subtotal_cents public.cents not null,
  discount_cents public.cents not null default 0,
  delivery_fee_cents public.cents not null default 0,
  total_cents integer generated always as (subtotal_cents - discount_cents + delivery_fee_cents) stored,
  -- The total the customer was shown at checkout. It differs from total_cents
  -- only if prices changed while they ordered; staff settle that with them.
  quoted_total_cents public.cents,
  discount_code_id uuid references public.discount_codes (id),
  discount_code text,
  eta_min_minutes smallint not null,
  eta_max_minutes smallint not null,
  source text not null default 'web' check (source in ('web', 'admin', 'whatsapp')),
  cancel_reason text check (char_length(cancel_reason) <= 200),
  -- Tracking: the browser's visitor and visit ids (to join the order to its
  -- visits for attribution) and what the Meta Conversions API needs.
  visitor_id text check (char_length(visitor_id) <= 64),
  visit_id text check (char_length(visit_id) <= 64),
  fbp text check (char_length(fbp) <= 120),
  fbc text check (char_length(fbc) <= 500),
  client_ip text check (char_length(client_ip) <= 64),
  client_user_agent text check (char_length(client_user_agent) <= 500),
  -- When the Purchase reached Meta.
  meta_relayed_at timestamptz,
  placed_at timestamptz not null default now(),
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  check (discount_cents <= subtotal_cents),
  check (eta_min_minutes <= eta_max_minutes),
  check ((fulfilment = 'delivery') = (payment_method = 'cash_on_delivery')),
  check (fulfilment = 'pickup' or (delivery_zone_name_en is not null and address_street is not null)),
  check ((discount_code is null) = (discount_cents = 0))
);

create index orders_branch_status_idx on public.orders (branch_id, status, placed_at desc);
create index orders_customer_idx on public.orders (customer_id, placed_at desc);
create index orders_placed_at_idx on public.orders (placed_at desc);
create index orders_discount_code_idx on public.orders (discount_code_id) where discount_code_id is not null;
create index orders_visitor_idx on public.orders (visitor_id) where visitor_id is not null;
create index orders_meta_pending_idx on public.orders (placed_at) where meta_relayed_at is null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  position smallint not null,
  -- Kept even if the product is later deleted; the names below are the snapshot.
  product_id uuid references public.products (id) on delete set null,
  product_slug text not null,
  name_en text not null,
  name_ar text not null,
  base_price_cents public.cents not null,
  unit_price_cents public.cents not null,
  quantity smallint not null check (quantity between 1 and 50),
  line_total_cents integer generated always as (unit_price_cents * quantity) stored,
  note text not null default '' check (char_length(note) <= 140),
  unique (order_id, position),
  check (unit_price_cents >= base_price_cents)
);

-- The line's choices as the customer saw them. For a bundle: one row per
-- slot pick (group_key = the slot, option_key = the item's slug, price = the
-- surcharge), then the picked item's own choices (group_key "slot/group").
create table public.order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  option_id uuid references public.options (id) on delete set null,
  group_key text not null,
  option_key text not null,
  group_name_en text not null,
  group_name_ar text not null,
  option_name_en text not null,
  option_name_ar text not null,
  price_cents public.cents not null
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_slug);
create index order_item_options_item_idx on public.order_item_options (order_item_id);

-- Status moves forward only: received → preparing → ready (pickup) or
-- out_for_delivery (delivery) → completed. Cancelling works until completed.
-- Each step's time is kept on the order; who made it is in the audit log.
create function public.order_status_rank(s public.order_status) returns int
language sql immutable set search_path = '' as $$
  select case s
    when 'received' then 0 when 'preparing' then 1
    when 'ready' then 2 when 'out_for_delivery' then 2
    when 'completed' then 3 when 'cancelled' then 4
  end;
$$;

create function public.guard_order_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if old.status in ('completed', 'cancelled') then
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

create trigger orders_guard before update on public.orders
  for each row execute function public.guard_order_update();
create trigger orders_audit after update on public.orders
  for each row execute function public.audit_row();

-- ─── Notifications ────────────────────────────────────────────────────────
-- An outbox: rows are queued in the same transaction as the order, then a
-- worker sends them (WhatsApp Cloud API) and records the result.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  kind text not null check (kind in ('new_order_alert')),
  recipient public.e164_phone not null,
  template text not null,
  payload jsonb not null default '{}',
  status public.notification_status not null default 'queued',
  attempts smallint not null default 0,
  last_error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index notifications_pending_idx on public.notifications (created_at)
  where status in ('queued', 'failed');

-- ─── Site settings ────────────────────────────────────────────────────────
-- Content the admin edits without a deploy, one JSON value per key:
-- home_ticker ({ enabled, phrases: [{ en, ar }] }) and welcome_popup. The
-- website validates every value and falls back to its built-in copy.

create table public.site_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,62}$'),
  value jsonb not null,
  -- Public rows are readable with the publishable key; the rest by staff only.
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger site_settings_audit after insert or update or delete on public.site_settings
  for each row execute function public.audit_row('key');

-- ─── Placing an order ─────────────────────────────────────────────────────

/**
 * Checks a discount code for the website: when the customer applies it, and
 * again with their phone number just before the order is sent. Returns the
 * rule to price with, { ok: true, code, kind, value, min_subtotal_cents,
 * max_discount_cents }, or { ok: false, error } where error is invalid,
 * expired, minimum (with short_by_cents), first_order or used_up. Without a
 * phone number the first-order and per-customer limits aren't checked yet.
 * Uses are counted from orders; cancelled orders give their use back.
 */
create function public.check_discount_code(p_code text, p_subtotal_cents integer, p_phone text default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_code public.discount_codes;
  v_customer uuid;
begin
  select * into v_code from public.discount_codes d
  where d.code = upper(trim(p_code)) and d.is_active;
  if not found or (v_code.starts_at is not null and now() < v_code.starts_at) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_code.ends_at is not null and now() > v_code.ends_at then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if p_subtotal_cents < v_code.min_subtotal_cents then
    return jsonb_build_object('ok', false, 'error', 'minimum',
      'short_by_cents', v_code.min_subtotal_cents - p_subtotal_cents);
  end if;
  if v_code.usage_limit is not null and (
    select count(*) from public.orders o
    where o.discount_code_id = v_code.id and o.status <> 'cancelled'
  ) >= v_code.usage_limit then
    return jsonb_build_object('ok', false, 'error', 'used_up');
  end if;

  select c.id into v_customer from public.customers c where c.phone = p_phone;
  if v_customer is not null then
    if v_code.first_order_only and exists (
      select 1 from public.orders o where o.customer_id = v_customer and o.status <> 'cancelled'
    ) then
      return jsonb_build_object('ok', false, 'error', 'first_order');
    end if;
    if v_code.usage_limit_per_customer is not null and (
      select count(*) from public.orders o
      where o.discount_code_id = v_code.id and o.customer_id = v_customer and o.status <> 'cancelled'
    ) >= v_code.usage_limit_per_customer then
      return jsonb_build_object('ok', false, 'error', 'used_up');
    end if;
  end if;

  return jsonb_build_object('ok', true, 'code', v_code.code, 'kind', v_code.kind, 'value', v_code.value,
    'min_subtotal_cents', v_code.min_subtotal_cents, 'max_discount_cents', v_code.max_discount_cents);
end;
$$;

/**
 * Saves an order exactly as the website priced it, in one transaction.
 *
 * The website's server calls this with the secret key once it has checked
 * the order (opening hours, items and choices, the code with
 * check_discount_code). Nothing here re-prices or refuses the order: staff
 * check every order before starting it, so if the website and the database
 * ever disagree, the order still arrives and staff talk it through with the
 * customer. Products, options, the delivery area and the code are linked
 * when they exist here; names and prices are always the snapshot the
 * customer saw, and quoted_total_cents is the total they were shown.
 *
 * payload: { idempotency_key, branch, locale, fulfilment, name, phone,
 *   zone?: { slug, name_en, name_ar }, street?, floor?, delivery_note?,
 *   discount_code?, discount_cents, delivery_fee_cents, quoted_total_cents,
 *   tracking?: { visitor_id, visit_id, fbp, fbc, ip, user_agent },
 *   lines: [{ product, name_en, name_ar, base_price_cents, quantity, note?,
 *     options: [{ group, group_name_en, group_name_ar, option, name_en, name_ar, price_cents }] }] }
 */
create function public.create_order(payload jsonb)
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
    delivery_zone_id, delivery_zone_name_en, delivery_zone_name_ar,
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
      select z.id from public.delivery_zones z
      where z.branch_id = v_branch.id and z.slug = payload #>> '{zone,slug}'
    ) end,
    case when v_delivery then payload #>> '{zone,name_en}' end,
    case when v_delivery then payload #>> '{zone,name_ar}' end,
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

  if v_branch.alert_phone is not null then
    insert into public.notifications (order_id, kind, recipient, template, payload)
    values (v_order, 'new_order_alert', v_branch.alert_phone, 'new_order_alert', jsonb_build_object('order_id', v_order));
  end if;

  return query
    select o.id, o.number, o.public_token, o.total_cents, false
    from public.orders o where o.id = v_order;
end;
$$;

/**
 * The order-status page's view of one order, found by the token in its link.
 * Returns only what that page shows; no access to the orders table needed.
 */
create function public.get_order_status(token uuid) returns jsonb
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
    'zone_en', o.delivery_zone_name_en,
    'zone_ar', o.delivery_zone_name_ar,
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

-- ─── Access ───────────────────────────────────────────────────────────────
-- Row level security on every table. The website's server uses the secret
-- key (bypasses RLS) only through create_order and check_discount_code;
-- browsers use the publishable key and see the menu, public settings, their
-- own orders and profile, and nothing else. Staff sign in to the admin and
-- get what their role allows.

alter table public.audit_log enable row level security;
alter table public.staff enable row level security;
alter table public.branches enable row level security;
alter table public.branch_hours enable row level security;
alter table public.branch_closures enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.customers enable row level security;
alter table public.discount_codes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_options enable row level security;
alter table public.notifications enable row level security;
alter table public.site_settings enable row level security;

-- Audit log: managers read it; only the trigger writes it.
create policy "Managers read the audit log" on public.audit_log
  for select to authenticated using ((select public.is_staff('manager')));

-- Staff: everyone sees their own row; owners manage the team.
create policy "Staff see themselves; owners see everyone" on public.staff
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff('owner')));
create policy "Owners manage staff" on public.staff
  for all to authenticated
  using ((select public.is_staff('owner'))) with check ((select public.is_staff('owner')));
-- Their own display name only: guard_staff_change stops anyone changing their own role or access.
create policy "Staff rename themselves" on public.staff
  for update to authenticated
  using (user_id = (select auth.uid()) and is_active)
  with check (user_id = (select auth.uid()));

-- Menu, branches, hours and zones: public reads (live items only), managers
-- edit. Staff mark items and options sold out (the column grants below
-- limit them to that).
create policy "Anyone reads branches" on public.branches for select to anon, authenticated using (true);
create policy "Anyone reads hours" on public.branch_hours for select to anon, authenticated using (true);
create policy "Anyone reads closures" on public.branch_closures for select to anon, authenticated using (true);
create policy "Anyone reads live zones" on public.delivery_zones for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy "Anyone reads live categories" on public.categories for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy "Anyone reads live products" on public.products for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy "Anyone reads option groups" on public.option_groups for select to anon, authenticated using (true);
create policy "Anyone reads options" on public.options for select to anon, authenticated using (true);
create policy "Anyone reads product options" on public.product_option_groups for select to anon, authenticated using (true);

create policy "Managers edit branches" on public.branches for all to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));
create policy "Managers edit hours" on public.branch_hours for all to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));
create policy "Managers edit closures" on public.branch_closures for all to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));
create policy "Managers edit zones" on public.delivery_zones for all to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));
create policy "Managers edit categories" on public.categories for all to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));
create policy "Staff edit products" on public.products for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "Managers add products" on public.products for insert to authenticated
  with check ((select public.is_staff('manager')));
create policy "Managers delete products" on public.products for delete to authenticated
  using ((select public.is_staff('manager')));
create policy "Managers edit option groups" on public.option_groups for all to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));
create policy "Staff edit options" on public.options for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "Managers add options" on public.options for insert to authenticated
  with check ((select public.is_staff('manager')));
create policy "Managers delete options" on public.options for delete to authenticated
  using ((select public.is_staff('manager')));
create policy "Managers edit product options" on public.product_option_groups for all to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));

-- Staff below manager may only flip availability on products and options.
create function public.guard_menu_staff_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not public.is_staff('manager')
    and (to_jsonb(new) - 'is_available' - 'updated_at') is distinct from (to_jsonb(old) - 'is_available' - 'updated_at') then
    raise exception '%: staff can only mark items available or sold out', tg_table_name using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger products_staff_guard before update on public.products
  for each row execute function public.guard_menu_staff_update();
create trigger options_staff_guard before update on public.options
  for each row execute function public.guard_menu_staff_update();

-- Customers: their own profile; staff see everyone.
create policy "Customers see themselves; staff see all" on public.customers
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy "Customers edit their profile" on public.customers
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff('manager')))
  with check (user_id = (select auth.uid()) or (select public.is_staff('manager')));

-- Orders: customers read their own; staff read all and move them along.
create policy "Customers see their orders; staff see all" on public.orders
  for select to authenticated
  using (
    customer_id in (select c.id from public.customers c where c.user_id = (select auth.uid()))
    or (select public.is_staff())
  );
create policy "Staff update orders" on public.orders
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "Order lines follow their order" on public.order_items
  for select to authenticated
  using (order_id in (select o.id from public.orders o));
create policy "Line options follow their order" on public.order_item_options
  for select to authenticated
  using (order_item_id in (select i.id from public.order_items i));

-- Codes and the outbox are staff-only.
create policy "Staff read codes" on public.discount_codes
  for select to authenticated using ((select public.is_staff()));
create policy "Managers edit codes" on public.discount_codes
  for all to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));
create policy "Managers read notifications" on public.notifications
  for select to authenticated using ((select public.is_staff('manager')));

-- Site settings: the website reads public rows; managers edit.
create policy "Anyone reads public settings" on public.site_settings
  for select to anon, authenticated using (is_public or (select public.is_staff('manager')));
create policy "Managers edit settings" on public.site_settings
  for all to authenticated
  using ((select public.is_staff('manager'))) with check ((select public.is_staff('manager')));

-- Data API access. Some projects expose new tables to the API roles by
-- default and newer ones don't, so start from nothing and grant exactly what
-- each role needs; the policies above still decide which rows.
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on public.staff, public.branches, public.branch_hours, public.branch_closures,
  public.delivery_zones, public.categories, public.products, public.option_groups, public.options,
  public.product_option_groups, public.discount_codes, public.site_settings
  to authenticated;
-- Customers change only their profile; staff move orders along.
grant update (name, email, preferred_locale, marketing_opt_in_at) on public.customers to authenticated;
grant update (status, payment_status, cancel_reason) on public.orders to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Functions: only the server places orders and checks codes (a code's answer
-- can reveal whether a phone number has ordered before); anyone with a status
-- link can read it.
revoke execute on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;
revoke execute on function public.check_discount_code(text, integer, text) from public, anon, authenticated;
grant execute on function public.check_discount_code(text, integer, text) to service_role;
revoke execute on function public.get_order_status(uuid) from public;
grant execute on function public.get_order_status(uuid) to anon, authenticated, service_role;
revoke execute on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated, service_role;

-- ─── Storage and realtime ─────────────────────────────────────────────────

-- Menu photos: public to read, managers upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu', 'menu', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do nothing;

create policy "Managers upload menu photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menu' and (select public.is_staff('manager')));
create policy "Managers replace menu photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'menu' and (select public.is_staff('manager')));
create policy "Managers delete menu photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'menu' and (select public.is_staff('manager')));

-- Live updates for the admin's order board and the customer's status page.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
