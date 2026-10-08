-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — dealer app migration
-- Run once in Supabase → SQL Editor on a database that already has
-- supabase/schema.sql applied. Safe to run again. (Running the full
-- schema.sql instead does the same thing.)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────── Dealer role ───────
create or replace function public.is_dealer() returns boolean
language sql stable as $$ select public.app_role() = 'dealer' $$;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'technician', 'dealer', 'admin', 'super_admin'));

-- Dealers who signed up themselves have a login; ones ops added by hand don't.
alter table public.dealers add column if not exists user_id uuid unique references public.profiles (id) on delete set null;
alter table public.dealers add column if not exists email   text;
alter table public.dealers add column if not exists gstin   text not null default '';
alter table public.dealers add column if not exists address text not null default '';
-- Dealers ops add are trusted; self sign-ups start as Pending until ops check them.
alter table public.dealers add column if not exists kyc     text not null default 'Verified' check (kyc in ('Pending', 'Verified'));

-- The dealer record behind the signed-in login, if any.
create or replace function public.my_dealer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.dealers where user_id = auth.uid()
$$;

-- Verified, active dealers can sell and dispatch.
create or replace function public.dealer_live(p_dealer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dealers where id = p_dealer and active and kyc = 'Verified')
$$;

-- Dealers may edit their shop details — not their ID, login, KYC or active switch.
create or replace function public.guard_dealer() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_staff() and (
    new.code is distinct from old.code or new.user_id is distinct from old.user_id or new.kyc is distinct from old.kyc or
    new.active is distinct from old.active or new.email is distinct from old.email or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Not allowed to change these dealer fields';
  end if;
  if length(trim(new.name)) < 3 then raise exception 'Enter the shop name'; end if;
  if exists (select 1 from unnest(new.pincodes) p where p !~ '^[1-9][0-9]{5}$') then raise exception 'Invalid pincode'; end if;
  if new.gstin <> '' and new.gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then raise exception 'That GSTIN doesn''t look right'; end if;
  return new;
end $$;
drop trigger if exists guard_dealer on public.dealers;
create trigger guard_dealer before update on public.dealers for each row execute function public.guard_dealer();

-- Sign-ups and role changes know about dealers (DLR- IDs).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_app_meta_data ->> 'role', 'customer');
begin
  if v_role not in ('customer', 'technician', 'dealer', 'admin', 'super_admin') then v_role := 'customer'; end if;
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

create or replace function public.sync_user_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_app_meta_data ->> 'role', 'customer');
  v_prefix text;
begin
  if v_role not in ('customer', 'technician', 'dealer', 'admin', 'super_admin') then return new; end if;
  v_prefix := case v_role when 'technician' then 'TEC' when 'dealer' then 'DLR' when 'customer' then 'CUS' else 'ADM' end;
  update public.profiles p
     set role = v_role,
         code = case when p.code like v_prefix || '-%' then p.code else public.next_code(v_role) end
   where p.id = new.id and p.role <> v_role;
  return new;
end $$;

-- ─────────────────────────── Dealer listings & orders ───────────────────────────
-- A dealer's listings are ordinary products with dealer_id set, so the shop,
-- cart and place_order treat them like any other product. Customers only see
-- them while the dealer is active and verified.

alter table public.products add column if not exists dealer_id uuid references public.dealers (id) on delete cascade;
-- "Shop name, City" shown on the product; kept in step by the triggers below.
alter table public.products add column if not exists sold_by text;
create index if not exists products_dealer_idx on public.products (dealer_id) where dealer_id is not null;

-- Dealers manage their own listings only; ratings, sort order and IDs stay Zavtoo's.
create or replace function public.guard_product() returns trigger
language plpgsql as $$
declare v_dealer public.dealers;
begin
  if current_user in ('authenticated', 'anon') and not public.is_staff() then
    select * into v_dealer from public.dealers where user_id = auth.uid();
    if not found then raise exception 'Not allowed to change products'; end if;
    if tg_op = 'INSERT' then
      new.id := 'dl-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
      new.rating := 0; new.reviews_count := 0; new.sort := 1000;
    else
      if new.id is distinct from old.id then raise exception 'Not allowed to change the product ID'; end if;
      new.rating := old.rating; new.reviews_count := old.reviews_count; new.sort := old.sort;
    end if;
    new.dealer_id := v_dealer.id;
    if length(trim(new.name)) < 3 then raise exception 'Enter the product name'; end if;
    if new.stock is null then raise exception 'Enter how many units you have in stock'; end if;
    if new.art not in ('classic', 'pro', 'premium', 'commercial', 'spare', 'cartridge') then new.art := 'classic'; end if;
    -- Dealers can reuse Zavtoo's catalogue photos, not upload their own (yet).
    if exists (select 1 from unnest(new.images) u
               where not exists (select 1 from public.products z where z.dealer_id is null and u = any (z.images))) then
      raise exception 'Only Zavtoo catalogue photos can be used';
    end if;
  end if;
  if new.dealer_id is null then
    new.sold_by := null;
  elsif tg_op = 'INSERT' or new.dealer_id is distinct from old.dealer_id or new.sold_by is null then
    select d.name || case when d.city <> '' then ', ' || d.city else '' end into new.sold_by from public.dealers d where d.id = new.dealer_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_product on public.products;
create trigger guard_product before insert or update on public.products for each row execute function public.guard_product();

create or replace function public.sync_sold_by() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.products set sold_by = new.name || case when new.city <> '' then ', ' || new.city else '' end
  where dealer_id = new.id;
  return new;
end $$;
drop trigger if exists dealers_sold_by on public.dealers;
create trigger dealers_sold_by after update of name, city on public.dealers for each row execute function public.sync_sold_by();

-- One row per dealer per customer order: the dealer's lines and a copy of the
-- delivery details (dealers can't read customers' orders or profiles).
create table if not exists public.dealer_orders (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  dealer_id      uuid not null references public.dealers (id) on delete cascade,
  -- Same line shape as orders.items, only this dealer's products.
  items          jsonb not null,
  -- The dealer's lines at list price (order-level coupons and wallet are Zavtoo's).
  amount         integer not null,
  customer_name  text not null,
  customer_phone text not null default '',
  address        text not null,
  pincode        text not null,
  payment        text not null,
  -- True when every line of the customer's order is this dealer's, so the
  -- dealer's updates move the customer's order along too.
  whole_order    boolean not null default false,
  status         text not null default 'New' check (status in ('New', 'Accepted', 'Shipped', 'Delivered', 'Rejected', 'Cancelled')),
  reject_reason  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (order_id, dealer_id)
);
create index if not exists dealer_orders_dealer_idx on public.dealer_orders (dealer_id, created_at desc);
drop trigger if exists dealer_orders_touch on public.dealer_orders;
create trigger dealer_orders_touch before update on public.dealer_orders for each row execute function public.touch_updated_at();

-- Checkout: dealer pincode check and per-dealer split.
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
    if v_p.dealer_id is not null then
      if not public.dealer_live(v_p.dealer_id) then raise exception 'A product in your cart is no longer available'; end if;
      if not exists (select 1 from public.dealers d where d.id = v_p.dealer_id and v_addr.pincode = any (d.pincodes)) then
        raise exception '% is sold by % and isn''t delivered to pincode %', v_p.name, v_p.sold_by, v_addr.pincode;
      end if;
    end if;
    if v_p.stock is not null then
      if v_p.stock < v_qty then raise exception '% has only % left in stock', v_p.name, v_p.stock; end if;
      update public.products set stock = stock - v_qty where id = v_p.id;
    end if;
    v_sub := v_sub + v_p.price * v_qty;
    v_mrp := v_mrp + v_p.mrp * v_qty;
    v_items := v_items || jsonb_build_object('id', v_p.id, 'name', v_p.name, 'qty', v_qty, 'price', v_p.price, 'mrp', v_p.mrp, 'art', v_p.art,
      'dealer_id', v_p.dealer_id, 'sold_by', v_p.sold_by);
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

  -- Hand each dealer their part of the order.
  insert into public.dealer_orders (order_id, dealer_id, items, amount, customer_name, customer_phone, address, pincode, payment, whole_order)
  select v_order.id, (l ->> 'dealer_id')::uuid, jsonb_agg(l - 'dealer_id' - 'sold_by'),
         sum((l ->> 'price')::integer * (l ->> 'qty')::integer)::integer,
         coalesce(nullif(pr.full_name, ''), 'Customer'), coalesce(pr.phone, ''), v_order.address, v_addr.pincode, v_order.payment,
         count(*) = jsonb_array_length(v_items)
  from jsonb_array_elements(v_items) l
  join public.profiles pr on pr.id = v_uid
  where l ->> 'dealer_id' is not null
  group by l ->> 'dealer_id', pr.full_name, pr.phone;
  return v_order;
end $$;

-- ─────── Dealer actions ───────

-- Move the dealer's part of an order along: New → Accepted → Shipped → Delivered,
-- or Rejected before it ships. Rejected stock goes back on the shelf.
create or replace function public.dealer_set_order_status(p_id uuid, p_status text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_dealer uuid := public.my_dealer_id();
  x public.dealer_orders;
  v_order_status text;
  v_line jsonb;
begin
  if v_dealer is null then raise exception 'Dealers only'; end if;
  select * into x from public.dealer_orders where id = p_id and dealer_id = v_dealer for update;
  if not found then raise exception 'Order not found'; end if;
  select status into v_order_status from public.orders where id = x.order_id;
  if v_order_status = 'Cancelled' or x.status = 'Cancelled' then raise exception 'The customer''s order was cancelled'; end if;
  if not (
    (x.status = 'New' and p_status in ('Accepted', 'Rejected')) or
    (x.status = 'Accepted' and p_status in ('Shipped', 'Rejected')) or
    (x.status = 'Shipped' and p_status = 'Delivered')
  ) then
    raise exception 'Can''t move this order from % to %', x.status, p_status;
  end if;

  update public.dealer_orders
     set status = p_status,
         reject_reason = case when p_status = 'Rejected' then left(coalesce(nullif(trim(p_reason), ''), 'Rejected by the dealer'), 120) end
   where id = x.id;

  if p_status = 'Rejected' then
    for v_line in select * from jsonb_array_elements(x.items) loop
      update public.products set stock = stock + (v_line ->> 'qty')::integer where id = v_line ->> 'id' and stock is not null;
    end loop;
  end if;

  -- The customer's order follows when it's entirely this dealer's; mixed orders stay with ops.
  if x.whole_order then
    if p_status in ('Shipped', 'Delivered') then
      update public.orders set status = p_status where id = x.order_id;
    elsif p_status = 'Rejected' then
      update public.orders set status = 'Cancelled' where id = x.order_id;
    end if;
  end if;
end $$;

-- When ops cancel a customer's order, the dealer stops working on it.
create or replace function public.on_order_cancel_dealers() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.dealer_orders set status = 'Cancelled' where order_id = new.id and status in ('New', 'Accepted', 'Shipped');
  return new;
end $$;
drop trigger if exists orders_cancel_dealers on public.orders;
create trigger orders_cancel_dealers after update of status on public.orders
  for each row when (new.status = 'Cancelled' and old.status is distinct from 'Cancelled')
  execute function public.on_order_cancel_dealers();

-- Which service jobs a dealer may see: their technicians' jobs, plus unassigned
-- jobs in their pincodes that are waiting for someone.
create or replace function public.dealer_sees_job(p_tech uuid, p_preferred uuid, p_status text, p_pincode text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.dealers d
    where d.user_id = auth.uid() and (
      exists (select 1 from public.technicians t where t.id = coalesce(p_tech, p_preferred) and t.dealer_id = d.id)
      or (d.active and d.kyc = 'Verified' and p_tech is null and p_pincode = any (d.pincodes)
          and (p_status = 'With ops' or (p_status = 'Requested' and p_preferred is null)))
    )
  )
$$;

-- Dealer dispatch: give an open job in their area (or one of their team's jobs) to one of their technicians.
create or replace function public.dealer_assign_job(p_request uuid, p_tech uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.dealers; t public.technicians; r public.service_requests;
begin
  select * into d from public.dealers where user_id = auth.uid();
  if not found then raise exception 'Dealers only'; end if;
  if not (d.active and d.kyc = 'Verified') then raise exception 'Your shop needs to be verified by Zavtoo first'; end if;
  select * into t from public.technicians where id = p_tech and dealer_id = d.id;
  if not found then raise exception 'That technician isn''t on your team'; end if;
  if not (t.active and t.kyc = 'Verified') then raise exception '% isn''t verified by Zavtoo yet', t.name; end if;
  select * into r from public.service_requests where id = p_request for update;
  if not found then raise exception 'Job not found'; end if;
  if r.status not in ('Requested', 'With ops', 'Assigned', 'Rescheduled') then raise exception 'This job can''t be reassigned now'; end if;
  if not (
    (r.tech_id is null and r.pincode = any (d.pincodes) and (r.status = 'With ops' or (r.status = 'Requested' and r.preferred_tech_id is null)))
    or exists (select 1 from public.technicians x where x.id = r.tech_id and x.dealer_id = d.id)
  ) then
    raise exception 'This job isn''t open in your area';
  end if;
  update public.service_requests
     set tech_id = t.id, preferred_tech_id = null, status = 'Assigned', assigned_at = now(), note = 'Assigned by ' || d.name
   where id = r.id;
end $$;

-- ─────── Row level security ───────
alter table public.dealer_orders enable row level security;

drop policy if exists "read active products"   on public.products;
drop policy if exists "dealer adds listing"    on public.products;
drop policy if exists "dealer edits listing"   on public.products;
drop policy if exists "dealer removes listing" on public.products;
drop policy if exists "read dealers"           on public.dealers;
drop policy if exists "dealer edits shop"      on public.dealers;
drop policy if exists "dealer orders"          on public.dealer_orders;
drop policy if exists "read technicians"       on public.technicians;
drop policy if exists "see jobs"               on public.service_requests;

create policy "read active products"  on public.products for select using (
  (active and (dealer_id is null or public.dealer_live(dealer_id))) or public.is_staff()
  or (dealer_id is not null and dealer_id = public.my_dealer_id())
);
create policy "dealer adds listing"     on public.products for insert to authenticated with check (public.is_dealer() and dealer_id = public.my_dealer_id());
create policy "dealer edits listing"    on public.products for update to authenticated using (dealer_id = public.my_dealer_id()) with check (dealer_id = public.my_dealer_id());
create policy "dealer removes listing"  on public.products for delete to authenticated using (dealer_id = public.my_dealer_id());
create policy "read dealers"         on public.dealers for select to authenticated using (public.is_staff() or public.is_technician() or user_id = auth.uid());
create policy "dealer edits shop"    on public.dealers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dealer orders"        on public.dealer_orders for select using (dealer_id = public.my_dealer_id() or public.is_staff());
create policy "read technicians"   on public.technicians for select to authenticated using (
  (active and kyc = 'Verified') or id = auth.uid() or public.is_staff() or (dealer_id is not null and dealer_id = public.my_dealer_id())
);
create policy "see jobs" on public.service_requests for select using (
  customer_id = auth.uid() or tech_id = auth.uid() or raised_by = auth.uid()
  or (preferred_tech_id = auth.uid() and status = 'Requested') or public.is_staff()
  or (public.is_dealer() and public.dealer_sees_job(tech_id, preferred_tech_id, status, pincode))
);

revoke execute on function public.dealer_set_order_status(uuid, text, text) from anon;
revoke execute on function public.dealer_assign_job(uuid, uuid) from anon;

-- ─────── Realtime ───────
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dealer_orders') then
    alter publication supabase_realtime add table public.dealer_orders;
  end if;
end $$;

-- Done. Approve self-registered dealers in Admin → Dealers → Verify.
