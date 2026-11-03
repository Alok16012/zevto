-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — technician earning schedules migration
-- Admin → Earning Schedules: how each technician is paid. A schedule sets the
-- pay basis (commission, salary, or salary + commission), the commission on
-- services and on spare parts (a percentage or a fixed ₹ amount), and the
-- travel allowance per kilometre. One schedule is the default; any technician
-- can be put on a different one. Run once in Supabase → SQL Editor on a
-- database that already has supabase/schema.sql applied. Safe to run again.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.earning_schedules (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(trim(name)) >= 2),
  pay_basis      text not null default 'Commission' check (pay_basis in ('Commission', 'Salary', 'Salary + Commission')),
  monthly_salary integer not null default 0 check (monthly_salary between 0 and 10000000),
  -- Service: Percent = % of the visit charge; Fixed = ₹ per completed job.
  service_mode   text not null default 'Percent' check (service_mode in ('Percent', 'Fixed')),
  service_value  integer not null default 0 check (service_value >= 0),
  -- Free jobs (installs, AMC visits — no visit charge): ₹ per job.
  free_job_fee   integer not null default 0 check (free_job_fee >= 0),
  -- Parts: Percent = % of the parts value; Fixed = ₹ per part unit fitted.
  parts_mode     text not null default 'Percent' check (parts_mode in ('Percent', 'Fixed')),
  parts_value    integer not null default 0 check (parts_value >= 0),
  -- Travel: ₹ per km of the trip to the customer, doubled when round_trip.
  km_rate        numeric(7,2) not null default 0 check (km_rate >= 0),
  round_trip     boolean not null default true,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (service_mode <> 'Percent' or service_value <= 100),
  check (parts_mode <> 'Percent' or parts_value <= 100)
);
create unique index if not exists earning_schedules_one_default on public.earning_schedules (is_default) where is_default;

drop trigger if exists earning_schedules_touch on public.earning_schedules;
create trigger earning_schedules_touch before update on public.earning_schedules for each row execute function public.touch_updated_at();

-- Making a schedule the default takes the flag off the old one.
create or replace function public.single_default_schedule() returns trigger
language plpgsql as $$
begin
  update public.earning_schedules set is_default = false where id <> new.id and is_default;
  return new;
end $$;
drop trigger if exists single_default_schedule on public.earning_schedules;
create trigger single_default_schedule before insert or update of is_default on public.earning_schedules
  for each row when (new.is_default) execute function public.single_default_schedule();

-- Which schedule a technician is on (no row = the default). Kept apart from
-- technicians, which technicians can edit themselves.
create table if not exists public.tech_earning_plans (
  tech_id     uuid primary key references public.technicians (id) on delete cascade,
  schedule_id uuid not null references public.earning_schedules (id) on delete cascade,
  updated_at  timestamptz not null default now()
);

-- The pay that was built into the app until now, as the starting default.
insert into public.earning_schedules (name, pay_basis, service_mode, service_value, free_job_fee, parts_mode, parts_value, km_rate, is_default)
select 'Standard commission', 'Commission', 'Percent', 60, 250, 'Percent', 10, 0, true
where not exists (select 1 from public.earning_schedules);

-- A technician's own schedule, for the partner app.
create or replace function public.my_earning_schedule()
returns setof public.earning_schedules language sql stable security definer set search_path = public as $$
  select s.* from public.earning_schedules s
  where s.id = coalesce((select schedule_id from public.tech_earning_plans where tech_id = auth.uid()),
                        (select id from public.earning_schedules where is_default limit 1))
$$;
revoke execute on function public.my_earning_schedule() from public, anon;
grant execute on function public.my_earning_schedule() to authenticated;

alter table public.earning_schedules  enable row level security;
alter table public.tech_earning_plans enable row level security;
drop policy if exists "staff earning schedules" on public.earning_schedules;
drop policy if exists "staff earning plans"     on public.tech_earning_plans;
create policy "staff earning schedules" on public.earning_schedules  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff earning plans"     on public.tech_earning_plans for all using (public.is_staff()) with check (public.is_staff());
