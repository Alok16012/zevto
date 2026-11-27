-- Zavtoo — repeat complaints.
-- A complaint from the same customer (app account, or same mobile + pincode) within
-- 7 days of a completed job is a REPEAT: it's free (no visit charge, no parts charge),
-- it's flagged with the job it repeats and the technician who closed that job, and
-- that technician loses the job from their count (jobs_done − 1) and its earning.
-- Installations never count as repeats. Cancelling a repeat undoes the deduction.
-- Run in the Supabase SQL editor after the other migrations. Safe to re-run.

alter table public.service_requests add column if not exists repeat_of uuid references public.service_requests (id) on delete set null;
alter table public.service_requests add column if not exists repeat_of_ref text;
alter table public.service_requests add column if not exists repeat_tech_id uuid references public.technicians (id) on delete set null;
-- On the original job: when it was repeated, and by which complaint.
alter table public.service_requests add column if not exists repeated_at timestamptz;
alter table public.service_requests add column if not exists repeated_by_ref text;
create index if not exists sr_repeat_lookup_idx on public.service_requests (pincode, completed_at desc) where status = 'Completed';

create or replace function public.mark_repeat() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.service_requests; v_phone text := right(regexp_replace(coalesce(new.customer_phone, ''), '\D', '', 'g'), 10);
begin
  if new.type = 'Installation' or new.repeat_of is not null then return new; end if;
  select * into p from public.service_requests s
   where s.status = 'Completed' and s.completed_at >= now() - interval '7 days' and s.pincode = new.pincode
     and ((new.customer_id is not null and s.customer_id = new.customer_id)
       or (length(v_phone) = 10 and right(regexp_replace(s.customer_phone, '\D', '', 'g'), 10) = v_phone))
   order by s.completed_at desc limit 1;
  if not found then return new; end if;
  new.repeat_of := p.id; new.repeat_of_ref := p.ref; new.repeat_tech_id := p.tech_id;
  -- Free: nothing to pay, and a coupon spent on it is given back.
  if new.coupon is not null then
    update public.coupons set used = greatest(used - 1, 0) where code = new.coupon;
    new.coupon := null;
  end if;
  new.price := 0; new.discount := 0; new.amount := 0;
  new.note := trim(coalesce(new.note, '') || ' Repeat of #' || p.ref || ' (within 7 days).');
  return new;
end $$;
drop trigger if exists mark_repeat on public.service_requests;
create trigger mark_repeat before insert on public.service_requests for each row execute function public.mark_repeat();

create or replace function public.apply_repeat() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.repeat_of is not null then
    update public.service_requests set repeated_at = now(), repeated_by_ref = new.ref where id = new.repeat_of;
    update public.technicians set jobs_done = greatest(jobs_done - 1, 0) where id = new.repeat_tech_id;
  elsif tg_op = 'UPDATE' and new.repeat_of is not null and new.status = 'Cancelled' and old.status <> 'Cancelled' then
    update public.service_requests set repeated_at = null, repeated_by_ref = null
     where id = new.repeat_of and repeated_by_ref = new.ref;
    update public.technicians set jobs_done = jobs_done + 1 where id = new.repeat_tech_id;
  end if;
  return null;
end $$;
drop trigger if exists apply_repeat on public.service_requests;
create trigger apply_repeat after insert or update of status on public.service_requests for each row execute function public.apply_repeat();

-- Closing a repeat collects nothing, parts included.
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
         amount = case when v_amc or r.repeat_of is not null then 0 else r.price - r.discount + v_parts_total end
   where id = r.id returning * into v_out;
  update public.technicians set jobs_done = jobs_done + 1, status = 'Online' where id = auth.uid();
  return v_out;
end $$;
