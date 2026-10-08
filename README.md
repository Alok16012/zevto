# Zavtoo — Customer App

Mobile-first customer app for **Zavtoo Pani Filter Pvt Ltd**: buy RO purifiers and spares, book installation / repair / AMC visits, track orders and service jobs, and chat with support.

Built with Next.js 16, React 19 and Poppins. The look (colours, cards, bottom nav) follows the CLATians student app.

> **Demo build.** All data is sample data in `app/lib/data.ts` and lives in memory — orders, bookings and chat reset on refresh. Technician assignment and chat replies are simulated. A real backend (Supabase) will be wired in later.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — best viewed at phone width (the app is capped at 430px).

## Screens

Splash · Onboarding · Home · Product listing · Product details · Cart & checkout · Order placed · Book service · My orders · Order details · Track service · Chat · Profile (+ service history, AMC plans, addresses, payments, notifications, help, about)

## Dealer app — `/dealer`

Local RO shops sign up as Zavtoo dealers, list what they stock, and fulfil orders and service jobs in their pincodes. Zavtoo keeps an 8% fee on delivered orders and paid jobs; the rest is paid out weekly.

Register (or "Explore with a demo shop") · Dashboard (earnings, new orders, open jobs, low stock) · My listings (add / edit / delete, resell a Zavtoo model or list your own, stock, pause) · Orders (accept → dispatch → deliver, or reject) · Service jobs (assign a technician, start, complete) · Shop profile (details, service pincodes, GST, bank) · Technicians · Payouts · Help

Live dealer listings appear in the customer catalogue as "Sold by …", and buying one drops the order into the dealer's inbox. In the demo this link runs through `localStorage` (key `zavtoo:dealer:v1`), so both apps must be open in the same browser. Customers aren't filtered by pincode yet.

## Where things live

- `app/CustomerApp.tsx` — app shell, navigation and demo state
- `app/components/` — screens and shared UI
- `app/lib/data.ts` — sample catalogue, orders, services and chat
- `app/dealer/` — the `/dealer` route and its app shell
- `app/components/dealer/` — dealer screens
- `app/lib/dealer.ts` — dealer types, demo shop and the shared demo store
- `public/zavtoo-*.png` — logo assets cut from `assets/zavtoo-logo-source.jpeg`
