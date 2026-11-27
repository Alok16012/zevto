-- Zavtoo — one rating per customer per technician, and duplicate-customer checks.
-- Run in the Supabase SQL editor after the other migrations. Safe to re-run.

-- ─────── 1. Ratings: a customer counts once per technician ───────
-- Rating a technician again (a later job, or changing your mind on the same job)
-- updates the customer's existing rating instead of adding another one.

-- Older duplicates (same customer → same technician) are hidden, not deleted:
-- the newest one stays published. Admin → Reviews can still see the hidden ones.
update public.reviews set status = 'Hidden'
 where id in (
   select id from (
     select id, row_number() over (partition by author_id, tech_id order by created_at desc) as rn
       from public.reviews where tech_id is not null and status = 'Published'
   ) x where x.rn > 1
 );

create or replace function public.rate_service(p_request uuid, p_stars integer, p_tags text[], p_comment text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.service_requests; v_name text; v_review uuid;
  v_body text := concat_ws(' — ', nullif(trim(p_comment), ''), nullif(array_to_string(coalesce(p_tags, '{}'), ' · '), ''));
begin
  select * into r from public.service_requests where id = p_request and customer_id = auth.uid();
  if not found then raise exception 'Job not found'; end if;
  if r.status <> 'Completed' then raise exception 'You can rate once the job is done'; end if;
  if p_stars not between 1 and 5 then raise exception 'Pick 1 to 5 stars'; end if;
  -- Re-rating the same job is allowed: it just changes the stars.
  update public.service_requests set rating = p_stars, rating_tags = coalesce(p_tags, '{}'), rating_comment = coalesce(trim(p_comment), ''), rated_at = now()
  where id = p_request;
  if r.tech_id is null then return; end if;
  select id into v_review from public.reviews
   where author_id = auth.uid() and tech_id = r.tech_id
   order by (status = 'Published') desc, created_at desc limit 1;
  if found then
    -- Keeps an admin's Hidden/Flagged decision; only the stars and text change.
    update public.reviews set stars = p_stars, body = v_body, service_request_id = r.id, created_at = now() where id = v_review;
  else
    select full_name into v_name from public.profiles where id = auth.uid();
    insert into public.reviews (tech_id, service_request_id, author_id, author_name, stars, body)
    values (r.tech_id, r.id, auth.uid(), coalesce(nullif(v_name, ''), 'Customer'), p_stars, v_body);
  end if;
end $$;

-- ─────── 2. Duplicate customers ───────
-- The same household often ends up as 2–4 customers (father's number, son's number…),
-- so AMC, payments and routine service get split across accounts. When anyone adds a
-- task, this looks for the same mobile, the same email, or the same address in the same
-- pincode under a different mobile — across app customers, their saved addresses and
-- every past job (including customers who aren't on the app).

create extension if not exists pg_trgm with schema extensions;

-- "H.No. 413/11, Nawada, Uttam Nagar" → "413 11 nawada uttam nagar"
create or replace function public.norm_address(p text) returns text
language sql immutable set search_path = public as $$
  select trim(regexp_replace(regexp_replace(regexp_replace(lower(coalesce(p, '')),
    '\m(house|h\.?\s?no|flat|plot|khasra|gali|street|st|road|rd|near|opp|opposite|sector|sec|block|blk|floor|flr|ground|first|second|third|new|delhi|india)\M\.?', ' ', 'g'),
    '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;

-- The house number: first token with a digit, keeping "413/11" or "a-52" together.
create or replace function public.house_no(p text) returns text
language sql immutable set search_path = public as $$
  select lower((regexp_match(coalesce(p, ''), '([A-Za-z]?-?\d+[A-Za-z]?(?:\s*[/-]\s*\d+[A-Za-z]?)*)'))[1])
$$;

create or replace function public.last10(p text) returns text
language sql immutable as $$ select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10) $$;

create index if not exists sr_pincode_idx on public.service_requests (pincode);
create index if not exists addresses_pincode_idx on public.addresses (pincode);

drop function if exists public.find_duplicates(text, text, text, text);
create or replace function public.find_duplicates(p_phone text, p_address text, p_pincode text, p_email text default null)
returns table (match text, customer_id uuid, customer_code text, name text, phone text, address text, pincode text, last_ref text, last_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_phone text := public.last10(p_phone);
  v_addr text := public.norm_address(p_address);
  v_house text := public.house_no(p_address);
  v_email text := lower(trim(coalesce(p_email, '')));
  v_staff boolean := public.is_staff();
begin
  if not (v_staff or public.is_technician() or public.is_dealer()) then raise exception 'Not allowed'; end if;
  if length(v_phone) < 10 then v_phone := null; end if;
  if length(v_addr) < 6 or coalesce(p_pincode, '') !~ '^[1-9][0-9]{5}$' then v_addr := null; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_email := null; end if;

  return query
  with hits as (
    -- App customers by mobile or email.
    select case when v_phone is not null and public.last10(p.phone) = v_phone then 'Same mobile' else 'Same email' end as m, 1 as rank,
           p.id as cid, p.code, p.full_name as nm, p.phone as ph,
           (select a.line from public.addresses a where a.user_id = p.id order by a.is_default desc limit 1) as ad,
           (select a.pincode from public.addresses a where a.user_id = p.id order by a.is_default desc limit 1) as pc,
           p.created_at as at
      from public.profiles p
     where coalesce(p.role, 'customer') = 'customer'
       and ((v_phone is not null and public.last10(p.phone) = v_phone) or (v_email is not null and lower(p.email) = v_email))
    union all
    -- App customers' saved addresses: same house, another mobile.
    select 'Same address', 2, p.id, p.code, p.full_name, p.phone, a.line, a.pincode, a.created_at
      from public.addresses a join public.profiles p on p.id = a.user_id
     where v_addr is not null and a.pincode = p_pincode
       and (v_phone is null or public.last10(p.phone) is distinct from v_phone)
       and (similarity(public.norm_address(a.line), v_addr) >= 0.55
            or (v_house is not null and public.house_no(a.line) = v_house and similarity(public.norm_address(a.line), v_addr) >= 0.3))
    union all
    -- Every past job, including customers who aren't on the app.
    select case when v_phone is not null and public.last10(s.customer_phone) = v_phone then 'Same mobile' else 'Same address' end,
           case when v_phone is not null and public.last10(s.customer_phone) = v_phone then 1 else 2 end,
           s.customer_id, null, s.customer_name, s.customer_phone, s.address, s.pincode, s.created_at
      from public.service_requests s
     where (v_phone is not null and public.last10(s.customer_phone) = v_phone)
        or (v_addr is not null and s.pincode = p_pincode
            and (v_phone is null or public.last10(s.customer_phone) is distinct from v_phone)
            and (similarity(public.norm_address(s.address), v_addr) >= 0.55
                 or (v_house is not null and public.house_no(s.address) = v_house and similarity(public.norm_address(s.address), v_addr) >= 0.3)))
  ),
  -- One line per person (mobile), strongest match first, with their latest job.
  people as (
    select distinct on (coalesce(nullif(public.last10(h.ph), ''), h.cid::text, h.nm))
           h.m, h.rank, h.cid, coalesce(h.code, (select code from public.profiles where id = h.cid)) as code, h.nm, h.ph, h.ad, h.pc,
           (select s.ref from public.service_requests s where (h.cid is not null and s.customer_id = h.cid)
              or (public.last10(h.ph) <> '' and public.last10(s.customer_phone) = public.last10(h.ph)) order by s.created_at desc limit 1) as ref,
           (select s.created_at from public.service_requests s where (h.cid is not null and s.customer_id = h.cid)
              or (public.last10(h.ph) <> '' and public.last10(s.customer_phone) = public.last10(h.ph)) order by s.created_at desc limit 1) as last_job
      from hits h
     order by coalesce(nullif(public.last10(h.ph), ''), h.cid::text, h.nm), h.rank, h.at desc
  )
  select x.m, case when v_staff then x.cid end, x.code, x.nm,
         -- Partners see only the last 4 digits of someone else's mobile.
         case when v_staff or public.last10(x.ph) = v_phone then x.ph else '••••••' || right(public.last10(x.ph), 4) end,
         x.ad, x.pc, x.ref, x.last_job
    from people x
   order by x.rank, x.last_job desc nulls last
   limit 8;
end $$;
revoke execute on function public.find_duplicates(text, text, text, text) from public, anon;
grant execute on function public.find_duplicates(text, text, text, text) to authenticated;

-- Same mobile, new name = still the same customer. A task added by ops, a technician
-- or a dealer for a mobile that already belongs to exactly one app customer is
-- attached to that customer's account instead of starting a new lead. (They then see
-- it in their app, with start/close codes.) The name typed on the task is kept on the job.
create or replace function public.link_customer_by_phone() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_ids uuid[];
begin
  if new.customer_id is not null or length(public.last10(new.customer_phone)) < 10 then return new; end if;
  select array_agg(p.id) into v_ids from public.profiles p
   where coalesce(p.role, 'customer') = 'customer' and not p.blocked and public.last10(p.phone) = public.last10(new.customer_phone);
  if coalesce(array_length(v_ids, 1), 0) = 1 then new.customer_id := v_ids[1]; end if;
  return new;
end $$;
-- Runs before mark_repeat (triggers fire in name order) so repeats see the linked customer.
drop trigger if exists link_customer_by_phone on public.service_requests;
create trigger link_customer_by_phone before insert on public.service_requests for each row execute function public.link_customer_by_phone();
