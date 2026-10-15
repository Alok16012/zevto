-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — technician shop migration
-- Technicians buy Zavtoo products and sell them to customers. Run once in Supabase →
-- SQL Editor on a database that already has supabase/schema.sql applied.
-- Safe to run again. (Running the full schema.sql instead does the same thing.)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────── Technician products ───────
-- A technician buys Zavtoo products from ops (tech_purchases). When ops mark a
-- purchase delivered, the units land in the technician's own list (tech_listings)
-- and customers in their pincodes can buy them from that technician. Each listing
-- has a matching products row (tech_id + tech_listing_id set), so the app,
-- website, cart and place_order treat it like any other product.

create sequence if not exists public.tech_purchase_ref_seq start 1001;

create table if not exists public.tech_listings (
  id         uuid primary key default gen_random_uuid(),
  tech_id    uuid not null references public.technicians (id) on delete cascade,
  -- The Zavtoo catalogue product the technician bought.
  product_id text not null references public.products (id) on delete cascade,
  -- The technician's selling price (up to the product's MRP).
  price      integer not null check (price > 0),
  stock      integer not null default 0 check (stock >= 0 and stock <= 9999),
  selling    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tech_id, product_id)
);
create index if not exists tech_listings_tech_idx on public.tech_listings (tech_id);

create table if not exists public.tech_purchases (
  id         uuid primary key default gen_random_uuid(),
  ref        text not null unique default ('TPO' || nextval('public.tech_purchase_ref_seq')),
  tech_id    uuid not null references public.technicians (id) on delete cascade,
  -- [{ "id": "membrane-75", "name": "...", "qty": 4, "price": 850 }]
  items      jsonb not null,
  amount     integer not null,
  status     text not null default 'Pending' check (status in ('Pending', 'Delivered', 'Rejected', 'Cancelled')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tech_purchases_tech_idx on public.tech_purchases (tech_id, created_at desc);
drop trigger if exists tech_purchases_touch on public.tech_purchases;
create trigger tech_purchases_touch before update on public.tech_purchases for each row execute function public.touch_updated_at();

-- Technicians set their price (up to MRP), switch selling on/off and lower their
-- stock (units used on a job or sold outside the app). New stock only comes from
-- a delivered purchase.
create or replace function public.guard_tech_listing() returns trigger
language plpgsql as $$
declare v_mrp integer;
begin
  new.updated_at := now();
  select mrp into v_mrp from public.products where id = new.product_id;
  if new.price > v_mrp then raise exception 'Your price can''t be more than the MRP (₹%)', v_mrp; end if;
  if tg_op = 'UPDATE' and current_user in ('authenticated', 'anon') and not public.is_staff() then
    if new.tech_id is distinct from old.tech_id or new.product_id is distinct from old.product_id then
      raise exception 'Not allowed to change this listing';
    end if;
    if new.stock > old.stock then raise exception 'Buy more from Zavtoo to add stock'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_tech_listing on public.tech_listings;
create trigger guard_tech_listing before insert or update on public.tech_listings for each row execute function public.guard_tech_listing();

alter table public.products add column if not exists tech_id         uuid references public.technicians (id) on delete cascade;
alter table public.products add column if not exists tech_listing_id uuid unique references public.tech_listings (id) on delete cascade;
create index if not exists products_tech_idx on public.products (tech_id) where tech_id is not null;

create or replace function public.tech_live(p_tech uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.technicians where id = p_tech and active and kyc = 'Verified')
$$;

-- Same rules as before for dealers; technician products are written only by
-- sync_tech_listing_product and show "Name · Zavtoo technician" as the seller.
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
    new.tech_id := null;
    new.tech_listing_id := null;
    if length(trim(new.name)) < 3 then raise exception 'Enter the product name'; end if;
    if new.stock is null then raise exception 'Enter how many units you have in stock'; end if;
    if new.art not in ('classic', 'pro', 'premium', 'commercial', 'spare', 'cartridge') then new.art := 'classic'; end if;
    -- Dealers can reuse Zavtoo's catalogue photos, not upload their own (yet).
    if exists (select 1 from unnest(new.images) u
               where not exists (select 1 from public.products z where z.dealer_id is null and z.tech_id is null and u = any (z.images))) then
      raise exception 'Only Zavtoo catalogue photos can be used';
    end if;
  end if;
  if new.tech_id is not null then
    select t.name || ' · Zavtoo technician' into new.sold_by from public.technicians t where t.id = new.tech_id;
  elsif new.dealer_id is null then
    new.sold_by := null;
  elsif tg_op = 'INSERT' or new.dealer_id is distinct from old.dealer_id or new.sold_by is null then
    select d.name || case when d.city <> '' then ', ' || d.city else '' end into new.sold_by from public.dealers d where d.id = new.dealer_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_product on public.products;
create trigger guard_product before insert or update on public.products for each row execute function public.guard_product();

-- Keeps a listing's products row in step: Zavtoo's name, photos and details, the technician's price and stock.
create or replace function public.sync_tech_listing_product() returns trigger
language plpgsql security definer set search_path = public as $$
declare z public.products;
begin
  select * into z from public.products where id = new.product_id;
  insert into public.products (id, name, spec, price, mrp, category, art, stages, warranty, description, stock, active, sort, images, tech_id, tech_listing_id)
  values ('tl-' || left(replace(new.id::text, '-', ''), 16), z.name, z.spec, new.price, greatest(z.mrp, new.price), z.category, z.art, z.stages,
          z.warranty, z.description, new.stock, new.selling and z.active, 2000 + z.sort, z.images, new.tech_id, new.id)
  on conflict (tech_listing_id) do update set
    name = excluded.name, spec = excluded.spec, price = excluded.price, mrp = excluded.mrp, category = excluded.category, art = excluded.art,
    stages = excluded.stages, warranty = excluded.warranty, description = excluded.description, stock = excluded.stock,
    active = excluded.active, sort = excluded.sort, images = excluded.images;
  return new;
end $$;
drop trigger if exists tech_listings_product on public.tech_listings;
create trigger tech_listings_product after insert or update on public.tech_listings for each row execute function public.sync_tech_listing_product();

-- When ops edit a Zavtoo product, technicians' copies follow.
create or replace function public.sync_tech_listings_from_product() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.tech_listings set updated_at = now() where product_id = new.id;
  return new;
end $$;
drop trigger if exists products_tech_listings on public.products;
create trigger products_tech_listings after update on public.products
  for each row when (new.tech_id is null and new.dealer_id is null)
  execute function public.sync_tech_listings_from_product();

-- The seller name follows a technician's rename.
create or replace function public.sync_tech_sold_by() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.products set updated_at = now() where tech_id = new.id;
  return new;
end $$;
drop trigger if exists technicians_sold_by on public.technicians;
create trigger technicians_sold_by after update of name on public.technicians for each row execute function public.sync_tech_sold_by();

-- ─────── Buying stock from Zavtoo ───────

-- A technician asks ops for Zavtoo products. Prices are Zavtoo's current prices.
create or replace function public.tech_buy(p_items jsonb) returns public.tech_purchases
language plpgsql security definer set search_path = public as $$
declare
  v_line jsonb;
  v_p public.products;
  v_qty integer;
  v_items jsonb := '[]';
  v_amount integer := 0;
  v_row public.tech_purchases;
begin
  if not public.is_technician() then raise exception 'Technicians only'; end if;
  if not exists (select 1 from public.technicians where id = auth.uid() and active) then raise exception 'Your partner account isn''t active yet'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add something to buy'; end if;
  for v_line in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_line ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Invalid quantity'; end if;
    select * into v_p from public.products where id = v_line ->> 'id' and active and dealer_id is null and tech_id is null;
    if not found then raise exception 'A product in your order is no longer available'; end if;
    if v_p.stock is not null and v_p.stock < v_qty then raise exception 'Zavtoo has only % of % in stock', v_p.stock, v_p.name; end if;
    v_items := v_items || jsonb_build_object('id', v_p.id, 'name', v_p.name, 'qty', v_qty, 'price', v_p.price, 'mrp', v_p.mrp, 'art', v_p.art);
    v_amount := v_amount + v_p.price * v_qty;
  end loop;
  insert into public.tech_purchases (tech_id, items, amount) values (auth.uid(), v_items, v_amount) returning * into v_row;
  return v_row;
end $$;

-- Technicians can take back a purchase request ops haven't handled yet.
create or replace function public.tech_cancel_purchase(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.tech_purchases set status = 'Cancelled' where id = p_id and tech_id = auth.uid() and status = 'Pending';
  if not found then raise exception 'This purchase can''t be cancelled now'; end if;
end $$;

-- Ops deliver (stock moves from Zavtoo to the technician's list) or reject a purchase.
create or replace function public.admin_tech_purchase(p_id uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare x public.tech_purchases; v_line jsonb; v_qty integer; v_p public.products;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if p_status not in ('Delivered', 'Rejected') then raise exception 'Choose Delivered or Rejected'; end if;
  select * into x from public.tech_purchases where id = p_id and status = 'Pending' for update;
  if not found then raise exception 'Purchase already handled'; end if;
  if p_status = 'Delivered' then
    for v_line in select * from jsonb_array_elements(x.items) loop
      v_qty := (v_line ->> 'qty')::integer;
      select * into v_p from public.products where id = v_line ->> 'id' for update;
      if not found then raise exception '% is no longer in the catalogue', v_line ->> 'name'; end if;
      if v_p.stock is not null then
        if v_p.stock < v_qty then raise exception 'Only % of % left in Zavtoo stock', v_p.stock, v_p.name; end if;
        update public.products set stock = stock - v_qty where id = v_p.id;
      end if;
      insert into public.tech_listings (tech_id, product_id, price, stock)
      values (x.tech_id, v_p.id, v_p.price, least(v_qty, 9999))
      on conflict (tech_id, product_id) do update set stock = least(public.tech_listings.stock + excluded.stock, 9999);
    end loop;
  end if;
  update public.tech_purchases set status = p_status, note = nullif(left(trim(coalesce(p_note, '')), 160), '') where id = x.id;
end $$;

-- One row per technician per customer order, like dealer_orders.
create table if not exists public.tech_orders (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  tech_id        uuid not null references public.technicians (id) on delete cascade,
  items          jsonb not null,
  amount         integer not null,
  customer_name  text not null,
  customer_phone text not null default '',
  address        text not null,
  pincode        text not null,
  payment        text not null,
  whole_order    boolean not null default false,
  status         text not null default 'New' check (status in ('New', 'Accepted', 'Shipped', 'Delivered', 'Rejected', 'Cancelled')),
  reject_reason  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (order_id, tech_id)
);
create index if not exists tech_orders_tech_idx on public.tech_orders (tech_id, created_at desc);
drop trigger if exists tech_orders_touch on public.tech_orders;
create trigger tech_orders_touch before update on public.tech_orders for each row execute function public.touch_updated_at();

-- Checkout: dealer and technician pincode checks, and the per-seller split.
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
    if v_p.tech_id is not null then
      if not public.tech_live(v_p.tech_id) then raise exception 'A product in your cart is no longer available'; end if;
      if not exists (select 1 from public.technicians t where t.id = v_p.tech_id and v_addr.pincode = any (t.pincodes)) then
        raise exception '% is sold by % and isn''t delivered to pincode %', v_p.name, v_p.sold_by, v_addr.pincode;
      end if;
    end if;
    if v_p.stock is not null then
      if v_p.stock < v_qty then raise exception '% has only % left in stock', v_p.name, v_p.stock; end if;
      update public.products set stock = stock - v_qty where id = v_p.id;
      if v_p.tech_listing_id is not null then
        update public.tech_listings set stock = greatest(stock - v_qty, 0) where id = v_p.tech_listing_id;
      end if;
    end if;
    v_sub := v_sub + v_p.price * v_qty;
    v_mrp := v_mrp + v_p.mrp * v_qty;
    v_items := v_items || jsonb_build_object('id', v_p.id, 'name', v_p.name, 'qty', v_qty, 'price', v_p.price, 'mrp', v_p.mrp, 'art', v_p.art,
      'dealer_id', v_p.dealer_id, 'tech_id', v_p.tech_id, 'sold_by', v_p.sold_by);
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

  -- Hand each dealer and each technician their part of the order.
  insert into public.dealer_orders (order_id, dealer_id, items, amount, customer_name, customer_phone, address, pincode, payment, whole_order)
  select v_order.id, (l ->> 'dealer_id')::uuid, jsonb_agg(l - 'dealer_id' - 'tech_id' - 'sold_by'),
         sum((l ->> 'price')::integer * (l ->> 'qty')::integer)::integer,
         coalesce(nullif(pr.full_name, ''), 'Customer'), coalesce(pr.phone, ''), v_order.address, v_addr.pincode, v_order.payment,
         count(*) = jsonb_array_length(v_items)
  from jsonb_array_elements(v_items) l
  join public.profiles pr on pr.id = v_uid
  where l ->> 'dealer_id' is not null
  group by l ->> 'dealer_id', pr.full_name, pr.phone;

  insert into public.tech_orders (order_id, tech_id, items, amount, customer_name, customer_phone, address, pincode, payment, whole_order)
  select v_order.id, (l ->> 'tech_id')::uuid, jsonb_agg(l - 'dealer_id' - 'tech_id' - 'sold_by'),
         sum((l ->> 'price')::integer * (l ->> 'qty')::integer)::integer,
         coalesce(nullif(pr.full_name, ''), 'Customer'), coalesce(pr.phone, ''), v_order.address, v_addr.pincode, v_order.payment,
         count(*) = jsonb_array_length(v_items)
  from jsonb_array_elements(v_items) l
  join public.profiles pr on pr.id = v_uid
  where l ->> 'tech_id' is not null
  group by l ->> 'tech_id', pr.full_name, pr.phone;
  return v_order;
end $$;

-- Move the technician's part of an order along: New → Accepted → Shipped → Delivered,
-- or Rejected before it ships. Rejected stock goes back on their listing.
create or replace function public.tech_set_order_status(p_id uuid, p_status text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  x public.tech_orders;
  v_order_status text;
  v_line jsonb;
begin
  if not public.is_technician() then raise exception 'Technicians only'; end if;
  select * into x from public.tech_orders where id = p_id and tech_id = auth.uid() for update;
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

  update public.tech_orders
     set status = p_status,
         reject_reason = case when p_status = 'Rejected' then left(coalesce(nullif(trim(p_reason), ''), 'Rejected by the technician'), 120) end
   where id = x.id;

  if p_status = 'Rejected' then
    for v_line in select * from jsonb_array_elements(x.items) loop
      update public.tech_listings l set stock = least(l.stock + (v_line ->> 'qty')::integer, 9999)
        from public.products p where p.id = v_line ->> 'id' and l.id = p.tech_listing_id;
    end loop;
  end if;

  -- The customer's order follows when it's entirely this technician's; mixed orders stay with ops.
  if x.whole_order then
    if p_status in ('Shipped', 'Delivered') then
      update public.orders set status = p_status where id = x.order_id;
    elsif p_status = 'Rejected' then
      update public.orders set status = 'Cancelled' where id = x.order_id;
    end if;
  end if;
end $$;

-- When ops cancel a customer's order, the technician stops working on it.
create or replace function public.on_order_cancel_techs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.tech_orders set status = 'Cancelled' where order_id = new.id and status in ('New', 'Accepted', 'Shipped');
  return new;
end $$;
drop trigger if exists orders_cancel_techs on public.orders;
create trigger orders_cancel_techs after update of status on public.orders
  for each row when (new.status = 'Cancelled' and old.status is distinct from 'Cancelled')
  execute function public.on_order_cancel_techs();

-- ─────── Row level security ───────
alter table public.tech_orders    enable row level security;
alter table public.tech_listings  enable row level security;
alter table public.tech_purchases enable row level security;

drop policy if exists "read active products" on public.products;
drop policy if exists "tech orders"          on public.tech_orders;
drop policy if exists "own listings"         on public.tech_listings;
drop policy if exists "edit own listing"     on public.tech_listings;
drop policy if exists "staff listings"       on public.tech_listings;
drop policy if exists "own purchases"        on public.tech_purchases;

create policy "read active products" on public.products for select using (
  (active and (dealer_id is null or public.dealer_live(dealer_id)) and (tech_id is null or public.tech_live(tech_id))) or public.is_staff()
  or (dealer_id is not null and dealer_id = public.my_dealer_id())
  or (tech_id is not null and tech_id = auth.uid())
);
create policy "tech orders" on public.tech_orders for select using (tech_id = auth.uid() or public.is_staff());
create policy "own listings"     on public.tech_listings for select using (tech_id = auth.uid() or public.is_staff());
create policy "edit own listing" on public.tech_listings for update using (tech_id = auth.uid()) with check (tech_id = auth.uid());
create policy "staff listings"   on public.tech_listings for all using (public.is_staff()) with check (public.is_staff());
-- Purchases are written only through tech_buy / tech_cancel_purchase / admin_tech_purchase.
create policy "own purchases"    on public.tech_purchases for select using (tech_id = auth.uid() or public.is_staff());

revoke execute on function public.tech_set_order_status(uuid, text, text) from anon;
revoke execute on function public.tech_buy(jsonb) from anon;
revoke execute on function public.tech_cancel_purchase(uuid) from anon;
revoke execute on function public.admin_tech_purchase(uuid, text, text) from anon;

-- ─────── Realtime ───────
do $$
declare t text;
begin
  foreach t in array array['tech_orders', 'tech_listings', 'tech_purchases'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Done. Deliver technicians' purchases in Admin → Technician Shop; their stock then
-- shows in the app as "Sold by <name> · Zavtoo technician".
