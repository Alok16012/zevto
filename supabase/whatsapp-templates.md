# Zavtoo WhatsApp templates

Submitted to Meta on 27 Nov 2026 (10 templates). Meta refuses start/close codes in Utility
templates (it wants them as Authentication), so the codes stay in the customer's app and #5/#7
only point to it. #6 was dropped — #5 covers every customer.

Create each one in **WhatsApp Manager → Message templates → Create template** on the
account that holds **+91 89294 54647** ("Zavtoo Paani Filter Pvt. Ltd.", ID 1892308068872838).

- Category: **Utility** · Language: **English (en)**
- Name must match exactly — the software sends by name.
- `{{1}}`, `{{2}}`… are filled in by the software in this order.

| # | Name | When it goes | Body | Button |
|---|------|--------------|------|--------|
| 1 | `zavtoo_booking_confirmed` | Complaint booked | Hi {{1}}, your Zavtoo service request #{{2}} for {{3}} is booked for {{4}}, {{5}}. We will share your technician's details soon. For help, call or WhatsApp 8929 45 46 47. | — |
| 2 | `zavtoo_repeat_complaint` | Repeat complaint within 7 days | Hi {{1}}, we have registered your repeat complaint #{{2}} for your earlier job #{{3}}. This visit is free under our 7-day service warranty. A technician will contact you soon. | — |
| 3 | `zavtoo_technician_assigned` | Technician assigned (to customer) | Hi {{1}}, technician {{2}} ({{3}}) will visit you for your Zavtoo service request #{{4}} on {{5}}, {{6}}. For help, call or WhatsApp 8929 45 46 47. | — |
| 4 | `zavtoo_new_job_technician` | Technician assigned (to technician) | New Zavtoo job #{{1}}: {{2}} for {{3}}, pincode {{4}}, on {{5}}, {{6}}. Please open the Zavtoo Partner app for the address and details. | — |
| 5 | `zavtoo_on_the_way_code` | Technician on the way | Hi {{1}}, {{2}} is on the way for your service request #{{3}}. Please keep your Zavtoo app open to confirm the visit when the technician reaches your home. | — |
| 7 | `zavtoo_close_code` | Work started (app customers) | Hi {{1}}, work on your service request #{{2}} has started. Once you are happy with the service, please confirm it in your Zavtoo app so the technician can close the job. | — |
| 8 | `zavtoo_job_completed` | Job closed | Hi {{1}}, your Zavtoo service #{{2}} is complete. Amount: Rs. {{3}}. Tap the button below to view your bill. Thank you for choosing Zavtoo! | URL button "View bill" → `https://zavtoo.in/bill/{{1}}` (dynamic) |
| 9 | `zavtoo_visit_rescheduled` | Visit rescheduled | Hi {{1}}, your visit for service request #{{2}} needs a new time ({{3}}). Our team will call you to fix a new slot. Sorry for the trouble. | — |
| 10 | `zavtoo_booking_cancelled` | Booking cancelled | Hi {{1}}, your Zavtoo service request #{{2}} has been cancelled. If this is unexpected, please call or WhatsApp 8929 45 46 47. | — |
| 11 | `zavtoo_lead_thanks` | New ad lead | Hi {{1}}, thank you for contacting Zavtoo Paani Filter. Our team will call you shortly about {{2}}. For quick help, reply here or call 8929 45 46 47. | — |

Meta asks for sample values when you create a template — use e.g. Ravi, SRV1021, Repair,
28 Nov, 10:00 AM – 12:00 PM, Rajender, 1234, 1,250.

## Switching it on (after templates show **Approved**)

1. Meta Business Settings → System users → create one (Admin) → Add assets: the app
   **paanifilter** and the WhatsApp account above (full control) → Generate token with
   `whatsapp_business_messaging` and `whatsapp_business_management`, never expiring.
2. Netlify → Site configuration → Environment variables:
   `WHATSAPP_TOKEN` = that token, `WHATSAPP_PHONE_ID` = `1537585969429541`. Redeploy.
3. Add a payment method to the WhatsApp account (WhatsApp Manager → Payment configurations).
4. Supabase SQL editor: run `supabase/whatsapp-migration.sql`, then
   `update public.whatsapp_config set enabled = true where id = 1;`
5. Book a test job with your own mobile and check `select * from whatsapp_outbox order by created_at desc;`
