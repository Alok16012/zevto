# Zavtoo

Website, customer app, technician (partner) app, dealer app and admin console for **Zavtoo Pani Filter Pvt Ltd**, running on **Supabase** (Postgres, Auth, Realtime, Storage) with Next.js 16. There is no demo data and there are no demo logins.

| Route | Who | Login |
|---|---|---|
| `/`, `/shop`, `/products/…`, `/services`, `/cart` | Website visitors | none — checkout and booking continue in `/app` |
| `/app` | Customers | email + password (sign up in the app) |
| `/technician` | Technicians | email + password created by an admin or their dealer, or self sign-up |
| `/dealer` | Dealers (local RO shops) | email + password (register the shop in the app) |
| `/admin` | Super admin / admins | email + password |

## Production setup

1. **Database** — Supabase → SQL Editor → run `supabase/schema.sql`. It is safe to re-run and creates the tables, row-level security, server-side business functions, notification triggers, realtime, photo storage and the starting catalogue.
2. **Environment** — set in `.env.local` locally **and** in Netlify → Site settings → Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
   - `SUPABASE_SERVICE_ROLE_KEY` (**secret, server only** — used by `/api/signup`, `/api/technician-signup`, `/api/dealer-signup`, `/api/dealer/technicians` and `/api/admin/technicians`)
3. **Super admin** — `node scripts/create-super-admin.mjs admin@zavtoo.in`; add `--reset` to issue a new password.
4. **IDs** — after any testing, run `supabase/reset-id-counters.sql` so real IDs start cleanly.

## Accounts and IDs

- **Customers** sign up in `/app` (optionally with a friend's referral code). Accounts are created confirmed by the server because Supabase's built-in mailer only reaches the project team — add an SMTP provider before switching to email confirmation.
- **Technicians** are created in Admin → Technicians → *Add technician*; the admin shares the email and password. At first login technicians set their primary + nearby pincodes.
- **Dealers** register their shop in `/dealer` (shop name, owner, address, the pincodes they serve, optional GSTIN). They start as *KYC pending*: they can set up listings and add technicians, but nothing is shown to customers and they can't take jobs until an admin taps **Verify** in Admin → Dealers. Dealers that ops add by hand (no login) are verified straight away.
- **Admins** can reset technician and customer passwords (never staff passwords).
- Unique IDs: `CUS-` customers, `TEC-` technicians, `DLR-` dealers, `ADM-` staff, `ZVT…` orders, `SRV…` service jobs.

## How the apps work together

- **Checkout** (`place_order`) and **booking** (`book_service`) run in the database: prices, stock, coupons and wallet balance are always recomputed server-side.
- Customers pick a technician who serves their pincode, or leave it to ops. The chosen technician accepts or declines; ops assigns from Admin → Service Jobs.
- Technicians tap **Start Travel** to share live GPS location. Only that customer can see it, only while the technician is on the way; sharing stops when the job starts. The customer reads a 4-digit **start code** that technicians cannot see; the server checks it.
- Ratings update technician and product scores; referral bonuses (₹250) are paid when a referred customer's first order is delivered; every status change notifies the customer in-app.
- Customers chat with support from the app; admins answer in Admin → Support Chat.
- **Dealers** list products (their own, or a Zavtoo model with its official photos). A listing is a normal `products` row with `dealer_id` set, so it shows in the app and website as "Sold by *Shop, City*" and goes through the same `place_order` checkout — which only lets customers whose delivery pincode the dealer serves buy it. Each order is split into a `dealer_orders` row per dealer; the dealer accepts → dispatches → delivers (or rejects, which puts the stock back). When the whole order is that dealer's, the customer's order and notifications follow along; mixed orders stay with ops. Pausing a dealer in admin hides all their listings.
- Dealers see unassigned service jobs in their pincodes and their own technicians' jobs, and can assign them to verified technicians on their team (`dealer_assign_job`). Technicians a dealer adds still need Zavtoo KYC.
- RO photos are stored privately (customer, their technician and staff only); technician photos are public.

## Still needs third-party services

- **Online payments** — orders paid "Online" are recorded as *Pending*. Connect a gateway (e.g. Razorpay) to collect and mark them *Paid*.
- **Email / SMS / WhatsApp** — password-reset emails and messages need an SMTP / SMS provider; broadcasts currently go to the in-app notification centre.
- **Maps** — live tracking uses OpenStreetMap tiles, fine for light use; move to a paid tile provider at scale.
- **Support phone** — the app shows `1800-000-000` as a placeholder; replace it with your real number.

## Run locally

```bash
npm install
npm run dev
```

## Where things live

- `supabase/schema.sql` — the whole database: tables, security, functions, triggers, seed
- `app/lib/supabase.ts` — browser clients (one login per app), live-data hook
- `app/lib/supabaseServer.ts` — server-only service-key access (route handlers only)
- `app/lib/catalog.ts`, `app/lib/db.ts`, `app/lib/adminData.ts` — loading and mapping data
- `app/CustomerApp.tsx`, `app/technician/`, `app/dealer/`, `app/admin/` — the four apps (dealer screens in `app/components/dealer/`)
- `app/lib/dealerData.ts`, `app/lib/dealerAccounts.ts` — dealer app data, and dealer sign-up on the server
- `app/storefront/` — the public website
- `scripts/create-super-admin.mjs` — creates or resets the super admin login
