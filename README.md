# Zavtoo — Customer App

Mobile-first customer app for **Zavtoo Pani Filter Pvt Ltd**: buy RO purifiers and spares, book installation / repair / AMC visits, track orders and service jobs, and chat with support.

Built with Next.js 16, React 19 and Poppins. The look (colours, cards, bottom nav) follows the CLATians student app.

> **Demo build.** All data is sample data in `app/lib/data.ts` and lives in memory — orders, bookings, wallet, reviews, notifications and chat reset on refresh. Technician assignment and chat replies are simulated. A real backend (Supabase) will be wired in later.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — best viewed at phone width (the app is capped at 430px).

## Screens

Splash · Onboarding · Home · Product listing · Product details (+ ratings & reviews) · Cart & checkout (coupon, wallet, address) · Order placed · Services (catalogue, service details, FAQs) · Book service · My orders · Order details · Track service (+ service rating) · Technician profile & reviews · Chat · Profile (+ edit profile, saved addresses, wallet, offers & coupons, refer & earn, notifications centre & preferences, my ratings & reviews, service history, AMC plans, payments, help, about)

### Customer features

- **Customers & profile** — edit name, email, gender and date of birth (validated), profile-completion meter, add / edit / delete / set-default addresses; the default address is used at checkout.
- **Offers / coupons** — offers page, coupon picker sheet in the cart and in service booking, min-order and product/service rules (`COUPONS` in `data.ts`).
- **Wallet** — balance and transaction history, add money (demo, no gateway), pay part or all of an order from the wallet.
- **Rating service** — after a job completes: stars, quick tags and a comment; the rating shows on the tracker and on the technician's profile.
- **Referral** — personal code, share / copy, referral list and earnings; demo button credits the ₹250 bonus to the wallet.
- **App notifications** — notification centre with unread badge on Home and Profile, filters, mark all read, deep links, and push / SMS / WhatsApp / offers preferences. Orders, bookings, technician assignment, job completion and wallet credits all create notifications.
- **Technician & product reviews** — rating breakdown, sortable/filterable review list, write or edit a review from a delivered order or the product page, technician profiles with skills and reviews.
- **Service page** — the Service tab is now a catalogue (Installation, Repair, AMC, Filter Change, Water Test, Uninstall) with running jobs, how-it-works, top technicians and FAQs; each service has a details page leading to booking.

## Technician app — `/technician`

A separate partner app for Zavtoo technicians at http://localhost:3000/technician (demo login: any 10-digit mobile number starting 6–9, OTP `1234`; logged in as technician Rohit Kumar).

- **Jobs** — online/offline toggle, today's stats, a live incoming job request with a 60-second accept window, current-job banner, and Today / Upcoming / History lists.
- **Job flow** — Accepted → Start travel (call + Google Maps navigation) → Arrived → customer start code (demo code shown) → In progress: service checklist, input/output TDS, parts from the van, notes → collect payment (UPI / cash / AMC covered) → completed with earning. Jobs can be rescheduled with a reason.
- **Inventory** — van stock with low / out-of-stock flags, parts deducted when a job closes, and a stock request to the warehouse.
- **Earnings** — last-7-days chart, today's jobs and payouts, cash in hand, weekly target bonus and payout history. Payout rule: 60% of the visit charge (₹250 for free jobs) + 10% on parts.
- **Profile** — partner ID and KYC, service area, working days, auto-accept, skills, documents and customer reviews.

Like the customer app, all data is in memory (`app/lib/techData.ts`) and resets on refresh; the two apps don't share state until the backend is wired in.

## Admin console — `/admin`

Operations console at http://localhost:3000/admin (demo login: `admin@zavtoo.in` / `zavtoo@demo`, kept for the browser session). Sidebar on desktop, drawer menu on phones.

- **Dashboard** — revenue today, open / unassigned jobs, customers, service rating, 14-day revenue chart, a "needs attention" list and today's job breakdown.
- **Orders** — filter and search; mark shipped → delivered; cancel with refund (or no refund for COD).
- **Service jobs & dispatch** — filter by status; assign, reassign or re-book technicians, ranked by area coverage, workload that day and rating; cancel jobs.
- **Customers** — search and AMC filters; customer detail with orders, jobs and wallet; add wallet credit; block / unblock.
- **Technicians** — online / on-job / offline counts, approve KYC, activate / deactivate.
- **Products & stock** — edit price, MRP and stock (price can't exceed MRP), low-stock flags, list / hide from the app.
- **Offers & coupons** — pause / resume coupons, create new ones with validation.
- **Reviews** — moderate flagged reviews: publish, hide or remove.
- **Notifications** — compose a push / SMS / WhatsApp broadcast for an audience segment with a live preview and send history.

Sample data lives in `app/lib/adminData.ts` and resets on refresh; it isn't connected to the customer or technician apps yet.

## Where things live

- `app/CustomerApp.tsx` — app shell, navigation and demo state
- `app/components/` — screens and shared UI
  - `Account.tsx` — edit profile, addresses, wallet, referral, notifications
  - `Offers.tsx` — offers page and the apply-coupon sheet
  - `Reviews.tsx` — product reviews, technician profile, service rating
  - `ServicesHub.tsx` — service catalogue and service details
- `app/lib/data.ts` — sample catalogue, orders, services and chat
- `app/technician/` — technician partner app (`TechnicianApp.tsx` shell, `JobScreens.tsx`, `PartnerScreens.tsx`)
- `app/lib/techData.ts` — sample jobs, parts, stock and earnings for the partner app
- `app/admin/` — admin console (`AdminApp.tsx` shell + login, `Dashboard.tsx`, `Operations.tsx`, `People.tsx`, `Catalog.tsx`, `kit.tsx` table/modal/badge components)
- `app/lib/adminData.ts` — sample customers, orders, jobs, stock and reporting for the admin console
- `public/zavtoo-*.png` — logo assets cut from `assets/zavtoo-logo-source.jpeg`
