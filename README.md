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

## Apps talking to each other (demo bridge)

Until the backend is live, the three apps share a little state through `localStorage` (`app/lib/bridge.ts`), so open them in separate tabs of the same browser:

1. **Customer** books a service → a few seconds later ops "assigns" Rohit Kumar and the booking appears in the **technician** app (tagged APP BOOKING, usually under Upcoming). The customer sees who is coming and a start code — **but no location yet**.
2. **Technician** taps **Start Travel** → only now does the customer's Track Service screen show a **live map** with the technician's photo moving along the route, ETA and distance. Location is never shared on accept/assign.
3. Technician taps **I've Arrived** → the customer is told to share the start code; entering it in the technician app moves the customer's job to *In Progress* and location sharing stops. Closing the job moves the customer to rating.
4. **Technician tasks** — from Jobs → *Create a new task*, a technician can **keep it** (added to their own jobs as MY TASK) or **send it to ops** (shows in the **admin** Service Jobs list as *Raised by …*). When admin assigns or cancels it, the technician's *Sent to ops* list updates, and a task assigned to Rohit lands in his jobs.
5. **Photos of the RO** — customers attach up to 4 photos while booking (Service → pick a service → *📷 Photos of your RO*; recommended for repairs and filter changes, hidden for new installs), can add or remove them on Track Service until the visit starts, and can send one to support with 📎 / *📷 Send RO photo* in Chat. Photos are shrunk to ~720 px JPEGs and show up in the technician's job (📷 count on the card, tap to enlarge), updating live if the customer changes them.
6. **Technician photo** — Profile → 📷 / *Add your photo* (cropped to 256 px). Until then each technician has an illustrated portrait in Zavtoo uniform. The photo shows in the technician app, on the customer's Track Service / technician profile / live map, and in admin.

No second tab? The customer's Track Service screen has demo buttons that stand in for the technician (start ride → arrive → start job). Reloading the customer app clears bookings and rides from the bridge.

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
- `app/lib/bridge.ts` — demo bridge between the three apps (bookings, rides, ops tasks, technician photos)
- `app/components/TechAvatar.tsx`, `LiveTracking.tsx` — technician photo/portrait and the customer's live-location map
- `app/technician/NewTask.tsx` — technician's new-task form and "Sent to ops" list
- `app/lib/adminData.ts` — sample customers, orders, jobs, stock and reporting for the admin console
- `public/zavtoo-*.png` — logo assets cut from `assets/zavtoo-logo-source.jpeg`
