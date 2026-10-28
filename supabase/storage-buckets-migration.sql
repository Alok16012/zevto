-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — photo storage buckets
-- Fixes "Bucket not found" when uploading photos in the admin panel. Creates the
-- public buckets for product / website photos and technician part photos, with
-- staff-only (and technician-only) upload rules. Run once in Supabase → SQL
-- Editor. Safe to run again; existing buckets and photos are left as they are.
-- (Same as the "Photo storage" part of supabase/schema.sql.)
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('part-photos', 'part-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
       ('product-images', 'product-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- product-images: <product id>/<file>.jpg, site-<slot>/…, showcase-<id>/…, <product id>-360/… — staff only
drop policy if exists "product images upload" on storage.objects;
drop policy if exists "product images delete" on storage.objects;
create policy "product images upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_staff());
create policy "product images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_staff());

-- part-photos: <technician uid>/<file>.jpg — the technician's own folder
drop policy if exists "part photos upload" on storage.objects;
drop policy if exists "part photos delete" on storage.objects;
create policy "part photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'part-photos' and public.is_technician() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "part photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'part-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
