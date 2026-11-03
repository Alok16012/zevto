-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — invoice settings migration
-- Admin → Invoice Settings: the company profile printed on bills (address,
-- GSTIN, bank details), how the printed invoice looks (colour, logo, payment
-- QR, stamp & signature, header / footer images, which blocks show) and the
-- terms & conditions templates picked per bill. Run once in Supabase → SQL
-- Editor on a database that already has supabase/parties-migration.sql applied.
-- Safe to run again.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────── Terms & conditions templates ───────
-- name: what admins pick from ("AMC 1500 TDS"); body: printed as-is, one point per line.
create table if not exists public.invoice_terms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) >= 2),
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists invoice_terms_touch on public.invoice_terms;
create trigger invoice_terms_touch before update on public.invoice_terms for each row execute function public.touch_updated_at();

-- ─────── Invoice settings (a single row, id = 1) ───────
-- Images are public URLs in the product-images bucket under invoice-<kind>/.
create table if not exists public.invoice_settings (
  id             integer primary key default 1 check (id = 1),
  company_name   text not null default 'Zavtoo Paani Filter Pvt Ltd',
  address        text not null default 'K-15, Raja Puri, Dwarka Road, New Delhi – 110059',
  state          text not null default 'Delhi',
  phone          text not null default '89-294-546-47',
  phone2         text not null default '',
  email          text not null default 'Paanifilter9@gmail.com',
  website        text not null default 'zavtoo.in',
  gstin          text not null default '',
  bank_name      text not null default '',
  account_name   text not null default '',
  account_no     text not null default '',
  branch         text not null default '',
  ifsc           text not null default '',
  upi_id         text not null default '',
  colour         text not null default '#0b5394' check (colour ~ '^#[0-9a-fA-F]{6}$'),
  terms_position text not null default 'Same Page' check (terms_position in ('Same Page', 'Second Page')),
  show_header    boolean not null default true,
  show_footer    boolean not null default true,
  show_logo      boolean not null default true,
  show_bank      boolean not null default true,
  show_qr        boolean not null default true,
  show_signature boolean not null default true,
  logo_url       text not null default '',
  qr_url         text not null default '',
  signature_url  text not null default '',
  header_url     text not null default '',
  footer_url     text not null default '',
  default_terms  uuid references public.invoice_terms (id) on delete set null,
  updated_at     timestamptz not null default now()
);

drop trigger if exists invoice_settings_touch on public.invoice_settings;
create trigger invoice_settings_touch before update on public.invoice_settings for each row execute function public.touch_updated_at();

insert into public.invoice_settings (id) values (1) on conflict (id) do nothing;

-- ─────── Terms on each bill ───────
-- The template chosen when the bill was made; its current text is printed.
alter table public.party_bills add column if not exists terms_id uuid references public.invoice_terms (id) on delete set null;

-- Bills are written only through RPCs, so picking terms has its own.
create or replace function public.admin_set_bill_terms(p_bill uuid, p_terms uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if p_terms is not null and not exists (select 1 from public.invoice_terms where id = p_terms) then raise exception 'Unknown terms'; end if;
  update public.party_bills set terms_id = p_terms where id = p_bill;
  if not found then raise exception 'Bill not found'; end if;
end $$;
revoke execute on function public.admin_set_bill_terms(uuid, uuid) from public, anon;
grant execute on function public.admin_set_bill_terms(uuid, uuid) to authenticated;

-- ─────── Access: staff only (bank details live here) ───────
alter table public.invoice_settings enable row level security;
alter table public.invoice_terms    enable row level security;
drop policy if exists "staff invoice settings" on public.invoice_settings;
drop policy if exists "staff invoice terms"    on public.invoice_terms;
create policy "staff invoice settings" on public.invoice_settings for all using (public.is_staff()) with check (public.is_staff());
create policy "staff invoice terms"    on public.invoice_terms    for all using (public.is_staff()) with check (public.is_staff());
