-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — spare parts showcase migration
-- The "Spare parts we supply" section on the website (shop and services pages)
-- comes from the admin panel (Website Images → Spare parts showcase). Run once in
-- Supabase → SQL Editor on a database that already has supabase/schema.sql applied.
-- Safe to run again. (Running the full schema.sql instead does the same thing.)
-- ═══════════════════════════════════════════════════════════════════════════

-- One card per part. `photos` are public URLs (uploads go to the product-images
-- bucket under showcase-<id>/). `product_id` links "View & buy" to a shop product;
-- without it the card offers "Get price on WhatsApp".
create table if not exists public.showcase_parts (
  id         text primary key,
  name       text not null,
  text       text not null default '',
  tags       text[] not null default '{}',
  photos     text[] not null default '{}',
  product_id text references public.products (id) on delete set null,
  sort       integer not null default 0,
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists showcase_parts_touch on public.showcase_parts;
create trigger showcase_parts_touch before update on public.showcase_parts for each row execute function public.touch_updated_at();

alter table public.showcase_parts enable row level security;
drop policy if exists "read showcase parts"  on public.showcase_parts;
drop policy if exists "staff showcase parts" on public.showcase_parts;
create policy "read showcase parts"  on public.showcase_parts for select using (active or public.is_staff());
create policy "staff showcase parts" on public.showcase_parts for all using (public.is_staff()) with check (public.is_staff());

-- Starting cards (photos served from the website's /products/parts folder) — edit them in the admin panel.
insert into public.showcase_parts (id, name, text, tags, photos, product_id, sort) values
  ('blue-cap-cartridge', 'Inline Filter Cartridge — Blue Twist Cap', 'White inline cartridge with a blue twist-lock cap. Opens fully: blue inner core sealed with a red O-ring, so it can be cleaned and refilled.', '{"Twist-lock cap","O-ring sealed","Refillable"}', '{"/products/parts/blue-cap-cartridge-1.jpg","/products/parts/blue-cap-cartridge-2.jpg","/products/parts/blue-cap-cartridge-3.jpg"}', null, 1),
  ('grey-cap-cartridge', 'Inline Filter Cartridge — Grey Twist Cap', 'White inline cartridge with a grey twist-lock cap and dark inner core with red sealing ring. Unscrews for cleaning and media change.', '{"Twist-lock cap","Sealed inner core","Refillable"}', '{"/products/parts/grey-cap-cartridge-1.jpg","/products/parts/grey-cap-cartridge-2.jpg","/products/parts/grey-cap-cartridge-3.jpg"}', null, 2),
  ('black-inline-cartridge', 'Black Inline Filter Cartridge', 'Glossy black inline cartridge with push-fit inlet and outlet ports and a screw-fixed end cap for a secure, leak-free fit.', '{"Push-fit ports","Screw-fixed cap","Compact"}', '{"/products/parts/black-inline-cartridge-1.jpg","/products/parts/black-inline-cartridge-2.jpg","/products/parts/black-inline-cartridge-3.jpg"}', null, 3),
  ('osmo-housing', 'OSMO Filter Housing with Wall Clamp', 'White OSMO housing with a clear bowl, black screw cap with red sealing ring, side push-fit ports and a wall-mounting clamp.', '{"Clear bowl","Wall clamp included","Push-fit ports"}', '{"/products/parts/osmo-housing-1.jpg","/products/parts/osmo-housing-2.jpg","/products/parts/osmo-housing-3.jpg"}', null, 4),
  ('membrane-housing', 'RO Membrane Housing (White)', 'White RO membrane housing with a threaded screw cap, red O-ring seal and push-fit end ports for domestic RO purifiers.', '{"Threaded cap","O-ring seal","Push-fit ports"}', '{"/products/parts/membrane-housing-1.jpg","/products/parts/membrane-housing-2.jpg","/products/parts/membrane-housing-3.jpg"}', null, 5),
  ('sediment-spun-filter', 'PP Spun Sediment Filter', 'Melt-blown polypropylene spun cartridge that traps dirt, sand and rust before they reach the membrane.', '{"Spun PP","Pre-filter","All brands"}', '{"/products/parts/sediment-spun-filter-1.jpg","/products/parts/sediment-spun-filter-2.jpg","/products/parts/sediment-spun-filter-3.jpg"}', 'sediment-5', 6)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'showcase_parts') then
    alter publication supabase_realtime add table public.showcase_parts;
  end if;
end $$;
