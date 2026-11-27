-- A job booked for a later day stays visible to the technician, but they can't
-- start travel, mark arrived or start work before its visit date (India time).
-- Run in the Supabase SQL editor. Safe to re-run.

create or replace function public.tech_set_status(p_request uuid, p_status text, p_eta integer default null, p_distance numeric default null) returns void
language plpgsql security definer set search_path = public as $$
declare r public.service_requests := public.tech_job(p_request);
begin
  if r.visit_date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'This job is booked for % — you can start it on that day', to_char(r.visit_date, 'DD Mon');
  end if;
  if p_status = 'On the way' and r.status in ('Assigned', 'Rescheduled') then
    update public.service_requests set status = 'On the way', trip_started_at = now(), eta_min = p_eta, distance_km = p_distance where id = r.id;
    update public.technicians set status = 'On job' where id = auth.uid();
  elsif p_status = 'Arrived' and r.status = 'On the way' then
    update public.service_requests set status = 'Arrived', arrived_at = now() where id = r.id;
  else
    raise exception 'Can''t move this job from % to %', r.status, p_status;
  end if;
end $$;

create or replace function public.tech_start_job(p_request uuid, p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.service_requests := public.tech_job(p_request); v_otp text;
begin
  if r.visit_date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'This job is booked for % — you can start it on that day', to_char(r.visit_date, 'DD Mon');
  end if;
  if r.status not in ('Arrived', 'Assigned', 'On the way') then raise exception 'This job can''t be started now'; end if;
  select otp into v_otp from public.service_otps where request_id = r.id;
  if r.customer_id is not null and v_otp is not null and coalesce(p_code, '') <> v_otp then
    raise exception 'Wrong code — ask the customer to check again';
  end if;
  update public.service_requests set status = 'In Progress', started_at = now(), arrived_at = coalesce(arrived_at, now()) where id = r.id;
  -- Location sharing ends once work starts.
  delete from public.tech_locations where tech_id = auth.uid();
end $$;
