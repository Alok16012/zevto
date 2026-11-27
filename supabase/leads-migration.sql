-- Zavtoo — ad leads (Facebook, Instagram, Google, YouTube, WhatsApp, website).
-- Every ad points at one campaign form: https://zavtoo.in/lead?utm_source=…&utm_campaign=…&utm_content=…
-- The form saves the lead with where it came from; Admin → Leads counts them by
-- platform, campaign and ad, and turns a lead into a service job.
-- Run in the Supabase SQL editor after the other migrations. Safe to re-run.

create sequence if not exists public.lead_ref_seq start 1001;

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique default ('LD' || nextval('public.lead_ref_seq')),
  name          text not null,
  phone         text not null,
  pincode       text not null default '',
  address       text not null default '',
  service       text not null default '',
  message       text not null default '',
  -- Facebook / Instagram / Google / YouTube / WhatsApp / Website / Other — worked out from the link.
  source        text not null default 'Website',
  utm_source    text not null default '',
  utm_medium    text not null default '',
  utm_campaign  text not null default '',
  -- Ad set (Meta) or keyword (Google).
  utm_term      text not null default '',
  -- The ad itself.
  utm_content   text not null default '',
  fbclid        text not null default '',
  gclid         text not null default '',
  landing_url   text not null default '',
  referrer      text not null default '',
  status        text not null default 'New' check (status in ('New', 'Contacted', 'Converted', 'Not interested', 'Junk')),
  notes         text not null default '',
  -- Set when the lead became a job / matches an app customer.
  service_request_id uuid references public.service_requests (id) on delete set null,
  customer_id   uuid references public.profiles (id) on delete set null,
  -- Same mobile sent the form again: counted once, the latest ad is remembered.
  submissions   integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_campaign_idx on public.leads (source, utm_campaign, utm_content);
create index if not exists leads_phone_idx on public.leads (right(regexp_replace(phone, '\D', '', 'g'), 10));

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
drop policy if exists "staff leads" on public.leads;
create policy "staff leads" on public.leads for all using (public.is_staff()) with check (public.is_staff());

-- fb / ig / msg / an are what Meta puts in {{site_source_name}}.
create or replace function public.lead_source(p_source text, p_medium text, p_fbclid text, p_gclid text, p_referrer text) returns text
language sql immutable as $$
  select case
    when lower(coalesce(p_source, '')) ~ '(^ig$|insta)' then 'Instagram'
    when lower(coalesce(p_source, '')) ~ '(^fb$|facebook|^meta|^msg$|messenger|^an$)' then 'Facebook'
    when lower(coalesce(p_source, '')) ~ '(youtube|^yt$)' then 'YouTube'
    when lower(coalesce(p_source, '')) ~ '(google|adwords|^gads$)' then 'Google'
    when lower(coalesce(p_source, '')) ~ '(whatsapp|^wa$)' then 'WhatsApp'
    when coalesce(p_gclid, '') <> '' then 'Google'
    when coalesce(p_fbclid, '') <> '' then 'Facebook'
    when lower(coalesce(p_referrer, '')) ~ 'instagram' then 'Instagram'
    when lower(coalesce(p_referrer, '')) ~ '(facebook|fb\.)' then 'Facebook'
    when lower(coalesce(p_referrer, '')) ~ 'google' then 'Google'
    when coalesce(p_source, '') <> '' then 'Other'
    else 'Website'
  end
$$;

-- The public form calls this (no login). The same mobile within 30 days updates the
-- existing lead instead of making a new one, so a person counts once.
create or replace function public.submit_lead(
  p_name text, p_phone text, p_pincode text, p_address text, p_service text, p_message text,
  p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_term text, p_utm_content text,
  p_fbclid text, p_gclid text, p_landing_url text, p_referrer text
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_phone text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  v_lead public.leads; v_cust uuid;
  cut text[] := array[left(trim(coalesce(p_utm_source, '')), 80), left(trim(coalesce(p_utm_medium, '')), 80), left(trim(coalesce(p_utm_campaign, '')), 150),
                      left(trim(coalesce(p_utm_term, '')), 150), left(trim(coalesce(p_utm_content, '')), 150)];
begin
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Please enter your name'; end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Please enter a valid 10-digit mobile number'; end if;
  if coalesce(p_pincode, '') <> '' and p_pincode !~ '^[1-9][0-9]{5}$' then raise exception 'Please enter a valid 6-digit pincode'; end if;
  -- Light flood guard: at most 30 new leads a minute in total.
  if (select count(*) from public.leads where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Too many requests — please try again in a minute';
  end if;
  select id into v_cust from public.profiles where coalesce(role, 'customer') = 'customer'
    and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = v_phone limit 1;

  select * into v_lead from public.leads
   where right(regexp_replace(phone, '\D', '', 'g'), 10) = v_phone and created_at > now() - interval '30 days'
   order by created_at desc limit 1;
  if found then
    update public.leads set submissions = submissions + 1,
      name = left(trim(p_name), 80), pincode = coalesce(nullif(p_pincode, ''), pincode), address = coalesce(nullif(left(trim(coalesce(p_address, '')), 250), ''), address),
      service = coalesce(nullif(left(trim(coalesce(p_service, '')), 60), ''), service),
      message = coalesce(nullif(left(trim(coalesce(p_message, '')), 500), ''), message),
      -- Back to New so ops call again, unless it's already a job.
      status = case when status in ('Converted') then status else 'New' end,
      customer_id = coalesce(customer_id, v_cust)
    where id = v_lead.id;
    return v_lead.ref;
  end if;

  insert into public.leads (name, phone, pincode, address, service, message, source, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
                            fbclid, gclid, landing_url, referrer, customer_id)
  values (left(trim(p_name), 80), '+91' || v_phone, coalesce(p_pincode, ''), left(trim(coalesce(p_address, '')), 250),
          left(trim(coalesce(p_service, '')), 60), left(trim(coalesce(p_message, '')), 500),
          public.lead_source(cut[1], cut[2], p_fbclid, p_gclid, p_referrer), cut[1], cut[2], cut[3], cut[4], cut[5],
          left(coalesce(p_fbclid, ''), 300), left(coalesce(p_gclid, ''), 300), left(coalesce(p_landing_url, ''), 1000), left(coalesce(p_referrer, ''), 500), v_cust)
  returning * into v_lead;

  -- Ping the admins.
  perform public.notify_user(p.id, 'service', 'New lead · ' || v_lead.source,
    v_lead.name || ' · ' || v_lead.phone || coalesce(nullif(' · ' || v_lead.utm_campaign, ' · '), ''), jsonb_build_object('k', 'lead', 'id', v_lead.id))
  from public.profiles p where p.role in ('admin', 'super_admin');
  return v_lead.ref;
end $$;
revoke execute on function public.submit_lead(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_lead(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads') then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;
