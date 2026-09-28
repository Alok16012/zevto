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

## Where things live

- `app/CustomerApp.tsx` — app shell, navigation and demo state
- `app/components/` — screens and shared UI
- `app/lib/data.ts` — sample catalogue, orders, services and chat
- `public/zavtoo-*.png` — logo assets cut from `assets/zavtoo-logo-source.jpeg`
