-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — partner upgrade migration
-- Admin tasks, editable AMC plans, partner-only shop items, the dealer shop,
-- dealer tasks, technician self-purchases, a close code for finishing jobs and
-- shareable customer bills. Run once in Supabase → SQL Editor on a database that
-- already has schema.sql, dealer-migration.sql and technician-shop-migration.sql.
-- Safe to run again.
-- ═══════════════════════════════════════════════════════════════════════════

-- Spare parts and filters: 10-day warranty (was 30).
update public.products set warranty = '10 Days' where warranty = '30 Days';

-- ─────── Partner shop items ───────
-- Zavtoo products can be offered to technicians and/or dealers at a trade price.
-- shop_only items (e.g. POP material: banners, standees) are never shown to customers.
alter table public.products add column if not exists shop_only    boolean not null default false;
alter table public.products add column if not exists pop          boolean not null default false;
alter table public.products add column if not exists for_tech     boolean not null default true;
alter table public.products add column if not exists for_dealer   boolean not null default true;
alter table public.products add column if not exists trade_price  integer check (trade_price is null or trade_price >= 0);
-- A dealer listing made from a Zavtoo product the dealer bought.
alter table public.products add column if not exists from_product text;

-- Partners can't set the shop columns on their own listings.
create or replace function public.guard_product_partner() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_staff() then
    new.shop_only := false; new.pop := false; new.trade_price := null;
    new.for_tech := false; new.for_dealer := false;
    new.from_product := case when tg_op = 'UPDATE' then old.from_product end;
  end if;
  return new;
end $$;
drop trigger if exists guard_product_partner on public.products;
create trigger guard_product_partner before insert or update on public.products for each row execute function public.guard_product_partner();

drop policy if exists "read active products" on public.products;
create policy "read active products" on public.products for select using (
  (active and (not shop_only or public.is_technician() or public.is_dealer())
    and (dealer_id is null or public.dealer_live(dealer_id)) and (tech_id is null or public.tech_live(tech_id)))
  or public.is_staff()
  or (dealer_id is not null and dealer_id = public.my_dealer_id())
  or (tech_id is not null and tech_id = auth.uid())
);

-- Customers can't check out partner-only items.
create or replace function public.guard_order_items() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from jsonb_array_elements(new.items) i join public.products p on p.id = i ->> 'id' where p.shop_only) then
    raise exception 'This item is only sold to Zavtoo partners';
  end if;
  return new;
end $$;
drop trigger if exists guard_order_items on public.orders;
create trigger guard_order_items before insert on public.orders for each row execute function public.guard_order_items();

-- ─────── Technician shop: trade prices, POP items, self-purchases ───────
alter table public.tech_purchases add column if not exists self boolean not null default false;

create or replace function public.tech_buy(p_items jsonb) returns public.tech_purchases
language plpgsql security definer set search_path = public as $$
declare
  v_line jsonb; v_p public.products; v_qty integer; v_price integer;
  v_items jsonb := '[]'; v_amount integer := 0; v_row public.tech_purchases;
begin
  if not public.is_technician() then raise exception 'Technicians only'; end if;
  if not exists (select 1 from public.technicians where id = auth.uid() and active) then raise exception 'Your partner account isn''t active yet'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add something to buy'; end if;
  for v_line in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_line ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Invalid quantity'; end if;
    select * into v_p from public.products where id = v_line ->> 'id' and active and for_tech and dealer_id is null and tech_id is null;
    if not found then raise exception 'A product in your order is no longer available'; end if;
    if v_p.stock is not null and v_p.stock < v_qty then raise exception 'Zavtoo has only % of % in stock', v_p.stock, v_p.name; end if;
    v_price := coalesce(v_p.trade_price, v_p.price);
    v_items := v_items || jsonb_build_object('id', v_p.id, 'name', v_p.name, 'qty', v_qty, 'price', v_price, 'mrp', v_p.mrp, 'art', v_p.art, 'pop', v_p.pop);
    v_amount := v_amount + v_price * v_qty;
  end loop;
  insert into public.tech_purchases (tech_id, items, amount) values (auth.uid(), v_items, v_amount) returning * into v_row;
  return v_row;
end $$;

-- Delivered units go into the technician's shop; POP material is just handed over.
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
      if not v_p.pop then
        insert into public.tech_listings (tech_id, product_id, price, stock)
        values (x.tech_id, v_p.id, v_p.price, least(v_qty, 9999))
        on conflict (tech_id, product_id) do update set stock = least(public.tech_listings.stock + excluded.stock, 9999);
      end if;
    end loop;
  end if;
  update public.tech_purchases set status = p_status, note = nullif(left(trim(coalesce(p_note, '')), 160), '') where id = x.id;
end $$;

-- A technician bought a Zavtoo spare themselves (from the market): it goes straight into their stock.
create or replace function public.tech_add_own_stock(p_product text, p_qty integer, p_cost integer) returns public.tech_purchases
language plpgsql security definer set search_path = public as $$
declare v_p public.products; v_row public.tech_purchases;
begin
  if not public.is_technician() then raise exception 'Technicians only'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 99 then raise exception 'Enter a quantity from 1 to 99'; end if;
  if p_cost is null or p_cost < 0 or p_cost > 100000 then raise exception 'Enter what you paid per unit'; end if;
  select * into v_p from public.products where id = p_product and dealer_id is null and tech_id is null and not pop;
  if not found then raise exception 'Pick a product from the list'; end if;
  insert into public.tech_listings (tech_id, product_id, price, stock)
  values (auth.uid(), v_p.id, v_p.price, p_qty)
  on conflict (tech_id, product_id) do update set stock = least(public.tech_listings.stock + excluded.stock, 9999);
  insert into public.tech_purchases (tech_id, items, amount, status, self, note)
  values (auth.uid(), jsonb_build_array(jsonb_build_object('id', v_p.id, 'name', v_p.name, 'qty', p_qty, 'price', p_cost, 'mrp', v_p.mrp, 'art', v_p.art)),
          p_cost * p_qty, 'Delivered', true, 'Self purchase')
  returning * into v_row;
  return v_row;
end $$;

-- ─────── Dealer shop ───────
create sequence if not exists public.dealer_purchase_ref_seq start 1001;

create table if not exists public.dealer_purchases (
  id         uuid primary key default gen_random_uuid(),
  ref        text not null unique default ('DPO' || nextval('public.dealer_purchase_ref_seq')),
  dealer_id  uuid not null references public.dealers (id) on delete cascade,
  -- [{ "id": "membrane-75", "name": "...", "qty": 4, "price": 850, "pop": false }]
  items      jsonb not null,
  amount     integer not null,
  status     text not null default 'Pending' check (status in ('Pending', 'Delivered', 'Rejected', 'Cancelled')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dealer_purchases_dealer_idx on public.dealer_purchases (dealer_id, created_at desc);
drop trigger if exists dealer_purchases_touch on public.dealer_purchases;
create trigger dealer_purchases_touch before update on public.dealer_purchases for each row execute function public.touch_updated_at();

create or replace function public.dealer_buy(p_items jsonb) returns public.dealer_purchases
language plpgsql security definer set search_path = public as $$
declare
  v_dealer uuid := public.my_dealer_id();
  v_line jsonb; v_p public.products; v_qty integer; v_price integer;
  v_items jsonb := '[]'; v_amount integer := 0; v_row public.dealer_purchases;
begin
  if v_dealer is null then raise exception 'Dealers only'; end if;
  if not exists (select 1 from public.dealers where id = v_dealer and active) then raise exception 'Your shop is paused'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add something to buy'; end if;
  for v_line in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_line ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 999 then raise exception 'Invalid quantity'; end if;
    select * into v_p from public.products where id = v_line ->> 'id' and active and for_dealer and dealer_id is null and tech_id is null;
    if not found then raise exception 'A product in your order is no longer available'; end if;
    if v_p.stock is not null and v_p.stock < v_qty then raise exception 'Zavtoo has only % of % in stock', v_p.stock, v_p.name; end if;
    v_price := coalesce(v_p.trade_price, v_p.price);
    v_items := v_items || jsonb_build_object('id', v_p.id, 'name', v_p.name, 'qty', v_qty, 'price', v_price, 'mrp', v_p.mrp, 'art', v_p.art, 'pop', v_p.pop);
    v_amount := v_amount + v_price * v_qty;
  end loop;
  insert into public.dealer_purchases (dealer_id, items, amount) values (v_dealer, v_items, v_amount) returning * into v_row;
  return v_row;
end $$;

create or replace function public.dealer_cancel_purchase(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.dealer_purchases set status = 'Cancelled' where id = p_id and dealer_id = public.my_dealer_id() and status = 'Pending';
  if not found then raise exception 'This purchase can''t be cancelled now'; end if;
end $$;

-- Delivered spares/products land in the dealer's listings (paused, ready to price);
-- POP material is just handed over.
create or replace function public.admin_dealer_purchase(p_id uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare x public.dealer_purchases; v_line jsonb; v_qty integer; v_p public.products; v_listing text;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if p_status not in ('Delivered', 'Rejected') then raise exception 'Choose Delivered or Rejected'; end if;
  select * into x from public.dealer_purchases where id = p_id and status = 'Pending' for update;
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
      if not v_p.pop then
        select id into v_listing from public.products where dealer_id = x.dealer_id and from_product = v_p.id limit 1;
        if found then
          update public.products set stock = coalesce(stock, 0) + v_qty where id = v_listing;
        else
          insert into public.products (id, name, spec, price, mrp, category, art, stages, warranty, description, stock, active, sort, images, dealer_id, from_product)
          values ('dl-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), v_p.name, v_p.spec, v_p.price, v_p.mrp, v_p.category, v_p.art,
                  v_p.stages, v_p.warranty, v_p.description, v_qty, false, 1000, v_p.images, x.dealer_id, v_p.id);
        end if;
      end if;
    end loop;
  end if;
  update public.dealer_purchases set status = p_status, note = nullif(left(trim(coalesce(p_note, '')), 160), '') where id = x.id;
end $$;

alter table public.dealer_purchases enable row level security;
drop policy if exists "own dealer purchases" on public.dealer_purchases;
create policy "own dealer purchases" on public.dealer_purchases for select using (dealer_id = public.my_dealer_id() or public.is_staff());

-- ─────── Tasks raised by admin and dealers ───────
alter table public.service_requests drop constraint if exists service_requests_source_check;
alter table public.service_requests add constraint service_requests_source_check check (source in ('customer', 'technician', 'admin', 'dealer'));
alter table public.service_requests add column if not exists raised_dealer uuid references public.dealers (id) on delete set null;

-- Close codes: the customer reads one out before the technician can finish the job.
alter table public.service_otps add column if not exists close_otp text;
create or replace function public.fill_close_otp() returns trigger
language plpgsql as $$
begin
  if new.close_otp is null then new.close_otp := lpad((floor(random() * 9000) + 1000)::text, 4, '0'); end if;
  return new;
end $$;
drop trigger if exists fill_close_otp on public.service_otps;
create trigger fill_close_otp before insert on public.service_otps for each row execute function public.fill_close_otp();
update public.service_otps set close_otp = lpad((floor(random() * 9000) + 1000)::text, 4, '0') where close_otp is null;

create or replace function public.my_close_code(p_request uuid) returns text
language sql stable security definer set search_path = public as $$
  select o.close_otp from public.service_otps o join public.service_requests r on r.id = o.request_id
  where o.request_id = p_request and r.customer_id = auth.uid()
$$;

-- Ops book a job by phone: for an app customer (they get start/close codes) or anyone else.
create or replace function public.admin_create_task(
  p_customer uuid, p_name text, p_phone text, p_address text, p_pincode text, p_type text, p_product text,
  p_date date, p_slot text, p_issue text, p_tech uuid
) returns public.service_requests language plpgsql security definer set search_path = public as $$
declare v_svc public.service_catalog; v_req public.service_requests;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  select * into v_svc from public.service_catalog where type = p_type;
  if not found then raise exception 'Unknown service'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(coalesce(p_address, ''))) < 8 then raise exception 'Enter the customer''s name and full address'; end if;
  if p_pincode !~ '^[1-9][0-9]{5}$' then raise exception 'Enter a valid pincode'; end if;
  if p_tech is not null and not exists (select 1 from public.technicians where id = p_tech and active and kyc = 'Verified') then
    raise exception 'Pick an active, verified technician';
  end if;
  insert into public.service_requests (
    customer_id, customer_name, customer_phone, address, pincode, type, product, visit_date, slot, description,
    price, amount, status, source, tech_id, assigned_at
  ) values (
    p_customer, trim(p_name), coalesce(p_phone, ''), trim(p_address), p_pincode, p_type, coalesce(nullif(trim(p_product), ''), 'RO purifier'),
    p_date, coalesce(nullif(trim(p_slot), ''), 'Any time'), coalesce(trim(p_issue), ''), v_svc.price, v_svc.price,
    case when p_tech is not null then 'Assigned' else 'With ops' end, 'admin', p_tech, case when p_tech is not null then now() end
  ) returning * into v_req;
  if p_customer is not null then
    insert into public.service_otps (request_id, otp) values (v_req.id, lpad((floor(random() * 9000) + 1000)::text, 4, '0'));
  end if;
  return v_req;
end $$;

-- A dealer raises a task: hand it to someone on their team, or send it to Zavtoo.
create or replace function public.dealer_create_task(
  p_name text, p_phone text, p_address text, p_pincode text, p_type text, p_product text,
  p_date date, p_slot text, p_issue text, p_tech uuid
) returns public.service_requests language plpgsql security definer set search_path = public as $$
declare v_dealer uuid := public.my_dealer_id(); v_svc public.service_catalog; v_req public.service_requests;
begin
  if v_dealer is null then raise exception 'Dealers only'; end if;
  if not exists (select 1 from public.dealers where id = v_dealer and active and kyc = 'Verified') then
    raise exception 'Tasks open up once your shop is verified';
  end if;
  select * into v_svc from public.service_catalog where type = p_type;
  if not found then raise exception 'Unknown service'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(coalesce(p_address, ''))) < 8 then raise exception 'Enter the customer''s name and full address'; end if;
  if p_pincode !~ '^[1-9][0-9]{5}$' then raise exception 'Enter a valid pincode'; end if;
  if p_tech is not null then
    if not exists (select 1 from public.technicians where id = p_tech and dealer_id = v_dealer and active) then
      raise exception 'Pick a technician from your team';
    end if;
    if coalesce(trim(p_slot), '') in ('', 'Any time') then raise exception 'Pick a time slot'; end if;
  end if;
  insert into public.service_requests (
    customer_name, customer_phone, address, pincode, type, product, visit_date, slot, description,
    price, amount, status, source, raised_dealer, tech_id, assigned_at
  ) values (
    trim(p_name), coalesce(p_phone, ''), trim(p_address), p_pincode, p_type, coalesce(nullif(trim(p_product), ''), 'RO purifier'),
    p_date, coalesce(nullif(trim(p_slot), ''), 'Any time'), coalesce(trim(p_issue), ''), v_svc.price, v_svc.price,
    case when p_tech is not null then 'Assigned' else 'With ops' end, 'dealer', v_dealer, p_tech, case when p_tech is not null then now() end
  ) returning * into v_req;
  return v_req;
end $$;

drop policy if exists "see jobs" on public.service_requests;
create policy "see jobs" on public.service_requests for select using (
  customer_id = auth.uid() or tech_id = auth.uid() or raised_by = auth.uid()
  or (preferred_tech_id = auth.uid() and status = 'Requested') or public.is_staff()
  or (public.is_dealer() and public.dealer_sees_job(tech_id, preferred_tech_id, status, pincode))
  or (raised_dealer is not null and raised_dealer = public.my_dealer_id())
);

-- ─────── Parts on a job: van stock, shop stock, or bought on the spot ───────
-- parts lines: { "id": "sed", "qty": 1 }                    van part (parts table)
--              { "listing": "<uuid>", "qty": 1 }            from the technician's shop stock
--              { "own": true, "name": "...", "price": 250, "qty": 1 }   bought by the technician
-- On completion each line is saved with its name and price for the bill.
drop function if exists public.tech_complete_job(uuid, text);
create or replace function public.tech_complete_job(p_request uuid, p_payment text, p_code text default null) returns public.service_requests
language plpgsql security definer set search_path = public as $$
declare
  r public.service_requests := public.tech_job(p_request);
  v_line jsonb; v_qty integer; v_part public.parts; v_l public.tech_listings; v_name text;
  v_lines jsonb := '[]'; v_parts_total integer; v_close text; v_amc boolean; v_out public.service_requests;
begin
  if r.status <> 'In Progress' then raise exception 'Start the job first'; end if;
  if coalesce(r.tds_after, '') = '' then raise exception 'Add the output TDS reading first'; end if;
  if p_payment not in ('Cash', 'UPI', 'AMC covered') then raise exception 'Choose how the customer paid'; end if;
  select close_otp into v_close from public.service_otps where request_id = r.id;
  if r.customer_id is not null and v_close is not null and coalesce(p_code, '') <> v_close then
    raise exception 'Wrong close code — ask the customer to check their Zavtoo app';
  end if;
  v_amc := r.type = 'AMC' and r.price = 0;
  for v_line in select * from jsonb_array_elements(r.parts) loop
    v_qty := greatest(coalesce((v_line ->> 'qty')::integer, 0), 0);
    if v_qty = 0 then continue; end if;
    if coalesce((v_line ->> 'own')::boolean, false) then
      v_lines := v_lines || jsonb_build_object('src', 'own', 'name', left(coalesce(nullif(trim(v_line ->> 'name'), ''), 'Spare part'), 80),
        'price', least(greatest(coalesce((v_line ->> 'price')::integer, 0), 0), 100000), 'qty', v_qty);
    elsif v_line ? 'listing' then
      select * into v_l from public.tech_listings where id = (v_line ->> 'listing')::uuid and tech_id = auth.uid() for update;
      if not found then continue; end if;
      select name into v_name from public.products where id = v_l.product_id;
      if v_l.stock < v_qty then raise exception 'Only % of % left in your stock', v_l.stock, v_name; end if;
      update public.tech_listings set stock = stock - v_qty where id = v_l.id;
      v_lines := v_lines || jsonb_build_object('src', 'stock', 'listing', v_l.id, 'id', v_l.product_id, 'name', v_name, 'price', v_l.price, 'qty', v_qty);
    else
      select * into v_part from public.parts where id = v_line ->> 'id';
      if not found then continue; end if;
      update public.tech_stock set qty = greatest(qty - v_qty, 0) where tech_id = auth.uid() and part_id = v_part.id;
      v_lines := v_lines || jsonb_build_object('src', 'van', 'id', v_part.id, 'name', v_part.name, 'price', v_part.price, 'qty', v_qty);
    end if;
  end loop;
  select coalesce(sum((x ->> 'price')::integer * (x ->> 'qty')::integer), 0) into v_parts_total from jsonb_array_elements(v_lines) x;
  update public.service_requests
     set status = 'Completed', completed_at = now(), payment = p_payment, parts = v_lines,
         amount = case when v_amc then 0 else r.price - r.discount + v_parts_total end
   where id = r.id returning * into v_out;
  update public.technicians set jobs_done = jobs_done + 1, status = 'Online' where id = auth.uid();
  return v_out;
end $$;

-- ─────── Customer bills ───────
-- Each job gets a secret link token; the bill page shows a completed job to anyone with the link.
alter table public.service_requests add column if not exists bill_token uuid not null default gen_random_uuid();

create or replace function public.public_bill(p_id uuid, p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ref', r.ref, 'customer_name', r.customer_name, 'customer_phone', r.customer_phone, 'address', r.address,
    'type', r.type, 'product', r.product, 'visit_date', r.visit_date, 'completed_at', r.completed_at,
    'price', r.price, 'discount', r.discount, 'amount', r.amount, 'coupon', r.coupon, 'parts', r.parts, 'payment', r.payment,
    'tds_before', r.tds_before, 'tds_after', r.tds_after, 'notes', r.tech_notes,
    'tech_name', t.name, 'tech_code', t.code
  )
  from public.service_requests r left join public.technicians t on t.id = r.tech_id
  where r.id = p_id and r.bill_token = p_token and r.status = 'Completed'
$$;
grant execute on function public.public_bill(uuid, uuid) to anon, authenticated;

-- ─────── AMC plans (editable in Admin → Services & AMC) ───────
create table if not exists public.amc_plans (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  icon     text not null default '',
  price    integer not null check (price >= 0),
  best     boolean not null default false,
  features text[] not null default '{}',
  active   boolean not null default true,
  sort     integer not null default 0
);
insert into public.amc_plans (name, icon, price, best, features, sort)
select * from (values
  ('Silver Plan', '🥈', 999, false, array['2 Service Visits', 'Filter Inspection', 'Basic Cleaning', 'Phone Support'], 1),
  ('Gold Plan', '🥇', 1799, true, array['4 Service Visits', 'Free Filters Included', 'Deep Cleaning', 'Priority Support', '20% Off Spare Parts'], 2),
  ('Platinum Plan', '💎', 2999, false, array['6 Service Visits', 'All Parts Free', 'UV Sanitization', '24/7 Emergency', '30% Off All Parts'], 3)
) v where not exists (select 1 from public.amc_plans);

alter table public.amc_plans enable row level security;
drop policy if exists "read amc plans" on public.amc_plans;
drop policy if exists "staff manage amc plans" on public.amc_plans;
create policy "read amc plans" on public.amc_plans for select using (active or public.is_staff());
create policy "staff manage amc plans" on public.amc_plans for all using (public.is_staff()) with check (public.is_staff());

-- ─────── Grants ───────
revoke execute on function public.tech_add_own_stock(text, integer, integer) from anon;
revoke execute on function public.dealer_buy(jsonb) from anon;
revoke execute on function public.dealer_cancel_purchase(uuid) from anon;
revoke execute on function public.admin_dealer_purchase(uuid, text, text) from anon;
revoke execute on function public.admin_create_task(uuid, text, text, text, text, text, text, date, text, text, uuid) from anon;
revoke execute on function public.dealer_create_task(text, text, text, text, text, text, date, text, text, uuid) from anon;
revoke execute on function public.tech_complete_job(uuid, text, text) from anon;
revoke execute on function public.my_close_code(uuid) from anon;

-- ─────── Realtime ───────
do $$
declare t text;
begin
  foreach t in array array['dealer_purchases', 'amc_plans', 'service_otps'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Done.
