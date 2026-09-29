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

## Where things live

- `app/CustomerApp.tsx` — app shell, navigation and demo state
- `app/components/` — screens and shared UI
  - `Account.tsx` — edit profile, addresses, wallet, referral, notifications
  - `Offers.tsx` — offers page and the apply-coupon sheet
  - `Reviews.tsx` — product reviews, technician profile, service rating
  - `ServicesHub.tsx` — service catalogue and service details
- `app/lib/data.ts` — sample catalogue, orders, services and chat
- `public/zavtoo-*.png` — logo assets cut from `assets/zavtoo-logo-source.jpeg`
