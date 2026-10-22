-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — parties, purchases, sales & ledger migration
-- Admin → Parties & Ledger: dealers (we sell to them), vendors and suppliers (we
-- buy spare parts from them), purchase bills (stock in), sale bills (stock out)
-- and payments, with a running balance per party. Run once in Supabase → SQL
-- Editor on a database that already has supabase/schema.sql applied.
-- Safe to run again. (Running the full schema.sql instead does the same thing.)
-- ═══════════════════════════════════════════════════════════════════════════

create sequence if not exists public.party_code_seq    start 400101;
create sequence if not exists public.purchase_ref_seq  start 1001;
create sequence if not exists public.sale_ref_seq      start 1001;

-- ─────── Parties ───────
-- Every dealer in the dealers table has a matching 'Dealer' party (dealer_id set),
-- so dealers from the dealer app and dealers we bill here are the same people.
-- opening_balance: what the party owed us when they were added (negative = we owed them).
create table if not exists public.parties (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique default ('PTY-' || nextval('public.party_code_seq')),
  type            text not null check (type in ('Dealer', 'Vendor', 'Supplier')),
  name            text not null check (length(trim(name)) >= 2),
  contact         text not null default '',
  phone           text not null default '',
  email           text not null default '',
  gstin           text not null default '',
  address         text not null default '',
  city            text not null default '',
  state           text not null default '',
  opening_balance integer not null default 0,
  dealer_id       uuid unique references public.dealers (id) on delete set null,
  active          boolean not null default true,
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists parties_type_idx on public.parties (type);

drop trigger if exists parties_touch on public.parties;
create trigger parties_touch before update on public.parties for each row execute function public.touch_updated_at();

-- New dealers (added by admin or self sign-up) become Dealer parties automatically.
create or replace function public.dealer_to_party() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.parties (type, name, contact, phone, email, gstin, address, city, dealer_id)
  values ('Dealer', new.name, coalesce(new.owner, ''), coalesce(new.phone, ''), coalesce(new.email, ''), coalesce(new.gstin, ''),
          coalesce(new.address, ''), coalesce(new.city, ''), new.id)
  on conflict (dealer_id) do nothing;
  return new;
end $$;
drop trigger if exists dealer_to_party on public.dealers;
create trigger dealer_to_party after insert on public.dealers for each row execute function public.dealer_to_party();

insert into public.parties (type, name, contact, phone, email, gstin, address, city, dealer_id)
select 'Dealer', d.name, coalesce(d.owner, ''), coalesce(d.phone, ''), coalesce(d.email, ''), coalesce(d.gstin, ''),
       coalesce(d.address, ''), coalesce(d.city, ''), d.id
from public.dealers d
on conflict (dealer_id) do nothing;

-- ─────── Bills (purchase = stock in, sale = stock out) ───────
-- items: [{"product_id": "...", "name": "...", "qty": 2, "rate": 450}] — names are a snapshot.
-- Written only through admin_post_bill / admin_cancel_bill so stock always matches.
create table if not exists public.party_bills (
  id         uuid primary key default gen_random_uuid(),
  ref        text not null unique,
  kind       text not null check (kind in ('Purchase', 'Sale')),
  party_id   uuid not null references public.parties (id) on delete restrict,
  bill_no    text not null default '',
  bill_date  date not null default current_date,
  items      jsonb not null,
  subtotal   integer not null check (subtotal >= 0),
  tax        integer not null default 0 check (tax >= 0),
  total      integer not null check (total >= 0),
  notes      text not null default '',
  status     text not null default 'Posted' check (status in ('Posted', 'Cancelled')),
  cancel_reason text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists party_bills_party_idx on public.party_bills (party_id, bill_date);

-- ─────── Payments ───────
-- Received = money the party paid us; Paid = money we paid the party.
create table if not exists public.party_payments (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid not null references public.parties (id) on delete restrict,
  kind       text not null check (kind in ('Received', 'Paid')),
  amount     integer not null check (amount > 0),
  mode       text not null default 'Cash' check (mode in ('Cash', 'UPI', 'Bank transfer', 'Cheque', 'Other')),
  reference  text not null default '',
  paid_on    date not null default current_date,
  notes      text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists party_payments_party_idx on public.party_payments (party_id, paid_on);

-- ─────── Posting & cancelling bills ───────
create or replace function public.admin_post_bill(p_kind text, p_party uuid, p_bill_no text, p_bill_date date, p_items jsonb, p_tax integer, p_notes text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_party public.parties; v_item jsonb; v_prod public.products; v_qty integer; v_rate integer;
  v_lines jsonb := '[]'::jsonb; v_sub bigint := 0; v_ref text; v_seen text[] := '{}';
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if p_kind not in ('Purchase', 'Sale') then raise exception 'Unknown bill type'; end if;
  select * into v_party from public.parties where id = p_party;
  if not found then raise exception 'Choose a party'; end if;
  if not v_party.active then raise exception '% is inactive — activate the party first', v_party.name; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add at least one item'; end if;
  if jsonb_array_length(p_items) > 60 then raise exception 'Up to 60 items per bill'; end if;
  if coalesce(p_tax, 0) < 0 then raise exception 'Tax can''t be negative'; end if;
  if p_bill_date is null or p_bill_date > current_date + 1 then raise exception 'Enter a valid bill date'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::integer;
    v_rate := (v_item->>'rate')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 100000 then raise exception 'Enter a quantity between 1 and 100000'; end if;
    if v_rate is null or v_rate < 0 or v_rate > 10000000 then raise exception 'Enter a valid rate'; end if;
    if (v_item->>'product_id') = any (v_seen) then raise exception 'Each product can appear once per bill'; end if;
    v_seen := v_seen || (v_item->>'product_id');
    -- Only Zavtoo's own catalogue; dealer and technician listings keep their own stock.
    select * into v_prod from public.products where id = v_item->>'product_id' and dealer_id is null and tech_id is null for update;
    if not found then raise exception 'Unknown product on the bill'; end if;
    if p_kind = 'Sale' then
      if v_prod.stock is not null and v_prod.stock < v_qty then
        raise exception 'Only % of % in stock', v_prod.stock, v_prod.name;
      end if;
      if v_prod.stock is not null then update public.products set stock = stock - v_qty where id = v_prod.id; end if;
    else
      update public.products set stock = coalesce(stock, 0) + v_qty where id = v_prod.id;
    end if;
    v_lines := v_lines || jsonb_build_object('product_id', v_prod.id, 'name', v_prod.name, 'qty', v_qty, 'rate', v_rate);
    v_sub := v_sub + v_qty::bigint * v_rate;
  end loop;
  if v_sub + coalesce(p_tax, 0) > 2000000000 then raise exception 'Bill total is too large'; end if;

  v_ref := case when p_kind = 'Purchase' then 'PUR-' || nextval('public.purchase_ref_seq') else 'SAL-' || nextval('public.sale_ref_seq') end;
  insert into public.party_bills (ref, kind, party_id, bill_no, bill_date, items, subtotal, tax, total, notes)
  values (v_ref, p_kind, p_party, left(trim(coalesce(p_bill_no, '')), 60), p_bill_date, v_lines, v_sub, coalesce(p_tax, 0), v_sub + coalesce(p_tax, 0),
          left(trim(coalesce(p_notes, '')), 500));
  return v_ref;
end $$;

-- Cancelling reverses the stock movement; the bill stays on record as Cancelled.
create or replace function public.admin_cancel_bill(p_bill uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_bill public.party_bills; v_item jsonb; v_prod public.products; v_qty integer;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  select * into v_bill from public.party_bills where id = p_bill for update;
  if not found or v_bill.status <> 'Posted' then raise exception 'Bill already cancelled'; end if;
  for v_item in select * from jsonb_array_elements(v_bill.items) loop
    v_qty := (v_item->>'qty')::integer;
    select * into v_prod from public.products where id = v_item->>'product_id' for update;
    if not found then continue; end if;
    if v_bill.kind = 'Purchase' then
      if coalesce(v_prod.stock, 0) < v_qty then
        raise exception 'Can''t cancel: only % of % left in stock (some were already sold)', coalesce(v_prod.stock, 0), v_prod.name;
      end if;
      update public.products set stock = stock - v_qty where id = v_prod.id;
    elsif v_prod.stock is not null then
      update public.products set stock = stock + v_qty where id = v_prod.id;
    end if;
  end loop;
  update public.party_bills set status = 'Cancelled', cancel_reason = left(trim(coalesce(p_reason, '')), 300) where id = p_bill;
end $$;

revoke execute on function public.admin_post_bill(text, uuid, text, date, jsonb, integer, text) from public, anon;
revoke execute on function public.admin_cancel_bill(uuid, text) from public, anon;
grant execute on function public.admin_post_bill(text, uuid, text, date, jsonb, integer, text) to authenticated;
grant execute on function public.admin_cancel_bill(uuid, text) to authenticated;

-- ─────── Row level security (staff only) ───────
alter table public.parties        enable row level security;
alter table public.party_bills    enable row level security;
alter table public.party_payments enable row level security;
drop policy if exists "staff parties"        on public.parties;
drop policy if exists "staff read bills"     on public.party_bills;
drop policy if exists "staff party payments" on public.party_payments;
create policy "staff parties"        on public.parties        for all    using (public.is_staff()) with check (public.is_staff());
create policy "staff read bills"     on public.party_bills    for select using (public.is_staff());
create policy "staff party payments" on public.party_payments for all    using (public.is_staff()) with check (public.is_staff());

-- ─────── Realtime ───────
do $$
declare t text;
begin
  foreach t in array array['parties', 'party_bills', 'party_payments'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
