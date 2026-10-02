-- Run once in Supabase → SQL Editor after testing, before launch.
-- Moves each ID counter back to just after the highest ID still in use,
-- so deleted test accounts/orders don't leave gaps. Safe to run any time.

select setval('public.customer_code_seq',   coalesce((select max(substr(code, 5)::int) from public.profiles    where code like 'CUS-%'), 100100) + 1, false);
select setval('public.technician_code_seq', coalesce((select max(substr(code, 5)::int) from public.profiles    where code like 'TEC-%'), 200100) + 1, false);
select setval('public.dealer_code_seq',     coalesce((select max(substr(code, 5)::int) from public.dealers     where code like 'DLR-%'), 300100) + 1, false);
select setval('public.admin_code_seq',      coalesce((select max(substr(code, 5)::int) from public.profiles    where code like 'ADM-%'), 900100) + 1, false);
select setval('public.order_ref_seq',       coalesce((select max(substr(ref, 4)::int)  from public.orders), 1000) + 1, false);
select setval('public.service_ref_seq',     coalesce((select max(substr(ref, 4)::int)  from public.service_requests), 1000) + 1, false);
