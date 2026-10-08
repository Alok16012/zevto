"use client";

/* Admin console data: shapes the screens use, and one loader that reads them
 * all from Supabase (row-level security lets staff see everything). */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fmtDay, toTechnician, type DbTechnician } from "./catalog";
import { fmtDateOnly, type DbOrder, type DbRequest, type DbReview } from "./db";
import type { Coupon, Review, ServiceType, Technician } from "./data";
import type { DbGalleryPart } from "./partsGallery";

/* ───────────── Shapes ───────────── */

export interface AdminCustomer {
  /** Auth user id. */
  id: string;
  /** Unique customer ID, e.g. CUS-100101. */
  code: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  joined: string;
  orders: number;
  spent: number;
  wallet: number;
  amc: "Active" | "Expiring" | "None";
  blocked: boolean;
}

export type AdminOrderStatus = "Placed" | "Shipped" | "Delivered" | "Cancelled";
export const ORDER_FLOW: AdminOrderStatus[] = ["Placed", "Shipped", "Delivered"];

export interface AdminOrder {
  /** Database id (uuid). */
  id: string;
  ref: string;
  customerId: string;
  items: string;
  amount: number;
  payment: string;
  paymentStatus: string;
  date: string;
  /** "YYYY-MM-DD" for reporting. */
  day: string;
  status: AdminOrderStatus;
  address: string;
}

export type AdminJobStatus =
  | "Awaiting tech" | "Unassigned" | "Assigned" | "On the way" | "Arrived" | "In Progress" | "Completed" | "Rescheduled" | "Cancelled";

export interface AdminJob {
  id: string;
  ref: string;
  customerId: string;
  type: ServiceType;
  product: string;
  date: string;
  /** "YYYY-MM-DD" visit date. */
  isoDate: string;
  slot: string;
  area: string;
  pincode: string;
  techId: string | null;
  preferredTechId: string | null;
  status: AdminJobStatus;
  amount: number;
  rating?: number;
  note?: string;
  customerLabel?: string;
  customerPhone?: string;
  raisedBy?: string;
  completedDay?: string | null;
}

export interface AdminTech extends Technician {
  status: "Online" | "Offline" | "On job";
  area: string;
  kyc: "Verified" | "Pending";
  active: boolean;
  email: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp: number;
  /** null = not tracked. */
  stock: number | null;
  active: boolean;
  /** Photo URLs; the first is the cover shown in the shop. */
  images: string[];
  spec: string;
  art: string;
  stages: string;
  warranty: string;
  description: string;
  sort: number;
}

export interface AdminCoupon extends Coupon {
  active: boolean;
  used: number;
  /** "YYYY-MM-DD". */
  expiresIso: string;
}

export interface AdminReview extends Review {
  status: "Published" | "Hidden" | "Flagged";
}

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  audience: string;
  channels: string[];
  sentAt: string;
  reach: number;
}

export const AUDIENCES = ["All customers", "AMC active", "No AMC", "Technicians"] as const;

export interface Dealer {
  id: string;
  /** Unique dealer ID, e.g. DLR-300101. */
  code: string;
  name: string;
  owner: string;
  phone: string;
  city: string;
  pincodes: string[];
  since: string;
  active: boolean;
  /** Self sign-ups start Pending; ops-added dealers are Verified. */
  kyc: "Pending" | "Verified";
  /** Login email, for dealers who signed up themselves. */
  email: string | null;
  gstin: string;
  address: string;
  /** Live listings / all listings the dealer has. */
  listings: { live: number; total: number };
  /** Dealer orders still waiting on the dealer (New, Accepted, Shipped). */
  openOrders: number;
}

export interface StockRequest {
  id: string;
  techId: string;
  items: Record<string, number>;
  status: "Pending" | "Approved" | "Rejected";
  at: string;
}

export interface AdminData {
  orders: AdminOrder[];
  jobs: AdminJob[];
  customers: AdminCustomer[];
  techs: AdminTech[];
  products: AdminProduct[];
  coupons: AdminCoupon[];
  reviews: AdminReview[];
  dealers: Dealer[];
  broadcasts: Broadcast[];
  stockRequests: StockRequest[];
  galleryParts: DbGalleryPart[];
}

/* ───────────── Loader ───────────── */

const jobStatus = (r: DbRequest): AdminJobStatus =>
  r.status === "Requested" ? (r.preferred_tech_id ? "Awaiting tech" : "Unassigned")
    : r.status === "With ops" ? "Unassigned" : (r.status as AdminJobStatus);

const areaOf = (address: string, pincode: string) => {
  const parts = address.replace(/^\w+ · /, "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(-2).join(", ").replace(/\s*\d{6}$/, "") : pincode;
};

async function all<T>(q: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function loadAdminData(sb: SupabaseClient): Promise<AdminData> {
  const [orders, requests, profiles, techs, allProducts, coupons, reviews, dealers, broadcasts, wallet, stock, galleryParts, dealerOrders] = await Promise.all([
    all<DbOrder>(sb.from("orders").select("*").order("created_at", { ascending: false }).limit(2000)),
    all<DbRequest>(sb.from("service_requests").select("*").order("created_at", { ascending: false }).limit(2000)),
    all<{ id: string; code: string; full_name: string; email: string | null; phone: string | null; blocked: boolean; created_at: string; role: string }>(
      sb.from("profiles").select("id, code, full_name, email, phone, blocked, created_at, role").eq("role", "customer").order("created_at", { ascending: false }).limit(5000)),
    all<DbTechnician>(sb.from("technicians").select("*").order("created_at")),
    // "*" so the console still loads before the images column exists.
    all<{ id: string; name: string; category: string; price: number; mrp: number; stock: number | null; active: boolean; images?: string[] | null;
      spec: string; art: string; stages: string; warranty: string; description: string; sort: number; dealer_id?: string | null }>(sb.from("products").select("*").order("sort")),
    all<{ code: string; title: string; descr: string; kind: "flat" | "percent"; value: number; max_off: number | null; min_order: number; applies_to: "product" | "service" | "all"; expires: string; active: boolean; used: number }>(
      sb.from("coupons").select("*").order("created_at", { ascending: false })),
    all<DbReview>(sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(1000)),
    all<{ id: string; code: string; name: string; owner: string; phone: string; city: string; pincodes: string[]; active: boolean; created_at: string;
      kyc?: "Pending" | "Verified"; email?: string | null; gstin?: string; address?: string }>(sb.from("dealers").select("*").order("created_at")),
    all<{ id: string; title: string; body: string; audience: string; channels: string[]; reach: number; created_at: string }>(sb.from("broadcasts").select("*").order("created_at", { ascending: false }).limit(100)),
    all<{ user_id: string; amount: number }>(sb.from("wallet_txns").select("user_id, amount").limit(20000)),
    all<{ id: string; tech_id: string; items: Record<string, number>; status: StockRequest["status"]; created_at: string }>(sb.from("stock_requests").select("*").order("created_at", { ascending: false }).limit(200)),
    // Optional until supabase/schema.sql has been re-run with the gallery table.
    all<DbGalleryPart>(sb.from("tech_parts").select("*").order("created_at", { ascending: false }).limit(1000)).catch(() => [] as DbGalleryPart[]),
    // Optional until supabase/schema.sql has been re-run with dealer orders.
    all<{ dealer_id: string; status: string }>(sb.from("dealer_orders").select("dealer_id, status").limit(5000)).catch(() => [] as { dealer_id: string; status: string }[]),
  ]);
  // Dealer listings are managed by the dealers; the catalogue screens show Zavtoo's own products.
  const products = allProducts.filter((p) => !p.dealer_id);
  const dealerListings = allProducts.filter((p) => p.dealer_id);

  const techById = new Map(techs.map((t) => [t.id, t]));
  const walletBy = new Map<string, number>();
  wallet.forEach((w) => walletBy.set(w.user_id, (walletBy.get(w.user_id) ?? 0) + w.amount));

  // AMC is active for a year after a completed AMC visit; "Expiring" in its last 30 days.
  const amcUntil = new Map<string, number>();
  requests.filter((r) => r.type === "AMC" && r.status === "Completed" && r.customer_id && r.completed_at).forEach((r) => {
    const until = new Date(r.completed_at!).getTime() + 365 * 864e5;
    amcUntil.set(r.customer_id!, Math.max(amcUntil.get(r.customer_id!) ?? 0, until));
  });

  const lastAddress = new Map<string, string>();
  [...requests].reverse().forEach((r) => { if (r.customer_id) lastAddress.set(r.customer_id, r.address); });
  [...orders].reverse().forEach((o) => lastAddress.set(o.customer_id, o.address));

  return {
    orders: orders.map((o) => ({
      id: o.id, ref: o.ref, customerId: o.customer_id, items: o.items.map((i) => (i.qty > 1 ? `${i.name} × ${i.qty}` : i.name)).join(", "),
      amount: o.amount, payment: o.payment, paymentStatus: o.payment_status, date: fmtDateOnly(o.created_at), day: o.created_at.slice(0, 10),
      status: o.status, address: o.address,
    })),
    jobs: requests.map((r) => ({
      id: r.id, ref: r.ref, customerId: r.customer_id ?? "", type: r.type, product: r.product, date: fmtDay(r.visit_date), isoDate: r.visit_date,
      slot: r.slot, area: areaOf(r.address, r.pincode), pincode: r.pincode, techId: r.tech_id, preferredTechId: r.preferred_tech_id,
      status: jobStatus(r), amount: r.amount, rating: r.rating ?? undefined,
      note: r.reschedule_reason ?? r.note ?? (r.description || undefined),
      customerLabel: r.customer_name, customerPhone: r.customer_phone,
      raisedBy: r.source === "technician" && r.raised_by ? techById.get(r.raised_by)?.name : undefined,
      completedDay: r.completed_at?.slice(0, 10) ?? null,
    })),
    customers: profiles.map((p) => {
      const mine = orders.filter((o) => o.customer_id === p.id && o.status !== "Cancelled");
      const jobsSpent = requests.filter((r) => r.customer_id === p.id && r.status === "Completed").reduce((s, r) => s + r.amount, 0);
      const until = amcUntil.get(p.id) ?? 0;
      const addr = lastAddress.get(p.id) ?? "";
      return {
        id: p.id, code: p.code, name: p.full_name || "(no name)", phone: p.phone ?? "", email: p.email ?? "",
        city: addr ? areaOf(addr, "—") : "—", joined: fmtDateOnly(p.created_at), orders: mine.length,
        spent: mine.reduce((s, o) => s + o.amount, 0) + jobsSpent, wallet: walletBy.get(p.id) ?? 0,
        amc: until > Date.now() ? (until - Date.now() < 30 * 864e5 ? "Expiring" : "Active") : "None", blocked: p.blocked,
      };
    }),
    techs: techs.map((t) => ({
      ...toTechnician(t), status: t.status, kyc: t.kyc, active: t.active, email: t.email ?? "",
      area: t.pincodes?.length ? t.pincodes.join(", ") : "No pincodes yet",
    })),
    products: products.map((p) => ({
      id: p.id, name: p.name, category: p.category, price: p.price, mrp: p.mrp, stock: p.stock, active: p.active, images: p.images ?? [],
      spec: p.spec ?? "", art: p.art ?? "classic", stages: p.stages ?? "", warranty: p.warranty ?? "", description: p.description ?? "", sort: p.sort ?? 0,
    })),
    coupons: coupons.map((c) => ({
      code: c.code, title: c.title, desc: c.descr, kind: c.kind, value: c.value, maxOff: c.max_off ?? undefined, minOrder: c.min_order,
      appliesTo: c.applies_to, expires: fmtDay(c.expires), expiresIso: c.expires, active: c.active, used: c.used,
    })),
    reviews: reviews.map((r) => ({
      id: r.id, productId: r.product_id ?? undefined, techId: r.tech_id ?? undefined, author: r.author_name, stars: r.stars, body: r.body,
      date: fmtDateOnly(r.created_at), status: r.status,
    })),
    dealers: dealers.map((d) => ({
      id: d.id, code: d.code, name: d.name, owner: d.owner, phone: d.phone, city: d.city, pincodes: d.pincodes ?? [],
      since: fmtDateOnly(d.created_at).slice(3), active: d.active,
      kyc: d.kyc ?? "Verified", email: d.email ?? null, gstin: d.gstin ?? "", address: d.address ?? "",
      listings: {
        live: dealerListings.filter((p) => p.dealer_id === d.id && p.active && (p.stock ?? 0) > 0).length,
        total: dealerListings.filter((p) => p.dealer_id === d.id).length,
      },
      openOrders: dealerOrders.filter((o) => o.dealer_id === d.id && ["New", "Accepted", "Shipped"].includes(o.status)).length,
    })),
    broadcasts: broadcasts.map((b) => ({
      id: b.id, title: b.title, body: b.body, audience: b.audience, channels: b.channels, reach: b.reach,
      sentAt: new Date(b.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }),
    })),
    stockRequests: stock.map((s) => ({ id: s.id, techId: s.tech_id, items: s.items, status: s.status, at: fmtDateOnly(s.created_at) })),
    galleryParts,
  };
}

/** Tables whose changes should refresh the console. */
export const ADMIN_WATCH = [
  "orders", "service_requests", "profiles", "technicians", "products", "coupons", "reviews", "dealers", "broadcasts", "stock_requests", "tech_parts", "dealer_orders",
].map((table) => ({ table }));
