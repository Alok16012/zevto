-- Zavtoo — new office address and customer care number on bills.
-- Updates Admin → Invoice Settings only if it still has the old Raja Puri address.
-- Run once in the Supabase SQL editor. Safe to re-run.
update public.invoice_settings
   set address = '808B, DLF Prime Tower, Pocket F, Okhla Phase I, Okhla Industrial Estate, New Delhi, Delhi 110020',
       phone = '8929 45 46 47'
 where id = 1 and address ilike '%Raja Puri%';
alter table public.invoice_settings alter column address set default '808B, DLF Prime Tower, Pocket F, Okhla Phase I, Okhla Industrial Estate, New Delhi, Delhi 110020';
alter table public.invoice_settings alter column phone set default '8929 45 46 47';
