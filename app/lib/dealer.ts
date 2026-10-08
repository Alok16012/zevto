/* Dealer side of Zavtoo: a local RO shop that lists its own stock on the
 * customer app, fulfils the orders that come in, and sends its technicians on
 * installation / repair / AMC jobs in its service area.
 *
 * Demo build: the whole dealer state lives in localStorage so the customer app
 * (/) and the dealer app (/dealer) can see each other's changes in the same
 * browser. A real backend replaces `loadDealer` / `saveDealer` later. */

import { PRODUCTS, fmtDate, type ArtKind, type Category, type Product } from "./data";

export interface DealerProfile {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city: string;
  pincode: string;
  /** Pincodes this dealer delivers to and services. */
  serviceAreas: string[];
  since: string;
  kyc: "Verified" | "Pending";
  tier: "Silver" | "Gold" | "Platinum";
  rating: number;
  bank: { holder: string; account: string; ifsc: string } | null;
}

export interface Listing {
  id: string;
  /** Zavtoo catalogue product this listing resells, if any. */
  baseId?: string;
  name: string;
  spec: string;
  category: Category;
  art: ArtKind;
  price: number;
  mrp: number;
  stock: number;
  active: boolean;
  warranty: string;
  description: string;
}

export type DealerOrderStatus = "New" | "Accepted" | "Shipped" | "Delivered" | "Rejected";

export interface DealerOrder {
  id: string;
  customer: string;
  phone: string;
  address: string;
  items: { listingId?: string; name: string; qty: number; price: number }[];
  amount: number;
  date: string;
  pay: "Online" | "COD";
  status: DealerOrderStatus;
}

export type JobStatus = "New" | "Assigned" | "In Progress" | "Completed";

export interface Job {
  id: string;
  type: "Installation" | "Repair" | "AMC";
  customer: string;
  phone: string;
  address: string;
  product: string;
  date: string;
  slot: string;
  note: string;
  amount: number;
  status: JobStatus;
  techId?: string;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  available: boolean;
}

export interface Payout {
  id: string;
  date: string;
  amount: number;
  status: "Paid" | "Processing";
}

export interface DealerState {
  registered: boolean;
  profile: DealerProfile;
  listings: Listing[];
  orders: DealerOrder[];
  jobs: Job[];
  team: Technician[];
  payouts: Payout[];
}

/** Zavtoo keeps this share of every delivered order / completed job. */
export const PLATFORM_FEE = 0.08;
export const LOW_STOCK = 2;

export const ART_FOR: Record<Category, ArtKind> = { domestic: "classic", commercial: "commercial", spare: "spare" };

const daysAgo = (n: number) => fmtDate(new Date(Date.now() - n * 86400000));

export function demoDealer(): DealerState {
  const base = (id: string) => PRODUCTS.find((p) => p.id === id)!;
  const classic = base("classic");
  const c50 = base("commercial-50");
  return {
    registered: true,
    profile: {
      id: "DLR1021",
      shopName: "Sharma RO Point",
      ownerName: "Rakesh Sharma",
      phone: "9810012345",
      email: "sharmaro@gmail.com",
      gstin: "09ABCPS1234F1Z5",
      address: "Shop 14, Atta Market, Sector 18",
      city: "Noida",
      pincode: "201301",
      serviceAreas: ["201301", "201303", "201309"],
      since: "Mar 2025",
      kyc: "Verified",
      tier: "Gold",
      rating: 4.6,
      bank: { holder: "Sharma RO Point", account: "XXXXXX4821", ifsc: "HDFC0001234" },
    },
    listings: [
      { id: "dl-101", baseId: "classic", name: classic.name, spec: classic.spec, category: "domestic", art: "classic", price: 12499, mrp: classic.mrp, stock: 6, active: true, warranty: classic.warranty, description: "Genuine Zavtoo unit with free installation within 24 hours in Noida." },
      { id: "dl-102", name: "RO Membrane 80 GPD", spec: "Fits most domestic purifiers", category: "spare", art: "cartridge", price: 899, mrp: 1199, stock: 24, active: true, warranty: "6 Months", description: "High-rejection membrane. Fitting included when bought with a service visit." },
      { id: "dl-103", baseId: "commercial-50", name: c50.name, spec: c50.spec, category: "commercial", art: "commercial", price: 41499, mrp: c50.mrp, stock: 1, active: true, warranty: c50.warranty, description: "Ex-showroom stock. Site survey and plumbing done by our own team." },
      { id: "dl-104", name: "Under-sink RO 6 Stage", spec: "Hidden install · 8 L tank", category: "domestic", art: "pro", price: 10999, mrp: 13999, stock: 3, active: false, warranty: "1 Year", description: "Compact under-sink purifier with a separate faucet." },
      { id: "dl-105", name: "Copper + RO Purifier", spec: "7 Stage · copper infusion", category: "domestic", art: "premium", price: 15499, mrp: 18999, stock: 0, active: true, warranty: "1 Year", description: "Adds trace copper after RO. Restocking soon." },
    ],
    orders: [
      { id: "DO2051", customer: "Priya Verma", phone: "9876500011", address: "C-12, Sector 50, Noida 201301", items: [{ listingId: "dl-101", name: classic.name, qty: 1, price: 12499 }], amount: 12499, date: daysAgo(0), pay: "Online", status: "New" },
      { id: "DO2050", customer: "Imran Khan", phone: "9876500022", address: "Flat 704, Supertech Capetown, Sector 74, Noida 201301", items: [{ listingId: "dl-102", name: "RO Membrane 80 GPD", qty: 2, price: 899 }], amount: 1798, date: daysAgo(0), pay: "COD", status: "New" },
      { id: "DO2047", customer: "Neha Gupta", phone: "9876500033", address: "B-3, Sector 62, Noida 201309", items: [{ listingId: "dl-101", name: classic.name, qty: 1, price: 12499 }], amount: 12499, date: daysAgo(1), pay: "Online", status: "Accepted" },
      { id: "DO2042", customer: "Sunrise Clinic", phone: "9876500044", address: "Plot 9, Sector 63, Noida 201301", items: [{ listingId: "dl-103", name: c50.name, qty: 1, price: 41499 }], amount: 41499, date: daysAgo(3), pay: "Online", status: "Shipped" },
      { id: "DO2036", customer: "Amit Singh", phone: "9876500055", address: "H-88, Sector 27, Noida 201301", items: [{ listingId: "dl-101", name: classic.name, qty: 1, price: 12499 }, { listingId: "dl-102", name: "RO Membrane 80 GPD", qty: 1, price: 899 }], amount: 13398, date: daysAgo(6), pay: "COD", status: "Delivered" },
      { id: "DO2031", customer: "Kavita Rao", phone: "9876500066", address: "A-201, Sector 93, Noida 201304", items: [{ listingId: "dl-102", name: "RO Membrane 80 GPD", qty: 3, price: 899 }], amount: 2697, date: daysAgo(9), pay: "Online", status: "Delivered" },
    ],
    jobs: [
      { id: "JB3108", type: "Installation", customer: "Neha Gupta", phone: "9876500033", address: "B-3, Sector 62, Noida 201309", product: classic.name, date: daysAgo(-1), slot: "10:00 AM – 12:00 PM", note: "Wall mount near the kitchen sink.", amount: 0, status: "New" },
      { id: "JB3104", type: "Repair", customer: "Vikas Jain", phone: "9876500077", address: "D-45, Sector 41, Noida 201303", product: "Other brand purifier", date: daysAgo(0), slot: "02:00 – 04:00 PM", note: "Water tastes salty, TDS high.", amount: 499, status: "Assigned", techId: "T2" },
      { id: "JB3101", type: "AMC", customer: "Amit Singh", phone: "9876500055", address: "H-88, Sector 27, Noida 201301", product: classic.name, date: daysAgo(0), slot: "10:00 AM – 12:00 PM", note: "Quarterly visit · filter change due.", amount: 1999, status: "In Progress", techId: "T1" },
      { id: "JB3094", type: "Repair", customer: "Kavita Rao", phone: "9876500066", address: "A-201, Sector 93, Noida 201304", product: "AquaPure RO Pro", date: daysAgo(4), slot: "12:00 – 02:00 PM", note: "Leak from the storage tank.", amount: 499, status: "Completed", techId: "T1" },
    ],
    team: [
      { id: "T1", name: "Rohit Kumar", phone: "9800000001", available: true },
      { id: "T2", name: "Sanjay Yadav", phone: "9800000002", available: true },
      { id: "T3", name: "Deepak Mehra", phone: "9800000003", available: false },
    ],
    payouts: [
      { id: "PO881", date: daysAgo(2), amount: 18240, status: "Paid" },
      { id: "PO874", date: daysAgo(9), amount: 26915, status: "Paid" },
    ],
  };
}

/** What a brand-new dealer starts with after registering. */
export function freshDealer(profile: Omit<DealerProfile, "id" | "since" | "kyc" | "tier" | "rating" | "bank">): DealerState {
  const now = new Date();
  return {
    registered: true,
    profile: {
      ...profile,
      id: `DLR${1000 + Math.floor(Math.random() * 9000)}`,
      since: fmtDate(now).slice(3),
      kyc: "Pending", tier: "Silver", rating: 0, bank: null,
    },
    listings: [], orders: [], jobs: [], team: [], payouts: [],
  };
}

const KEY = "zavtoo:dealer:v1";

export function loadDealer(): DealerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DealerState) : null;
  } catch { return null; }
}

export function saveDealer(s: DealerState | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch { /* storage blocked — the demo still runs in memory */ }
}

/* ── Customer-app side ── */

/** Live, in-stock dealer listings shaped as catalogue products, so the shop screens can show them. */
export function dealerProducts(): Product[] {
  const s = loadDealer();
  if (!s?.registered) return [];
  return s.listings.filter((l) => l.active && l.stock > 0).map((l) => {
    const base = l.baseId ? PRODUCTS.find((p) => p.id === l.baseId) : undefined;
    return {
      id: l.id, name: l.name, spec: l.spec, price: l.price, mrp: Math.max(l.mrp, l.price),
      category: l.category, art: l.art,
      rating: base?.rating ?? 4.4, reviews: base?.reviews ?? 0,
      stages: base?.stages ?? (l.category === "spare" ? "Spare" : "Multi Stage"),
      warranty: l.warranty, description: l.description,
      soldBy: `${s.profile.shopName}, ${s.profile.city}`,
    };
  });
}

/** Customer checkout hands the dealer's share of the cart to the dealer's inbox. */
export function sendOrderToDealer(order: Omit<DealerOrder, "status">) {
  const s = loadDealer();
  if (!s) return;
  saveDealer({ ...s, orders: [{ ...order, status: "New" }, ...s.orders] });
}

export const net = (amount: number) => Math.round(amount * (1 - PLATFORM_FEE));
