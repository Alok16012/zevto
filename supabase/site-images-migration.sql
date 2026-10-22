-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — website images migration
-- Every photo on the website comes from the admin panel: product photos from
-- Products & Stock (products.images) and the rest (hero, category tiles,
-- showcase gallery) from Website images (site_images). Run once in Supabase →
-- SQL Editor on a database that already has supabase/schema.sql applied.
-- Safe to run again. (Running the full schema.sql instead does the same thing.)
-- ═══════════════════════════════════════════════════════════════════════════

-- One row per spot on the website. `images` are public URLs (uploads go to the
-- product-images bucket under site-<slot>/); `captions` line up with `images`.
create table if not exists public.site_images (
  slot       text primary key,
  images     text[] not null default '{}',
  captions   text[] not null default '{}',
  updated_at timestamptz not null default now()
);

drop trigger if exists site_images_touch on public.site_images;
create trigger site_images_touch before update on public.site_images for each row execute function public.touch_updated_at();

alter table public.site_images enable row level security;
drop policy if exists "read site images"   on public.site_images;
drop policy if exists "staff site images"  on public.site_images;
create policy "read site images"  on public.site_images for select using (true);
create policy "staff site images" on public.site_images for all using (public.is_staff()) with check (public.is_staff());

-- Starting photos (served from the website's own folders) — replace them in the admin panel.
insert into public.site_images (slot, images, captions) values
  ('hero', '{/hero-kitchen-branded.jpg}', '{Zavtoo RO water purifier in a bright kitchen}'),
  ('tile-domestic', '{/products/featured/zavtoo-pro.png}', '{}'),
  ('tile-commercial', '{/products/featured/zavtoo-commercial-50.png}', '{}'),
  ('tile-spare', '{/products/parts/osmo-housing-1.jpg}', '{}'),
  ('tile-service', '{/products/parts/membrane-housing-2.jpg}', '{}'),
  ('showcase', '{/purifier-showcase/zavtoo-seaglass-v2.png,/purifier-showcase/zavtoo-graphite-v2.png,/purifier-showcase/zavtoo-pearl-v2.png,/purifier-showcase/zavtoo-titanium-v2.png,/purifier-showcase/zavtoo-aqua-v2.png}',
   '{"Sea-glass blue. Fresh and understated.","Graphite. A little more character.","Pearl white. Clean, contemporary lines.","Titanium grey. Quiet sophistication.","White and aqua. A natural pairing."}')
on conflict (slot) do nothing;

-- Purifier photos live on the products themselves (editable in Products & Stock).
update public.products set images = '{/products/featured/zavtoo-pro.png}'           where id in ('classic', 'pro') and images = '{}';
update public.products set images = '{/products/featured/zavtoo-premium.png}'       where id = 'premium' and images = '{}';
update public.products set images = '{/products/featured/zavtoo-commercial-50.png}' where id in ('commercial-50', 'commercial-100') and images = '{}';

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'site_images') then
    alter publication supabase_realtime add table public.site_images;
  end if;
end $$;
