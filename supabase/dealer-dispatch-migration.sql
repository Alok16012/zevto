-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — admin can hand a service job to a dealer
-- Run once in Supabase → SQL Editor on a database that already has
-- supabase/schema.sql (or dealer-migration.sql) applied. Safe to run again.
-- (Running the full schema.sql instead does the same thing.)
--
-- Admin → Service Jobs → Assign → Dealer sets service_requests.dealer_id and
-- leaves the job 'With ops'. That dealer (and only that dealer) sees it in
-- their app, gets a notification, and assigns it to someone on their team.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.service_requests add column if not exists dealer_id uuid references public.dealers (id) on delete set null;
create index if not exists sr_dealer_idx on public.service_requests (dealer_id) where dealer_id is not null;

-- Which service jobs a dealer may see: jobs ops gave them, their technicians'
-- jobs, plus unassigned jobs in their pincodes that no dealer has been given.
create or replace function public.dealer_sees_job(p_tech uuid, p_preferred uuid, p_status text, p_pincode text, p_dealer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.dealers d
    where d.user_id = auth.uid() and (
      p_dealer = d.id
      or exists (select 1 from public.technicians t where t.id = coalesce(p_tech, p_preferred) and t.dealer_id = d.id)
      or (d.active and d.kyc = 'Verified' and p_tech is null and p_dealer is null and p_pincode = any (d.pincodes)
          and (p_status = 'With ops' or (p_status = 'Requested' and p_preferred is null)))
    )
  )
$$;

-- Keeps the dealer's own tasks visible when partner-upgrade-migration.sql
-- (which adds service_requests.raised_dealer) has already been run.
drop policy if exists "see jobs" on public.service_requests;
do $$
begin
  execute format($p$
    create policy "see jobs" on public.service_requests for select using (
      customer_id = auth.uid() or tech_id = auth.uid() or raised_by = auth.uid()
      or (preferred_tech_id = auth.uid() and status = 'Requested') or public.is_staff()
      or (public.is_dealer() and public.dealer_sees_job(tech_id, preferred_tech_id, status, pincode, dealer_id))
      %s
    )$p$,
    case when exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'service_requests' and column_name = 'raised_dealer')
         then 'or (raised_dealer is not null and raised_dealer = public.my_dealer_id())' else '' end);
end $$;
drop function if exists public.dealer_sees_job(uuid, uuid, text, text);

-- Dealer dispatch: give a job ops handed them, an open job in their area, or one
-- of their team's jobs to one of their technicians.
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
    r.dealer_id = d.id
    or (r.tech_id is null and r.dealer_id is null and r.pincode = any (d.pincodes)
        and (r.status = 'With ops' or (r.status = 'Requested' and r.preferred_tech_id is null)))
    or exists (select 1 from public.technicians x where x.id = r.tech_id and x.dealer_id = d.id)
  ) then
    raise exception 'This job isn''t open in your area';
  end if;
  update public.service_requests
     set tech_id = t.id, preferred_tech_id = null, dealer_id = d.id, status = 'Assigned', assigned_at = now(), note = 'Assigned by ' || d.name
   where id = r.id;
end $$;
revoke execute on function public.dealer_assign_job(uuid, uuid) from anon;

-- Notifications: same as schema.sql, plus the dealer hears when ops hands them a job.
create or replace function public.on_request_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_link jsonb := jsonb_build_object('k', 'track', 'id', new.id); v_tech text; v_dealer_user uuid;
begin
  select split_part(name, ' ', 1) into v_tech from public.technicians where id = coalesce(new.tech_id, new.preferred_tech_id);
  v_tech := coalesce(v_tech, 'Your technician');
  if tg_op = 'INSERT' then
    perform public.notify_user(new.customer_id, 'service', new.type || ' booked', to_char(new.visit_date, 'DD Mon') || ', ' || new.slot || case when new.preferred_tech_id is not null then '. Waiting for ' || v_tech || ' to confirm.' else '. We''ll assign a technician shortly.' end, v_link);
    if new.preferred_tech_id is not null then
      perform public.notify_user(new.preferred_tech_id, 'service', 'New job request', new.type || ' · ' || new.pincode || ' · ' || to_char(new.visit_date, 'DD Mon') || ', ' || new.slot, v_link);
    end if;
    return new;
  end if;
  if new.dealer_id is distinct from old.dealer_id and new.dealer_id is not null and new.tech_id is null then
    select user_id into v_dealer_user from public.dealers where id = new.dealer_id;
    if v_dealer_user is not null then
      perform public.notify_user(v_dealer_user, 'service', 'New job from Zavtoo',
        new.type || ' · ' || new.pincode || ' · ' || to_char(new.visit_date, 'DD Mon') || ', ' || new.slot || '. Assign it to your team.', v_link);
    end if;
  end if;
  if new.tech_id is distinct from old.tech_id and new.tech_id is not null then
    perform public.notify_user(new.tech_id, 'service', 'Job assigned to you', new.type || ' · ' || new.customer_name || ' · ' || to_char(new.visit_date, 'DD Mon') || ', ' || new.slot, v_link);
  end if;
  if new.status is distinct from old.status then
    perform public.notify_user(new.customer_id, 'service',
      case new.status
        when 'Assigned'    then v_tech || ' will do your ' || lower(new.type)
        when 'On the way'  then v_tech || ' is on the way'
        when 'Arrived'     then v_tech || ' has arrived'
        when 'In Progress' then 'Your ' || lower(new.type) || ' has started'
        when 'Completed'   then new.type || ' completed'
        when 'Rescheduled' then 'Your visit needs a new slot'
        when 'Cancelled'   then 'Booking cancelled'
        when 'With ops'    then 'We''re finding you a technician'
        else new.status end,
      case new.status
        when 'On the way'  then 'Track live — about ' || coalesce(new.eta_min, 15) || ' min away.'
        when 'Arrived'     then 'Share your start code to begin.'
        when 'Completed'   then 'How did it go? Rate your technician.'
        when 'Rescheduled' then coalesce(new.reschedule_reason, '') || '. Our team will call you.'
        else to_char(new.visit_date, 'DD Mon') || ', ' || new.slot end,
      v_link);
  end if;
  return new;
end $$;

-- Done. Admin → Service Jobs → Assign now has a Dealer tab.
