-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — technician spare-parts gallery migration
-- Technician app → Add spare part: technicians list parts (photos, price,
-- specs), staff approve them, and only approved parts can be shared with
-- customers. Same definitions as supabase/schema.sql, for databases created
-- before the gallery existed. The part-photos bucket comes from
-- supabase/storage-buckets-migration.sql. Safe to run again.
-- ═══════════════════════════════════════════════════════════════════════════

-- Spare-parts gallery: technicians list parts (photos, price, specs), staff approve
-- each one, and only approved parts can be shared with customers (public link).
create table if not exists public.tech_parts (
  id            uuid primary key default gen_random_uuid(),
  tech_id       uuid not null default auth.uid() references public.technicians (id) on delete cascade,
  name          text not null check (length(trim(name)) between 2 and 80),
  price         integer not null check (price > 0),
  specs         text not null default '' check (length(specs) <= 1000),
  -- Public URLs in the "part-photos" bucket.
  photos        text[] not null default '{}' check (cardinality(photos) between 1 and 4),
  status        text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  reject_reason text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tech_parts_tech_idx on public.tech_parts (tech_id, created_at desc);
create index if not exists tech_parts_status_idx on public.tech_parts (status, created_at desc);

-- A technician's edit always goes back for approval; only staff set the status.
create or replace function public.tech_parts_guard() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if public.is_staff() then
    if new.status is distinct from old.status then
      new.reviewed_at := now();
      if new.status <> 'Rejected' then new.reject_reason := null; end if;
    end if;
  else
    new.tech_id := old.tech_id;
    new.status := 'Pending';
    new.reject_reason := null;
    new.reviewed_at := null;
  end if;
  return new;
end $$;
drop trigger if exists tech_parts_guard on public.tech_parts;
create trigger tech_parts_guard before update on public.tech_parts for each row execute function public.tech_parts_guard();

alter table public.tech_parts enable row level security;
drop policy if exists "read parts gallery" on public.tech_parts;
drop policy if exists "tech adds part"     on public.tech_parts;
drop policy if exists "edit part"          on public.tech_parts;
drop policy if exists "delete part"        on public.tech_parts;
create policy "read parts gallery" on public.tech_parts for select using (status = 'Approved' or tech_id = auth.uid() or public.is_staff());
create policy "tech adds part"     on public.tech_parts for insert with check (tech_id = auth.uid() and public.is_technician() and status = 'Pending');
create policy "edit part"          on public.tech_parts for update using (tech_id = auth.uid() or public.is_staff()) with check (tech_id = auth.uid() or public.is_staff());
create policy "delete part"        on public.tech_parts for delete using (tech_id = auth.uid() or public.is_staff());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tech_parts') then
    alter publication supabase_realtime add table public.tech_parts;
  end if;
end $$;
