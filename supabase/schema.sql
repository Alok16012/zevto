-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — Supabase schema
-- Paste the whole file into Supabase → SQL Editor → Run. Safe to run again.
--
-- Roles live in auth app_metadata (only the server can set them):
--   super_admin · admin · technician · customer (default for sign-ups)
-- Anything involving money, prices or job status goes through the
-- SECURITY DEFINER functions below, so the apps can't fake totals,
-- coupons, wallet balances or start codes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────── Role helpers ───────────────────────────

create or replace function public.app_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'customer')
$$;

create or replace function public.is_staff() returns boolean
language sql stable as $$ select public.app_role() in ('super_admin', 'admin') $$;

create or replace function public.is_technician() returns boolean
language sql stable as $$ select public.app_role() = 'technician' $$;

-- ─────────────────────────── Unique IDs ───────────────────────────
-- One series per role: CUS-100101, TEC-200101, DLR-300101, ADM-900101.

create sequence if not exists public.customer_code_seq   start 100101;
create sequence if not exists public.technician_code_seq start 200101;
create sequence if not exists public.dealer_code_seq     start 300101;
create sequence if not exists public.admin_code_seq      start 900101;
create sequence if not exists public.order_ref_seq       start 1001;
create sequence if not exists public.service_ref_seq     start 1001;

create or replace function public.next_code(p_role text) returns text
language sql volatile as $$
  select case p_role
    when 'technician'  then 'TEC-' || nextval('public.technician_code_seq')
    when 'dealer'      then 'DLR-' || nextval('public.dealer_code_seq')
    when 'admin'       then 'ADM-' || nextval('public.admin_code_seq')
    when 'super_admin' then 'ADM-' || nextval('public.admin_code_seq')
    else                    'CUS-' || nextval('public.customer_code_seq')
  end
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

-- ─────────────────────────── Catalogue ───────────────────────────

create table if not exists public.products (
  id            text primary key,
  name          text not null,
  spec          text not null default '',
  price         integer not null check (price >= 0),
  mrp           integer not null check (mrp >= 0),
  category      text not null check (category in ('domestic', 'commercial', 'spare')),
  art           text not null default 'classic',
  stages        text not null default '',
  warranty      text not null default '',
  description   text not null default '',
  -- null = stock isn't tracked for this product
  stock         integer check (stock is null or stock >= 0),
  rating        numeric(2,1) not null default 0,
  reviews_count integer not null default 0,
  active        boolean not null default true,
  sort          integer not null default 0,
  updated_at    timestamptz not null default now(),
  check (price <= mrp)
);

create table if not exists public.service_catalog (
  type       text primary key,
  tagline    text not null default '',
  price      integer not null check (price >= 0),
  price_note text not null default '',
  duration   text not null default '',
  includes   text[] not null default '{}',
  active     boolean not null default true,
  sort       integer not null default 0
);

create table if not exists public.coupons (
  code       text primary key check (code ~ '^[A-Z0-9]{4,12}$'),
  title      text not null,
  descr      text not null default '',
  kind       text not null check (kind in ('flat', 'percent')),
  value      integer not null check (value > 0),
  max_off    integer,
  min_order  integer not null default 0,
  applies_to text not null check (applies_to in ('product', 'service', 'all')),
  expires    date not null,
  active     boolean not null default true,
  used       integer not null default 0,
  created_at timestamptz not null default now(),
  check (kind = 'flat' or value <= 50)
);

create table if not exists public.parts (
  id     text primary key,
  name   text not null,
  price  integer not null check (price >= 0),
  active boolean not null default true
);

-- ─────────────────────────── People ───────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'customer' check (role in ('customer', 'technician', 'admin', 'super_admin')),
  code        text not null unique,
  full_name   text not null default '',
  email       text,
  phone       text,
  gender      text not null default '' check (gender in ('', 'Male', 'Female', 'Other')),
  dob         date,
  -- Customer code of whoever referred them (entered at sign-up).
  referred_by text,
  notif_prefs jsonb not null default '{"push": true, "sms": true, "whatsapp": false, "offers": true}',
  blocked     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);

create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label      text not null default 'Home' check (label in ('Home', 'Office', 'Other')),
  line       text not null check (length(line) >= 8),
  pincode    text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  lat        double precision,
  lng        double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);

create table if not exists public.dealers (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique default public.next_code('dealer'),
  name       text not null,
  owner      text not null default '',
  phone      text not null default '',
  city       text not null default '',
  pincodes   text[] not null default '{}',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.technicians (
  id         uuid primary key references public.profiles (id) on delete cascade,
  code       text not null unique,
  name       text not null,
  phone      text not null default '',
  email      text,
  dealer_id  uuid references public.dealers (id) on delete set null,
  -- Primary pincode first, then the nearby ones they cover.
  pincodes   text[] not null default '{}',
  skills     text[] not null default '{}',
  languages  text not null default '',
  years      integer not null default 0,
  rating     numeric(2,1) not null default 0,
  jobs_done  integer not null default 0,
  kyc        text not null default 'Pending' check (kyc in ('Pending', 'Verified')),
  active     boolean not null default false,
  status     text not null default 'Offline' check (status in ('Online', 'Offline', 'On job')),
  photo_url  text,
  created_at timestamptz not null default now()
);
create index if not exists technicians_pincodes_idx on public.technicians using gin (pincodes);

-- Every new auth user gets a profile with their unique ID.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_app_meta_data ->> 'role', 'customer');
begin
  if v_role not in ('customer', 'technician', 'admin', 'super_admin') then v_role := 'customer'; end if;
  insert into public.profiles (id, role, code, full_name, email, phone, referred_by)
  values (
    new.id, v_role, public.next_code(v_role),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(upper(new.raw_user_meta_data ->> 'referred_by'), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Supabase sets app_metadata (the role) just after inserting the user, so keep
-- the profile's role — and its ID series — in step when the role arrives.
create or replace function public.sync_user_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_app_meta_data ->> 'role', 'customer');
  v_prefix text;
begin
  if v_role not in ('customer', 'technician', 'admin', 'super_admin') then return new; end if;
  v_prefix := case v_role when 'technician' then 'TEC' when 'customer' then 'CUS' else 'ADM' end;
  update public.profiles p
     set role = v_role,
         code = case when p.code like v_prefix || '-%' then p.code else public.next_code(v_role) end
   where p.id = new.id and p.role <> v_role;
  return new;
end $$;

drop trigger if exists on_auth_user_role on auth.users;
create trigger on_auth_user_role after update of raw_app_meta_data on auth.users
  for each row when (old.raw_app_meta_data ->> 'role' is distinct from new.raw_app_meta_data ->> 'role')
  execute function public.sync_user_role();

-- Users may edit their own profile, but never their role, ID or block status.
create or replace function public.guard_profile() returns trigger
language plpgsql as $$
begin
  -- current_user is 'authenticated' for edits straight from the apps; trusted
  -- functions and the server run as the table owner and pass through.
  if current_user in ('authenticated', 'anon') and not public.is_staff() and (
    new.role is distinct from old.role or new.code is distinct from old.code or new.email is distinct from old.email or
    new.blocked is distinct from old.blocked or new.referred_by is distinct from old.referred_by
  ) then
    raise exception 'Not allowed to change these profile fields';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles for each row execute function public.guard_profile();

-- Technicians may change their pincodes, status and photo — not KYC, rating or dealer.
create or replace function public.guard_technician() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_staff() and (
    new.code is distinct from old.code or new.kyc is distinct from old.kyc or new.active is distinct from old.active or
    new.rating is distinct from old.rating or new.jobs_done is distinct from old.jobs_done or
    new.dealer_id is distinct from old.dealer_id or new.name is distinct from old.name
  ) then
    raise exception 'Not allowed to change these technician fields';
  end if;
  if exists (select 1 from unnest(new.pincodes) p where p !~ '^[1-9][0-9]{5}$') then
    raise exception 'Invalid pincode';
  end if;
  if new.photo_url is not null and new.photo_url !~ '^https://[^"''<> ]+$' then
    raise exception 'Invalid photo link';
  end if;
  return new;
end $$;
drop trigger if exists guard_technician on public.technicians;
create trigger guard_technician before update on public.technicians for each row execute function public.guard_technician();

-- Only one default address per customer.
create or replace function public.single_default_address() returns trigger
language plpgsql as $$
begin
  if new.is_default then
    update public.addresses set is_default = false where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;
drop trigger if exists single_default_address on public.addresses;
create trigger single_default_address after insert or update of is_default on public.addresses
  for each row when (new.is_default) execute function public.single_default_address();

-- ─────────────────────────── Orders ───────────────────────────

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique default ('ZVT' || nextval('public.order_ref_seq')),
  customer_id    uuid not null references public.profiles (id) on delete cascade,
  -- [{ "id": "classic", "name": "...", "qty": 1, "price": 12999, "mrp": 15999 }]
  items          jsonb not null,
  title          text not null,
  art            text not null default 'classic',
  mrp_total      integer not null,
  subtotal       integer not null,
  coupon         text,
  discount       integer not null default 0,
  wallet_used    integer not null default 0,
  amount         integer not null,
  payment        text not null check (payment in ('Online', 'COD', 'Wallet')),
  payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Paid', 'Refunded')),
  status         text not null default 'Placed' check (status in ('Placed', 'Shipped', 'Delivered', 'Cancelled')),
  address        text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_customer_idx on public.orders (customer_id, created_at desc);
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- ─────────────────────────── Service jobs ───────────────────────────

create table if not exists public.service_requests (
  id                uuid primary key default gen_random_uuid(),
  ref               text not null unique default ('SRV' || nextval('public.service_ref_seq')),
  -- Null for tasks a technician raised for someone without the app.
  customer_id       uuid references public.profiles (id) on delete set null,
  customer_name     text not null,
  customer_phone    text not null default '',
  address           text not null,
  pincode           text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  lat               double precision,
  lng               double precision,
  type              text not null references public.service_catalog (type),
  product           text not null,
  visit_date        date not null,
  slot              text not null,
  description       text not null default '',
  -- Paths in the private "ro-photos" storage bucket.
  photos            text[] not null default '{}',
  price             integer not null default 0,
  coupon            text,
  discount          integer not null default 0,
  amount            integer not null default 0,
  status            text not null default 'Requested' check (status in
                      ('Requested', 'With ops', 'Assigned', 'On the way', 'Arrived', 'In Progress', 'Completed', 'Rescheduled', 'Cancelled')),
  -- The technician the customer picked; they accept or decline.
  preferred_tech_id uuid references public.technicians (id) on delete set null,
  tech_id           uuid references public.technicians (id) on delete set null,
  source            text not null default 'customer' check (source in ('customer', 'technician')),
  raised_by         uuid references public.technicians (id) on delete set null,
  note              text,
  reschedule_reason text,
  checklist         text[] not null default '{}',
  tds_before        text not null default '',
  tds_after         text not null default '',
  -- [{ "id": "sed", "qty": 1 }]
  parts             jsonb not null default '[]',
  tech_notes        text not null default '',
  payment           text check (payment in ('Cash', 'UPI', 'AMC covered')),
  rating            integer check (rating between 1 and 5),
  rating_tags       text[] not null default '{}',
  rating_comment    text not null default '',
  assigned_at       timestamptz,
  trip_started_at   timestamptz,
  arrived_at        timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  rated_at          timestamptz,
  eta_min           integer,
  distance_km       numeric(6,2),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists sr_customer_idx on public.service_requests (customer_id, created_at desc);
create index if not exists sr_tech_idx on public.service_requests (tech_id, visit_date);
create index if not exists sr_pref_idx on public.service_requests (preferred_tech_id) where status = 'Requested';
drop trigger if exists sr_touch on public.service_requests;
create trigger sr_touch before update on public.service_requests for each row execute function public.touch_updated_at();

-- Start codes live apart so technicians can never read them.
create table if not exists public.service_otps (
  request_id uuid primary key references public.service_requests (id) on delete cascade,
  otp        text not null
);

-- Live technician position — written only while a ride is on.
create table if not exists public.tech_locations (
  tech_id    uuid primary key references public.technicians (id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  accuracy   double precision,
  heading    double precision,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────── Reviews, wallet, notifications, chat ───────────────────────────

create table if not exists public.reviews (
  id                 uuid primary key default gen_random_uuid(),
  product_id         text references public.products (id) on delete cascade,
  tech_id            uuid references public.technicians (id) on delete cascade,
  service_request_id uuid references public.service_requests (id) on delete set null,
  author_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  author_name        text not null,
  stars              integer not null check (stars between 1 and 5),
  body               text not null default '',
  status             text not null default 'Published' check (status in ('Published', 'Hidden', 'Flagged')),
  created_at         timestamptz not null default now(),
  check ((product_id is null) <> (tech_id is null))
);
create unique index if not exists reviews_one_per_product on public.reviews (author_id, product_id) where product_id is not null;
create index if not exists reviews_tech_idx on public.reviews (tech_id);

create table if not exists public.wallet_txns (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  -- Positive = credit, negative = debit (rupees).
  amount     integer not null check (amount <> 0),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists wallet_user_idx on public.wallet_txns (user_id, created_at desc);

create table if not exists public.referral_rewards (
  referee_id  uuid primary key references public.profiles (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  amount      integer not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('order', 'service', 'offer', 'wallet')),
  title      text not null,
  body       text not null default '',
  -- e.g. {"k": "order", "id": "<uuid>"} — where tapping it goes.
  link       jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  sender      text not null check (sender in ('customer', 'agent')),
  agent_id    uuid references public.profiles (id) on delete set null,
  body        text not null default '',
  image_path  text,
  created_at  timestamptz not null default now()
);
create index if not exists chat_customer_idx on public.chat_messages (customer_id, created_at);

create table if not exists public.broadcasts (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  audience   text not null check (audience in ('All customers', 'AMC active', 'No AMC', 'Technicians')),
  channels   text[] not null default '{Push}',
  reach      integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ─────────────────────────── Technician stock & payouts ───────────────────────────

create table if not exists public.tech_stock (
  tech_id uuid not null references public.technicians (id) on delete cascade,
  part_id text not null references public.parts (id) on delete cascade,
  qty     integer not null default 0 check (qty >= 0),
  primary key (tech_id, part_id)
);

create table if not exists public.stock_requests (
  id         uuid primary key default gen_random_uuid(),
  tech_id    uuid not null default auth.uid() references public.technicians (id) on delete cascade,
  -- {"sed": 4, "mem": 1}
  items      jsonb not null,
  status     text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id         uuid primary key default gen_random_uuid(),
  tech_id    uuid not null references public.technicians (id) on delete cascade,
  period     text not null,
  amount     integer not null,
  status     text not null default 'Paid' check (status in ('Pending', 'Paid')),
  paid_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════ Business rules (server-side) ═══════════════════════════

create or replace function public.notify_user(p_user uuid, p_kind text, p_title text, p_body text, p_link jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, link)
  select p_user, p_kind, p_title, p_body, p_link where p_user is not null
$$;
revoke execute on function public.notify_user(uuid, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.wallet_balance(p_user uuid default auth.uid()) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::integer from public.wallet_txns
  where user_id = p_user and (p_user = auth.uid() or public.is_staff())
$$;

-- Discount a coupon gives on an amount, or an error message.
create or replace function public.coupon_discount(p_code text, p_amount integer, p_on text, out discount integer, out error text)
language plpgsql stable security definer set search_path = public as $$
declare c public.coupons;
begin
  discount := 0;
  select * into c from public.coupons where code = upper(trim(p_code)) and active;
  if not found then error := 'That code doesn''t exist'; return; end if;
  if c.expires < current_date then error := 'This coupon has expired'; return; end if;
  if c.applies_to <> 'all' and c.applies_to <> p_on then
    error := 'Valid on ' || case c.applies_to when 'product' then 'product orders' else 'service bookings' end || ' only'; return;
  end if;
  if p_amount < c.min_order then error := 'Add ₹' || (c.min_order - p_amount) || ' more to use this'; return; end if;
  discount := case c.kind when 'flat' then c.value else round(p_amount * c.value / 100.0)::integer end;
  if c.max_off is not null then discount := least(discount, c.max_off); end if;
  discount := least(discount, p_amount);
end $$;

-- Checkout: prices, stock, coupon and wallet are all worked out here.
create or replace function public.place_order(p_items jsonb, p_coupon text, p_use_wallet boolean, p_payment text, p_address_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_line jsonb;
  v_p public.products;
  v_qty integer;
  v_items jsonb := '[]';
  v_sub integer := 0;
  v_mrp integer := 0;
  v_disc integer := 0;
  v_err text;
  v_wallet integer := 0;
  v_addr public.addresses;
  v_first text;
  v_art text;
  v_count integer := 0;
  v_order public.orders;
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  if exists (select 1 from public.profiles where id = v_uid and blocked) then raise exception 'Your account is blocked. Contact support.'; end if;
  if p_payment not in ('Online', 'COD') then raise exception 'Choose a payment method'; end if;
  select * into v_addr from public.addresses where id = p_address_id and user_id = v_uid;
  if not found then raise exception 'Choose a delivery address'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Your cart is empty'; end if;

  for v_line in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_line ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 9 then raise exception 'Invalid quantity'; end if;
    select * into v_p from public.products where id = v_line ->> 'id' and active for update;
    if not found then raise exception 'A product in your cart is no longer available'; end if;
    if v_p.stock is not null then
      if v_p.stock < v_qty then raise exception '% has only % left in stock', v_p.name, v_p.stock; end if;
      update public.products set stock = stock - v_qty where id = v_p.id;
    end if;
    v_sub := v_sub + v_p.price * v_qty;
    v_mrp := v_mrp + v_p.mrp * v_qty;
    v_items := v_items || jsonb_build_object('id', v_p.id, 'name', v_p.name, 'qty', v_qty, 'price', v_p.price, 'mrp', v_p.mrp, 'art', v_p.art);
    v_count := v_count + 1;
    if v_first is null then v_first := v_p.name; v_art := v_p.art; end if;
  end loop;

  if coalesce(trim(p_coupon), '') <> '' then
    select discount, error into v_disc, v_err from public.coupon_discount(p_coupon, v_sub, 'product');
    if v_err is not null then raise exception '%', v_err; end if;
    update public.coupons set used = used + 1 where code = upper(trim(p_coupon));
  end if;

  if p_use_wallet then
    v_wallet := least(greatest(public.wallet_balance(v_uid), 0), v_sub - v_disc);
  end if;

  insert into public.orders (customer_id, items, title, art, mrp_total, subtotal, coupon, discount, wallet_used, amount, payment, payment_status, address)
  values (
    v_uid, v_items,
    case when v_count > 1 then v_first || ' + ' || (v_count - 1) || ' more' else v_first end,
    v_art, v_mrp, v_sub, nullif(upper(trim(p_coupon)), ''), v_disc, v_wallet, v_sub - v_disc - v_wallet,
    case when v_sub - v_disc - v_wallet = 0 then 'Wallet' else p_payment end,
    case when v_sub - v_disc - v_wallet = 0 then 'Paid' else 'Pending' end,
    v_addr.label || ' · ' || v_addr.line || ' ' || v_addr.pincode
  ) returning * into v_order;

  if v_wallet > 0 then
    insert into public.wallet_txns (user_id, title, amount) values (v_uid, 'Paid for order #' || v_order.ref, -v_wallet);
  end if;
  return v_order;
end $$;

-- Book a service. The customer may pick a technician who serves their pincode.
create or replace function public.book_service(
  p_type text, p_product text, p_date date, p_slot text, p_description text,
  p_address_id uuid, p_coupon text, p_photos text[], p_preferred_tech uuid
) returns public.service_requests language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prof public.profiles;
  v_addr public.addresses;
  v_svc public.service_catalog;
  v_disc integer := 0;
  v_err text;
  v_req public.service_requests;
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  select * into v_prof from public.profiles where id = v_uid;
  if v_prof.blocked then raise exception 'Your account is blocked. Contact support.'; end if;
  select * into v_svc from public.service_catalog where type = p_type and active;
  if not found then raise exception 'Unknown service'; end if;
  select * into v_addr from public.addresses where id = p_address_id and user_id = v_uid;
  if not found then raise exception 'Choose a service address'; end if;
  if p_date < current_date then raise exception 'Pick a date from today onwards'; end if;
  if coalesce(trim(p_slot), '') = '' or coalesce(trim(p_product), '') = '' then raise exception 'Choose a product and a time slot'; end if;
  if coalesce(array_length(p_photos, 1), 0) > 4 then raise exception 'Up to 4 photos'; end if;
  if exists (select 1 from unnest(coalesce(p_photos, '{}')) ph where split_part(ph, '/', 1) <> v_uid::text) then
    raise exception 'Invalid photo';
  end if;
  if p_preferred_tech is not null and not exists (
    select 1 from public.technicians t
    where t.id = p_preferred_tech and t.active and t.kyc = 'Verified' and v_addr.pincode = any (t.pincodes)
  ) then
    raise exception 'That technician doesn''t serve pincode %', v_addr.pincode;
  end if;

  if coalesce(trim(p_coupon), '') <> '' and v_svc.price > 0 then
    select discount, error into v_disc, v_err from public.coupon_discount(p_coupon, v_svc.price, 'service');
    if v_err is not null then raise exception '%', v_err; end if;
    update public.coupons set used = used + 1 where code = upper(trim(p_coupon));
  end if;

  insert into public.service_requests (
    customer_id, customer_name, customer_phone, address, pincode, lat, lng, type, product, visit_date, slot,
    description, photos, price, coupon, discount, amount, preferred_tech_id
  ) values (
    v_uid, coalesce(nullif(v_prof.full_name, ''), 'Customer'), coalesce(v_prof.phone, ''),
    v_addr.label || ' · ' || v_addr.line || ' ' || v_addr.pincode, v_addr.pincode, v_addr.lat, v_addr.lng,
    p_type, trim(p_product), p_date, p_slot, coalesce(trim(p_description), ''), coalesce(p_photos, '{}'),
    v_svc.price, case when v_disc > 0 then upper(trim(p_coupon)) end, v_disc, v_svc.price - v_disc, p_preferred_tech
  ) returning * into v_req;

  insert into public.service_otps (request_id, otp) values (v_req.id, lpad((floor(random() * 9000) + 1000)::text, 4, '0'));
  return v_req;
end $$;

-- Customer: the start code for one of their own jobs.
create or replace function public.my_start_code(p_request uuid) returns text
language sql stable security definer set search_path = public as $$
  select o.otp from public.service_otps o join public.service_requests r on r.id = o.request_id
  where o.request_id = p_request and r.customer_id = auth.uid()
$$;

-- Customer: add or remove photos until the visit starts.
create or replace function public.set_request_photos(p_request uuid, p_photos text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(array_length(p_photos, 1), 0) > 4 then raise exception 'Up to 4 photos'; end if;
  if exists (select 1 from unnest(coalesce(p_photos, '{}')) ph where split_part(ph, '/', 1) <> auth.uid()::text) then
    raise exception 'Invalid photo';
  end if;
  update public.service_requests set photos = coalesce(p_photos, '{}')
  where id = p_request and customer_id = auth.uid() and status in ('Requested', 'With ops', 'Assigned', 'On the way', 'Arrived', 'Rescheduled');
  if not found then raise exception 'Photos can''t be changed once the visit has started'; end if;
end $$;

-- Customer: rate a finished job. Also becomes a review on the technician.
create or replace function public.rate_service(p_request uuid, p_stars integer, p_tags text[], p_comment text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.service_requests; v_name text;
begin
  select * into r from public.service_requests where id = p_request and customer_id = auth.uid();
  if not found then raise exception 'Job not found'; end if;
  if r.status <> 'Completed' then raise exception 'You can rate once the job is done'; end if;
  if r.rated_at is not null then raise exception 'Already rated'; end if;
  if p_stars not between 1 and 5 then raise exception 'Pick 1 to 5 stars'; end if;
  update public.service_requests set rating = p_stars, rating_tags = coalesce(p_tags, '{}'), rating_comment = coalesce(trim(p_comment), ''), rated_at = now()
  where id = p_request;
  if r.tech_id is not null then
    select full_name into v_name from public.profiles where id = auth.uid();
    insert into public.reviews (tech_id, service_request_id, author_id, author_name, stars, body)
    values (r.tech_id, r.id, auth.uid(), coalesce(nullif(v_name, ''), 'Customer'), p_stars,
      concat_ws(' — ', nullif(trim(p_comment), ''), nullif(array_to_string(coalesce(p_tags, '{}'), ' · '), '')));
  end if;
end $$;

-- Customer: friends who signed up with my code.
create or replace function public.my_referrals()
returns table (name text, joined timestamptz, rewarded boolean, amount integer)
language sql stable security definer set search_path = public as $$
  select split_part(p.full_name, ' ', 1) || coalesce(' ' || left(split_part(p.full_name, ' ', 2), 1) || '.', ''),
         p.created_at, rr.referee_id is not null, coalesce(rr.amount, 0)
  from public.profiles me
  join public.profiles p on p.referred_by = me.code
  left join public.referral_rewards rr on rr.referee_id = p.id
  where me.id = auth.uid()
  order by p.created_at desc
$$;

-- ─────── Technician actions ───────

create or replace function public.tech_job(p_request uuid) returns public.service_requests
language plpgsql stable security definer set search_path = public as $$
declare r public.service_requests;
begin
  select * into r from public.service_requests where id = p_request and tech_id = auth.uid();
  if not found then raise exception 'This job isn''t assigned to you'; end if;
  return r;
end $$;
revoke execute on function public.tech_job(uuid) from public, anon;

create or replace function public.tech_respond(p_request uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update public.service_requests set tech_id = auth.uid(), status = 'Assigned', assigned_at = now()
    where id = p_request and preferred_tech_id = auth.uid() and status = 'Requested';
  else
    -- Declined: goes back to ops to assign someone else.
    update public.service_requests set preferred_tech_id = null, status = 'With ops', note = 'Declined by chosen technician'
    where id = p_request and preferred_tech_id = auth.uid() and status = 'Requested';
  end if;
  if not found then raise exception 'This request is no longer open'; end if;
end $$;

create or replace function public.tech_set_status(p_request uuid, p_status text, p_eta integer default null, p_distance numeric default null) returns void
language plpgsql security definer set search_path = public as $$
declare r public.service_requests := public.tech_job(p_request);
begin
  if p_status = 'On the way' and r.status in ('Assigned', 'Rescheduled') then
    update public.service_requests set status = 'On the way', trip_started_at = now(), eta_min = p_eta, distance_km = p_distance where id = r.id;
    update public.technicians set status = 'On job' where id = auth.uid();
  elsif p_status = 'Arrived' and r.status = 'On the way' then
    update public.service_requests set status = 'Arrived', arrived_at = now() where id = r.id;
  else
    raise exception 'Can''t move this job from % to %', r.status, p_status;
  end if;
end $$;

-- The customer reads out their code; jobs for people without the app need none.
create or replace function public.tech_start_job(p_request uuid, p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.service_requests := public.tech_job(p_request); v_otp text;
begin
  if r.status not in ('Arrived', 'Assigned', 'On the way') then raise exception 'This job can''t be started now'; end if;
  select otp into v_otp from public.service_otps where request_id = r.id;
  if r.customer_id is not null and v_otp is not null and coalesce(p_code, '') <> v_otp then
    raise exception 'Wrong code — ask the customer to check again';
  end if;
  update public.service_requests set status = 'In Progress', started_at = now(), arrived_at = coalesce(arrived_at, now()) where id = r.id;
  -- Location sharing ends once work starts.
  delete from public.tech_locations where tech_id = auth.uid();
end $$;

create or replace function public.tech_save_worksheet(p_request uuid, p_checklist text[], p_tds_before text, p_tds_after text, p_parts jsonb, p_notes text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.service_requests := public.tech_job(p_request);
begin
  if r.status <> 'In Progress' then raise exception 'Start the job first'; end if;
  if jsonb_typeof(coalesce(p_parts, '[]')) <> 'array' then raise exception 'Invalid parts'; end if;
  update public.service_requests set checklist = coalesce(p_checklist, '{}'), tds_before = left(coalesce(p_tds_before, ''), 5),
    tds_after = left(coalesce(p_tds_after, ''), 5), parts = coalesce(p_parts, '[]'), tech_notes = left(coalesce(p_notes, ''), 300)
  where id = r.id;
end $$;

create or replace function public.tech_complete_job(p_request uuid, p_payment text) returns public.service_requests
language plpgsql security definer set search_path = public as $$
declare
  r public.service_requests := public.tech_job(p_request);
  v_line jsonb;
  v_parts_total integer := 0;
  v_part public.parts;
  v_amc boolean;
  v_out public.service_requests;
begin
  if r.status <> 'In Progress' then raise exception 'Start the job first'; end if;
  if coalesce(r.tds_after, '') = '' then raise exception 'Add the output TDS reading first'; end if;
  if p_payment not in ('Cash', 'UPI', 'AMC covered') then raise exception 'Choose how the customer paid'; end if;
  v_amc := r.type = 'AMC' and r.price = 0;
  for v_line in select * from jsonb_array_elements(r.parts) loop
    select * into v_part from public.parts where id = v_line ->> 'id';
    if not found then continue; end if;
    v_parts_total := v_parts_total + v_part.price * (v_line ->> 'qty')::integer;
    update public.tech_stock set qty = greatest(qty - (v_line ->> 'qty')::integer, 0)
    where tech_id = auth.uid() and part_id = v_part.id;
  end loop;
  update public.service_requests
     set status = 'Completed', completed_at = now(), payment = p_payment,
         amount = case when v_amc then 0 else r.price - r.discount + v_parts_total end
   where id = r.id returning * into v_out;
  update public.technicians set jobs_done = jobs_done + 1, status = 'Online' where id = auth.uid();
  return v_out;
end $$;

create or replace function public.tech_reschedule(p_request uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.service_requests := public.tech_job(p_request);
begin
  if r.status in ('In Progress', 'Completed', 'Cancelled') then raise exception 'Too late to reschedule'; end if;
  update public.service_requests set status = 'Rescheduled', reschedule_reason = left(p_reason, 120), trip_started_at = null where id = r.id;
  delete from public.tech_locations where tech_id = auth.uid();
end $$;

-- A task the technician raised: keep it, or hand it to ops.
create or replace function public.tech_create_task(
  p_name text, p_phone text, p_address text, p_pincode text, p_type text, p_product text,
  p_date date, p_slot text, p_issue text, p_keep boolean
) returns public.service_requests language plpgsql security definer set search_path = public as $$
declare v_svc public.service_catalog; v_req public.service_requests;
begin
  if not public.is_technician() then raise exception 'Technicians only'; end if;
  select * into v_svc from public.service_catalog where type = p_type;
  if not found then raise exception 'Unknown service'; end if;
  if length(trim(p_name)) < 2 or length(trim(p_address)) < 8 then raise exception 'Enter the customer''s name and full address'; end if;
  if p_pincode !~ '^[1-9][0-9]{5}$' then raise exception 'Enter a valid pincode'; end if;
  if p_keep and coalesce(trim(p_slot), '') in ('', 'Any time') then raise exception 'Pick a time slot'; end if;
  insert into public.service_requests (
    customer_name, customer_phone, address, pincode, type, product, visit_date, slot, description,
    price, amount, status, source, raised_by, tech_id, assigned_at
  ) values (
    trim(p_name), coalesce(p_phone, ''), trim(p_address), p_pincode, p_type, p_product, p_date, coalesce(nullif(trim(p_slot), ''), 'Any time'),
    coalesce(trim(p_issue), ''), v_svc.price, v_svc.price,
    case when p_keep then 'Assigned' else 'With ops' end, 'technician', auth.uid(),
    case when p_keep then auth.uid() end, case when p_keep then now() end
  ) returning * into v_req;
  return v_req;
end $$;

-- ─────── Staff actions ───────

create or replace function public.admin_credit_wallet(p_user uuid, p_amount integer, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if p_amount < 1 or p_amount > 5000 then raise exception 'Credit between ₹1 and ₹5,000'; end if;
  insert into public.wallet_txns (user_id, title, amount, created_by) values (p_user, coalesce(nullif(trim(p_reason), ''), 'Credit from Zavtoo'), p_amount, auth.uid());
  perform public.notify_user(p_user, 'wallet', '₹' || p_amount || ' added to your wallet', coalesce(p_reason, ''), '{"k": "wallet"}');
end $$;

create or replace function public.admin_approve_stock(p_request uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare s public.stock_requests; k text; v text;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  select * into s from public.stock_requests where id = p_request and status = 'Pending' for update;
  if not found then raise exception 'Request already handled'; end if;
  if p_approve then
    for k, v in select * from jsonb_each_text(s.items) loop
      insert into public.tech_stock (tech_id, part_id, qty) values (s.tech_id, k, v::integer)
      on conflict (tech_id, part_id) do update set qty = public.tech_stock.qty + excluded.qty;
    end loop;
  end if;
  update public.stock_requests set status = case when p_approve then 'Approved' else 'Rejected' end where id = s.id;
end $$;

-- ─────── Triggers: ratings, notifications, referrals ───────

create or replace function public.refresh_ratings() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_product text := coalesce(new.product_id, old.product_id); v_tech uuid := coalesce(new.tech_id, old.tech_id);
begin
  if v_product is not null then
    update public.products p set
      rating = coalesce((select round(avg(stars)::numeric, 1) from public.reviews where product_id = v_product and status = 'Published'), 0),
      reviews_count = (select count(*) from public.reviews where product_id = v_product and status = 'Published')
    where p.id = v_product;
  end if;
  if v_tech is not null then
    update public.technicians t set
      rating = coalesce((select round(avg(stars)::numeric, 1) from public.reviews where tech_id = v_tech and status = 'Published'), 0)
    where t.id = v_tech;
  end if;
  return null;
end $$;
drop trigger if exists reviews_refresh on public.reviews;
create trigger reviews_refresh after insert or update or delete on public.reviews for each row execute function public.refresh_ratings();

create or replace function public.on_order_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_ref public.profiles; v_me public.profiles; v_bonus constant integer := 250;
begin
  if tg_op = 'INSERT' then
    perform public.notify_user(new.customer_id, 'order', 'Order placed', new.title || ' · ₹' || new.amount || '. We''ll tell you when it ships.', jsonb_build_object('k', 'order', 'id', new.id));
  elsif new.status is distinct from old.status then
    perform public.notify_user(new.customer_id, 'order', 'Order ' || lower(new.status),
      '#' || new.ref || ' · ' || new.title, jsonb_build_object('k', 'order', 'id', new.id));
    -- Referral bonus when a referred customer's first order is delivered.
    if new.status = 'Delivered' then
      select * into v_me from public.profiles where id = new.customer_id;
      if v_me.referred_by is not null and not exists (select 1 from public.referral_rewards where referee_id = v_me.id) then
        select * into v_ref from public.profiles where code = v_me.referred_by and id <> v_me.id;
        if found then
          insert into public.referral_rewards (referee_id, referrer_id, amount) values (v_me.id, v_ref.id, v_bonus);
          insert into public.wallet_txns (user_id, title, amount) values (v_ref.id, 'Referral bonus · ' || split_part(v_me.full_name, ' ', 1), v_bonus);
          perform public.notify_user(v_ref.id, 'wallet', 'You earned ₹' || v_bonus || '!', split_part(v_me.full_name, ' ', 1) || ' bought a Zavtoo purifier with your code.', '{"k": "wallet"}');
        end if;
      end if;
    end if;
    if new.status = 'Cancelled' and old.status <> 'Cancelled' and new.wallet_used > 0 then
      insert into public.wallet_txns (user_id, title, amount) values (new.customer_id, 'Refund · order #' || new.ref, new.wallet_used);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_notify on public.orders;
create trigger orders_notify after insert or update of status on public.orders for each row execute function public.on_order_change();

create or replace function public.on_request_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_link jsonb := jsonb_build_object('k', 'track', 'id', new.id); v_tech text;
begin
  select split_part(name, ' ', 1) into v_tech from public.technicians where id = coalesce(new.tech_id, new.preferred_tech_id);
  v_tech := coalesce(v_tech, 'Your technician');
  if tg_op = 'INSERT' then
    perform public.notify_user(new.customer_id, 'service', new.type || ' booked', to_char(new.visit_date, 'DD Mon') || ', ' || new.slot || case when new.preferred_tech_id is not null then '. Waiting for ' || v_tech || ' to confirm.' else '. We''ll assign a technician shortly.' end, v_link);
    if new.preferred_tech_id is not null then
      perform public.notify_user(new.preferred_tech_id, 'service', 'New job request', new.type || ' · ' || new.pincode || ' · ' || to_char(new.visit_date, 'DD Mon') || ', ' || new.slot, v_link);
    end if;
    return new;
  end if;
  if new.tech_id is distinct from old.tech_id and new.tech_id is not null then
    perform public.notify_user(new.tech_id, 'service', 'Job assigned to you', new.type || ' · ' || new.customer_name || ' · ' || to_char(new.visit_date, 'DD Mon') || ', ' || new.slot, v_link);
  end if;
  if new.status is distinct from old.status then
    perform public.notify_user(new.customer_id, 'service',
      case new.status
        when 'Assigned'    then v_tech || ' will do your ' || lower(new.type)
        when 'On the way'  then v_tech || ' is on the way'
        when 'Arrived'     then v_tech || ' has arrived'
        when 'In Progress' then 'Your ' || lower(new.type) || ' has started'
        when 'Completed'   then new.type || ' completed'
        when 'Rescheduled' then 'Your visit needs a new slot'
        when 'Cancelled'   then 'Booking cancelled'
        when 'With ops'    then 'We''re finding you a technician'
        else new.status end,
      case new.status
        when 'On the way'  then 'Track live — about ' || coalesce(new.eta_min, 15) || ' min away.'
        when 'Arrived'     then 'Share your start code to begin.'
        when 'Completed'   then 'How did it go? Rate your technician.'
        when 'Rescheduled' then coalesce(new.reschedule_reason, '') || '. Our team will call you.'
        else to_char(new.visit_date, 'DD Mon') || ', ' || new.slot end,
      v_link);
  end if;
  return new;
end $$;
drop trigger if exists requests_notify on public.service_requests;
create trigger requests_notify after insert or update on public.service_requests for each row execute function public.on_request_change();

-- Broadcasts fan out to everyone in the audience who allows offers.
create or replace function public.on_broadcast() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  with targets as (
    select p.id from public.profiles p
    where not p.blocked and (
      (new.audience = 'Technicians' and p.role = 'technician') or
      (new.audience <> 'Technicians' and p.role = 'customer' and coalesce((p.notif_prefs ->> 'offers')::boolean, true) and (
        new.audience = 'All customers' or
        (new.audience = 'AMC active' and exists (select 1 from public.service_requests r where r.customer_id = p.id and r.type = 'AMC' and r.status = 'Completed' and r.completed_at > now() - interval '1 year')) or
        (new.audience = 'No AMC' and not exists (select 1 from public.service_requests r where r.customer_id = p.id and r.type = 'AMC' and r.status = 'Completed' and r.completed_at > now() - interval '1 year'))
      ))
    )
  ), ins as (
    insert into public.notifications (user_id, kind, title, body, link)
    select id, 'offer', new.title, new.body, '{"k": "offers"}' from targets returning 1
  ) select count(*) into v_n from ins;
  update public.broadcasts set reach = v_n where id = new.id;
  return new;
end $$;
drop trigger if exists broadcasts_fanout on public.broadcasts;
create trigger broadcasts_fanout after insert on public.broadcasts for each row execute function public.on_broadcast();

-- ═══════════════════════════ Row Level Security ═══════════════════════════

alter table public.products         enable row level security;
alter table public.service_catalog  enable row level security;
alter table public.coupons          enable row level security;
alter table public.parts            enable row level security;
alter table public.profiles         enable row level security;
alter table public.addresses        enable row level security;
alter table public.dealers          enable row level security;
alter table public.technicians      enable row level security;
alter table public.orders           enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_otps     enable row level security;
alter table public.tech_locations   enable row level security;
alter table public.reviews          enable row level security;
alter table public.wallet_txns      enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.notifications    enable row level security;
alter table public.chat_messages    enable row level security;
alter table public.broadcasts       enable row level security;
alter table public.tech_stock       enable row level security;
alter table public.stock_requests   enable row level security;
alter table public.payouts          enable row level security;

-- Drop and recreate every policy so re-running stays clean.
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Catalogue: public to read, staff to change.
create policy "read active products"  on public.products for select using (active or public.is_staff());
create policy "staff manage products" on public.products for all using (public.is_staff()) with check (public.is_staff());
create policy "read services"         on public.service_catalog for select using (active or public.is_staff());
create policy "staff manage services" on public.service_catalog for all using (public.is_staff()) with check (public.is_staff());
create policy "read live coupons"     on public.coupons for select using ((active and expires >= current_date) or public.is_staff());
create policy "staff manage coupons"  on public.coupons for all using (public.is_staff()) with check (public.is_staff());
create policy "read parts"            on public.parts for select to authenticated using (true);
create policy "staff manage parts"    on public.parts for all using (public.is_staff()) with check (public.is_staff());

-- Profiles
create policy "own profile"         on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "update own profile"  on public.profiles for update using (id = auth.uid() or public.is_staff()) with check (id = auth.uid() or public.is_staff());

-- Addresses
create policy "own addresses"   on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff addresses" on public.addresses for select using (public.is_staff());

-- Dealers: staff manage; technicians can see dealers.
create policy "read dealers"         on public.dealers for select to authenticated using (public.is_staff() or public.is_technician());
create policy "staff manage dealers" on public.dealers for all using (public.is_staff()) with check (public.is_staff());

-- Technicians: verified ones are visible to signed-in users (for picking).
create policy "read technicians"   on public.technicians for select to authenticated using ((active and kyc = 'Verified') or id = auth.uid() or public.is_staff());
create policy "tech updates self"  on public.technicians for update using (id = auth.uid() or public.is_staff()) with check (id = auth.uid() or public.is_staff());
create policy "staff manage techs" on public.technicians for insert with check (public.is_staff());
create policy "staff delete techs" on public.technicians for delete using (public.is_staff());

-- Orders (created only through place_order)
create policy "own orders"          on public.orders for select using (customer_id = auth.uid() or public.is_staff());
create policy "staff update orders" on public.orders for update using (public.is_staff()) with check (public.is_staff());

-- Service jobs (created/changed through the functions above; staff dispatch directly)
create policy "see jobs" on public.service_requests for select using (
  customer_id = auth.uid() or tech_id = auth.uid() or raised_by = auth.uid()
  or (preferred_tech_id = auth.uid() and status = 'Requested') or public.is_staff()
);
create policy "staff dispatch" on public.service_requests for update using (public.is_staff()) with check (public.is_staff());

-- Start codes: nobody reads the table directly (my_start_code is the way in).
create policy "staff otps" on public.service_otps for select using (public.is_staff());

-- Live location: the technician writes their own; the customer sees it only during their ride.
create policy "tech writes location" on public.tech_locations for all using (tech_id = auth.uid()) with check (
  tech_id = auth.uid() and exists (select 1 from public.service_requests r where r.tech_id = auth.uid() and r.status in ('On the way', 'Arrived'))
);
create policy "customer sees ride" on public.tech_locations for select using (
  public.is_staff() or exists (
    select 1 from public.service_requests r
    where r.tech_id = tech_locations.tech_id and r.customer_id = auth.uid() and r.status in ('On the way', 'Arrived')
  )
);

-- Reviews
create policy "read reviews"        on public.reviews for select using (status = 'Published' or author_id = auth.uid() or public.is_staff());
create policy "write product review" on public.reviews for insert to authenticated with check (
  author_id = auth.uid() and product_id is not null and tech_id is null and status = 'Published'
);
create policy "edit own review"     on public.reviews for update using (author_id = auth.uid() or public.is_staff()) with check (
  public.is_staff() or (author_id = auth.uid() and status = 'Published')
);
create policy "staff delete reviews" on public.reviews for delete using (public.is_staff());

-- Wallet (credits only via functions/triggers)
create policy "own wallet" on public.wallet_txns for select using (user_id = auth.uid() or public.is_staff());
create policy "staff referral" on public.referral_rewards for select using (public.is_staff() or referrer_id = auth.uid());

-- Notifications
create policy "own notifications"   on public.notifications for select using (user_id = auth.uid());
create policy "mark own read"       on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clear own"           on public.notifications for delete using (user_id = auth.uid());

-- Support chat
create policy "chat read"  on public.chat_messages for select using (customer_id = auth.uid() or public.is_staff());
create policy "chat customer send" on public.chat_messages for insert with check (customer_id = auth.uid() and sender = 'customer' and agent_id is null);
create policy "chat agent send"    on public.chat_messages for insert with check (public.is_staff() and sender = 'agent');

-- Broadcasts
create policy "staff broadcasts" on public.broadcasts for all using (public.is_staff()) with check (public.is_staff());

-- Technician stock, requests, payouts
create policy "own stock"     on public.tech_stock for select using (tech_id = auth.uid() or public.is_staff());
create policy "staff stock"   on public.tech_stock for all using (public.is_staff()) with check (public.is_staff());
create policy "own stock req" on public.stock_requests for select using (tech_id = auth.uid() or public.is_staff());
create policy "ask stock"     on public.stock_requests for insert with check (tech_id = auth.uid() and status = 'Pending');
create policy "own payouts"   on public.payouts for select using (tech_id = auth.uid() or public.is_staff());
create policy "staff payouts" on public.payouts for all using (public.is_staff()) with check (public.is_staff());

-- Functions customers shouldn't call while logged out.
revoke execute on function public.place_order(jsonb, text, boolean, text, uuid) from anon;
revoke execute on function public.book_service(text, text, date, text, text, uuid, text, text[], uuid) from anon;
revoke execute on function public.admin_credit_wallet(uuid, integer, text) from anon;
revoke execute on function public.admin_approve_stock(uuid, boolean) from anon;

-- ═══════════════════════════ Realtime ═══════════════════════════

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array[
    'products', 'service_catalog', 'coupons', 'technicians', 'dealers', 'orders', 'service_requests',
    'tech_locations', 'reviews', 'wallet_txns', 'notifications', 'chat_messages', 'tech_stock', 'stock_requests', 'profiles'
  ] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ═══════════════════════════ Photo storage ═══════════════════════════
-- ro-photos (private): <customer uid>/<file>.jpg — customer, their technician and staff can see them.
-- avatars (public):    <technician uid>/photo.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ro-photos', 'ro-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
       ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "ro photos upload" on storage.objects;
drop policy if exists "ro photos read" on storage.objects;
drop policy if exists "ro photos delete" on storage.objects;
drop policy if exists "avatars upload" on storage.objects;
drop policy if exists "avatars update" on storage.objects;
drop policy if exists "avatars delete" on storage.objects;

create policy "ro photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'ro-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ro photos read" on storage.objects for select to authenticated using (
  bucket_id = 'ro-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_staff()
    or exists (select 1 from public.service_requests r
               where (r.tech_id = auth.uid() or r.preferred_tech_id = auth.uid()) and storage.objects.name = any (r.photos))
  )
);
create policy "ro photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'ro-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

-- ═══════════════════════════ Catalogue seed ═══════════════════════════
-- Real starting catalogue. Ratings start at zero and fill in from real reviews.
-- Stock is left untracked (null) — set real numbers in Admin → Products & Stock.

insert into public.products (id, name, spec, price, mrp, category, art, stages, warranty, description, sort) values
  ('classic', 'AquaPure RO Classic', '7 Stage Purification', 12999, 15999, 'domestic', 'classic', '7 Stage', '1 Year',
   'Best for home use. Removes 99.9% bacteria, viruses and harmful impurities. Elegant design with smart indicators for filter life and tank level.', 1),
  ('pro', 'AquaPure RO Pro', '8 Stage + UV', 18999, 22499, 'domestic', 'pro', '8 Stage', '2 Years',
   'RO + UV + UF with a mineral cartridge that puts back calcium and magnesium. 10 L storage tank for families of 4–6.', 2),
  ('premium', 'AquaPure RO Premium', 'Smart Display | WiFi', 24999, 29999, 'domestic', 'premium', '9 Stage', '3 Years',
   'Touch display shows live TDS, filter health and daily usage. WiFi alerts on your phone when a filter change is due.', 3),
  ('commercial-50', 'Zavtoo Commercial 50 LPH', 'For offices & shops', 42999, 49999, 'commercial', 'commercial', '6 Stage', '1 Year',
   'Stainless-steel frame, 50 litres per hour output. Built for offices, clinics and small restaurants.', 4),
  ('commercial-100', 'Zavtoo Commercial 100 LPH', 'Schools & factories', 68999, 79999, 'commercial', 'commercial', '6 Stage', '1 Year',
   'Heavy-duty 100 LPH plant with auto-flush and dual pressure pumps for continuous use.', 5),
  ('spares', 'Spare Parts Kit', 'Sediment + Carbon + Membrane', 499, 699, 'spare', 'spare', '3 filters', '6 Months',
   'Genuine replacement filters for AquaPure RO Classic and Pro. Change every 6–9 months for best taste.', 6),
  ('cartridges', 'Filter Cartridges', 'Pack of 3 · universal fit', 1299, 1599, 'spare', 'cartridge', '3 cartridges', '6 Months',
   'Universal-fit inline cartridges for most domestic RO purifiers.', 7)
on conflict (id) do nothing;

insert into public.service_catalog (type, tagline, price, price_note, duration, includes, sort) values
  ('Installation', 'Free with every Zavtoo purifier', 0, 'for Zavtoo purifiers', '45–60 min',
   '{"Wall mounting & plumbing","Inlet valve + drain setup","TDS check before and after","Demo of filter indicators"}', 1),
  ('Repair', 'Leaks, low flow, noise, bad taste', 499, 'visit charge · parts extra', '30–90 min',
   '{"Full diagnosis of the purifier","Leak & pressure checks","Genuine spare parts at MRP","30-day repair warranty"}', 2),
  ('AMC', '1 year of worry-free water', 1999, 'per year', '1 year cover',
   '{"3 preventive service visits","2 filter sets included","Priority repairs within 24h","No visit charges all year"}', 3),
  ('Filter Change', 'Sediment, carbon & membrane', 899, 'incl. filter kit', '30 min',
   '{"Genuine sediment + carbon filters","Membrane health check","Tank sanitisation","TDS reading after service"}', 4),
  ('Water Test', 'Know what''s in your water', 199, 'at-home test', '20 min',
   '{"TDS, pH and hardness test","Chlorine check","Purifier recommendation","Digital report on SMS"}', 5),
  ('Uninstall', 'Moving house? We''ll handle it', 349, 'uninstall + reinstall ₹599', '30 min',
   '{"Safe dismounting","Pipe & valve capping","Packing guidance","Reinstall at new address on request"}', 6)
on conflict (type) do nothing;

insert into public.coupons (code, title, descr, kind, value, max_off, min_order, applies_to, expires) values
  ('PURE10', '10% off purifiers', 'Up to ₹2,000 off on any RO purifier order.', 'percent', 10, 2000, 9999, 'product', '2026-10-31'),
  ('FILTER150', '₹150 off spares', 'Flat ₹150 off on filters & cartridges above ₹999.', 'flat', 150, null, 999, 'product', '2026-10-15'),
  ('FIRSTFIX', '₹200 off first repair', 'Flat ₹200 off your repair visit charge.', 'flat', 200, null, 399, 'service', '2026-11-30'),
  ('AMC300', '₹300 off AMC', 'Save ₹300 when you buy or renew a 1-year AMC.', 'flat', 300, null, 1999, 'service', '2026-12-31'),
  ('ZAVTOO5', '5% off everything', 'Works on products and paid services. Max ₹500.', 'percent', 5, 500, 499, 'all', '2026-12-31')
on conflict (code) do nothing;

insert into public.parts (id, name, price) values
  ('sed', 'Sediment filter', 180), ('carb', 'Carbon filter', 250), ('mem', 'RO membrane 80 GPD', 1800),
  ('uv', 'UV lamp 11W', 650), ('pump', 'Booster pump', 1400), ('sv', 'Solenoid valve', 350),
  ('tap', 'Tank tap', 120), ('pipe', 'Pipe & connector set', 90)
on conflict (id) do nothing;

-- Done. Next: the app creates the super admin with the service key (scripts/create-super-admin.mjs).
