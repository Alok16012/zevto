-- Zavtoo — automatic WhatsApp messages (WhatsApp Cloud API, number 8929 45 46 47).
--
-- How it works: database triggers put a message in public.whatsapp_outbox when a job
-- is booked, assigned, on the way, started, completed, rescheduled or cancelled, and
-- when an ad lead comes in. Each new row pings https://zavtoo.in/api/whatsapp/dispatch,
-- which sends it with an approved Meta template and records the result. A one-minute
-- job retries anything that didn't go.
--
-- Nothing is sent until you switch it on, after the templates are approved and the
-- WHATSAPP_TOKEN / WHATSAPP_PHONE_ID settings are in Netlify:
--   update public.whatsapp_config set enabled = true where id = 1;
-- Run in the Supabase SQL editor after the other migrations. Safe to re-run.

create table if not exists public.whatsapp_config (
  id           integer primary key default 1 check (id = 1),
  enabled      boolean not null default false,
  dispatch_url text not null default 'https://zavtoo.in/api/whatsapp/dispatch',
  -- Template language code as approved in WhatsApp Manager.
  lang         text not null default 'en',
  updated_at   timestamptz not null default now()
);
insert into public.whatsapp_config (id) values (1) on conflict (id) do nothing;
alter table public.whatsapp_config enable row level security;
drop policy if exists "staff whatsapp config" on public.whatsapp_config;
create policy "staff whatsapp config" on public.whatsapp_config for all using (public.is_staff()) with check (public.is_staff());

create table if not exists public.whatsapp_outbox (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  -- 91XXXXXXXXXX
  to_phone     text not null,
  template     text not null,
  lang         text not null default 'en',
  -- Body {{1}}, {{2}}… in order.
  params       jsonb not null default '[]',
  -- Dynamic part of a URL button (e.g. the bill link), if the template has one.
  button_param text,
  kind         text not null default '',
  request_id   uuid references public.service_requests (id) on delete set null,
  lead_id      uuid,
  status       text not null default 'Pending' check (status in ('Pending', 'Sending', 'Sent', 'Failed')),
  attempts     integer not null default 0,
  error        text,
  wa_message_id text,
  sent_at      timestamptz
);
create index if not exists wa_outbox_pending_idx on public.whatsapp_outbox (created_at) where status in ('Pending', 'Sending');
create index if not exists wa_outbox_request_idx on public.whatsapp_outbox (request_id);
alter table public.whatsapp_outbox enable row level security;
drop policy if exists "staff whatsapp outbox" on public.whatsapp_outbox;
create policy "staff whatsapp outbox" on public.whatsapp_outbox for select using (public.is_staff());

-- Meta rejects parameters with new lines, tabs or more than 4 spaces in a row.
create or replace function public.wa_clean(p text) returns text
language sql immutable as $$
  select coalesce(nullif(left(trim(regexp_replace(regexp_replace(coalesce(p, ''), '[\r\n\t]+', ' ', 'g'), ' {2,}', ' ', 'g')), 200), ''), '-')
$$;

-- Queues one template message. Does nothing while WhatsApp is switched off or the number is bad.
create or replace function public.wa_enqueue(p_phone text, p_template text, p_params text[], p_kind text,
  p_request uuid default null, p_button text default null, p_lead uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_cfg public.whatsapp_config; v_to text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
begin
  select * into v_cfg from public.whatsapp_config where id = 1;
  if not found or not v_cfg.enabled or v_to !~ '^[6-9][0-9]{9}$' then return; end if;
  -- The same message for the same job twice in a few minutes is a duplicate.
  if p_request is not null and exists (select 1 from public.whatsapp_outbox where request_id = p_request and template = p_template
       and to_phone = '91' || v_to and created_at > now() - interval '5 minutes') then return; end if;
  insert into public.whatsapp_outbox (to_phone, template, lang, params, button_param, kind, request_id, lead_id)
  values ('91' || v_to, p_template, v_cfg.lang,
          (select coalesce(jsonb_agg(public.wa_clean(x) order by n), '[]') from unnest(p_params) with ordinality t(x, n)),
          p_button, p_kind, p_request, p_lead);
end $$;
revoke execute on function public.wa_enqueue(text, text, text[], text, uuid, text, uuid) from public, anon, authenticated;

-- Wakes the sender right away (pg_net). If that isn't available, the one-minute job sends it.
create or replace function public.wa_ping() returns void
language plpgsql security definer set search_path = public as $$
declare v_url text;
begin
  select dispatch_url into v_url from public.whatsapp_config where id = 1 and enabled;
  if v_url is null or not exists (select 1 from public.whatsapp_outbox where status = 'Pending') then return; end if;
  begin
    execute 'select net.http_post(url := $1, body := ''{}''::jsonb, headers := ''{"Content-Type": "application/json"}''::jsonb)' using v_url;
  exception when others then null; -- pg_net missing: the cron job will retry
  end;
end $$;
revoke execute on function public.wa_ping() from public, anon, authenticated;

create or replace function public.wa_outbox_ping() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.wa_ping();
  return null;
end $$;
drop trigger if exists wa_outbox_ping on public.whatsapp_outbox;
create trigger wa_outbox_ping after insert on public.whatsapp_outbox for each statement execute function public.wa_outbox_ping();

-- ─────── What gets sent, and when ───────
create or replace function public.wa_on_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text := split_part(public.wa_clean(new.customer_name), ' ', 1);
  v_when text := to_char(new.visit_date, 'DD Mon');
  v_tech public.technicians;
begin
  if new.tech_id is not null then select * into v_tech from public.technicians where id = new.tech_id; end if;

  if tg_op = 'INSERT' then
    -- to_jsonb: works even before repeat-complaint-migration.sql adds these columns.
    if to_jsonb(new) ->> 'repeat_of' is not null then
      perform public.wa_enqueue(new.customer_phone, 'zavtoo_repeat_complaint', array[v_name, new.ref, to_jsonb(new) ->> 'repeat_of_ref'], 'booked', new.id);
    else
      perform public.wa_enqueue(new.customer_phone, 'zavtoo_booking_confirmed', array[v_name, new.ref, new.type, v_when, new.slot], 'booked', new.id);
    end if;
  end if;

  -- Assigned (by ops, a dealer, or the technician accepting): tell the customer and the technician.
  if new.status = 'Assigned' and new.tech_id is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'Assigned' or old.tech_id is distinct from new.tech_id) then
    perform public.wa_enqueue(new.customer_phone, 'zavtoo_technician_assigned',
      array[v_name, coalesce(v_tech.name, 'Our technician'), coalesce(nullif(v_tech.phone, ''), '8929 45 46 47'), new.ref, v_when, new.slot], 'assigned', new.id);
    perform public.wa_enqueue(v_tech.phone, 'zavtoo_new_job_technician',
      array[new.ref, new.type, public.wa_clean(new.customer_name), new.pincode, v_when, new.slot], 'tech_job', new.id);
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- Meta won't approve codes in Utility templates, so the codes stay in the customer's app;
    -- these messages only point to it.
    if new.status = 'On the way' then
      perform public.wa_enqueue(new.customer_phone, 'zavtoo_on_the_way_code', array[v_name, coalesce(v_tech.name, 'Your technician'), new.ref], 'on_the_way', new.id);
    elsif new.status = 'In Progress' then
      if new.customer_id is not null then
        perform public.wa_enqueue(new.customer_phone, 'zavtoo_close_code', array[v_name, new.ref], 'started', new.id);
      end if;
    elsif new.status = 'Completed' then
      perform public.wa_enqueue(new.customer_phone, 'zavtoo_job_completed',
        array[v_name, new.ref, to_char(new.amount, 'FM99,99,999')], 'completed', new.id, new.id || '?t=' || new.bill_token);
    elsif new.status = 'Rescheduled' then
      perform public.wa_enqueue(new.customer_phone, 'zavtoo_visit_rescheduled', array[v_name, new.ref, coalesce(new.reschedule_reason, 'technician unavailable')], 'rescheduled', new.id);
    elsif new.status = 'Cancelled' then
      perform public.wa_enqueue(new.customer_phone, 'zavtoo_booking_cancelled', array[v_name, new.ref], 'cancelled', new.id);
    end if;
  end if;
  return null;
exception when others then
  -- A WhatsApp problem must never block booking or closing a job.
  raise warning 'whatsapp enqueue failed: %', sqlerrm;
  return null;
end $$;
drop trigger if exists wa_on_request on public.service_requests;
create trigger wa_on_request after insert or update of status, tech_id on public.service_requests
  for each row execute function public.wa_on_request();

create or replace function public.wa_on_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.wa_enqueue(new.phone, 'zavtoo_lead_thanks',
    array[split_part(public.wa_clean(new.name), ' ', 1), coalesce(nullif(new.service, ''), 'RO service')], 'lead', null, null, new.id);
  return null;
exception when others then
  raise warning 'whatsapp enqueue failed: %', sqlerrm;
  return null;
end $$;
do $$
begin
  if to_regclass('public.leads') is not null then
    execute 'drop trigger if exists wa_on_lead on public.leads';
    execute 'create trigger wa_on_lead after insert on public.leads for each row execute function public.wa_on_lead()';
  end if;
end $$;

-- The sender (server, service role) claims pending messages so two runs never send one twice.
create or replace function public.wa_claim(p_limit integer default 20) returns setof public.whatsapp_outbox
language sql security definer set search_path = public as $$
  update public.whatsapp_outbox o set status = 'Sending', attempts = attempts + 1
   where o.id in (
     select id from public.whatsapp_outbox
      where (status = 'Pending' or (status = 'Sending' and created_at < now() - interval '10 minutes')) and attempts < 5
      order by created_at limit p_limit for update skip locked)
  returning o.*
$$;
revoke execute on function public.wa_claim(integer) from public, anon, authenticated;

-- Background helpers. Each is optional: if Supabase doesn't have it, the migration still runs.
do $$ begin create extension if not exists pg_net; exception when others then raise notice 'pg_net not available: %', sqlerrm; end $$;
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'whatsapp-dispatch';
  perform cron.schedule('whatsapp-dispatch', '* * * * *', 'select public.wa_ping()');
exception when others then raise notice 'pg_cron not available: %', sqlerrm;
end $$;
