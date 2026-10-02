"use client";

/* Database rows → the shapes the screens already use. */

import { fmtDay } from "./catalog";
import {
  SERVICE_STEPS, TECHNICIANS, initialsOf,
  type AppNotification, type ArtKind, type ChatMessage, type JobState, type Order, type OrderStatus, type Review,
  type ServiceRequest, type ServiceType, type WalletTxn,
} from "./data";
import type { Job, JobStatus } from "./techData";

export interface DbOrder {
  id: string; ref: string; customer_id: string; items: { id: string; name: string; qty: number; price: number; mrp: number; art?: ArtKind }[];
  title: string; art: ArtKind; mrp_total: number; subtotal: number; coupon: string | null; discount: number; wallet_used: number;
  amount: number; payment: string; payment_status: string; status: "Placed" | "Shipped" | "Delivered" | "Cancelled"; address: string;
  created_at: string; updated_at: string;
}

export interface DbRequest {
  id: string; ref: string; customer_id: string | null; customer_name: string; customer_phone: string; address: string; pincode: string;
  lat: number | null; lng: number | null; type: ServiceType; product: string; visit_date: string; slot: string; description: string;
  photos: string[]; price: number; coupon: string | null; discount: number; amount: number; status: JobState;
  preferred_tech_id: string | null; tech_id: string | null; source: "customer" | "technician"; raised_by: string | null;
  note: string | null; reschedule_reason: string | null; checklist: string[]; tds_before: string; tds_after: string;
  parts: { id: string; qty: number }[]; tech_notes: string; payment: "Cash" | "UPI" | "AMC covered" | null;
  rating: number | null; rating_tags: string[]; rating_comment: string;
  assigned_at: string | null; trip_started_at: string | null; arrived_at: string | null; started_at: string | null;
  completed_at: string | null; rated_at: string | null; eta_min: number | null; distance_km: number | null;
  created_at: string; updated_at: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "02 Oct 2026, 10:24 AM" in the viewer's time zone. */
export const fmtStamp = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  const t = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${t}`;
};
export const fmtDateOnly = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const toOrder = (o: DbOrder): Order => ({
  id: o.id, ref: o.ref, kind: "product", title: o.title, art: o.art, amount: o.amount, date: fmtDateOnly(o.created_at),
  status: o.status as OrderStatus, productIds: o.items.map((i) => i.id), coupon: o.coupon ?? undefined,
  discount: o.discount || undefined, walletUsed: o.wallet_used || undefined, items: o.items, payment: o.payment,
  paymentStatus: o.payment_status, address: o.address, createdAt: o.created_at,
});

/** Where a job sits on the customer's 5-step tracker. */
const stepOf = (s: JobState) =>
  s === "Completed" ? 4 : s === "In Progress" ? 2 : ["Assigned", "On the way", "Arrived", "Rescheduled"].includes(s) ? 1 : 0;

export function toServiceRequest(r: DbRequest): ServiceRequest {
  const t = TECHNICIANS.find((x) => x.id === r.tech_id);
  return {
    id: r.id, ref: r.ref, status: r.status, type: r.type, product: r.product, date: fmtDay(r.visit_date), slot: r.slot,
    description: r.description, current: stepOf(r.status),
    timeline: SERVICE_STEPS.map((label, i) => ({
      label, at: fmtStamp([r.created_at, r.assigned_at, r.started_at, r.completed_at, r.rated_at][i]),
    })),
    technician: r.tech_id ? {
      id: r.tech_id, code: t?.code ?? "", name: t?.name ?? "Your technician", initials: initialsOf(t?.name ?? "T"),
      rating: t?.rating ?? 0, phone: t?.phone ?? "",
    } : null,
    preferredTechId: r.preferred_tech_id,
    rating: r.rating ? { stars: r.rating, tags: r.rating_tags ?? [], comment: r.rating_comment ?? "" } : undefined,
    address: r.address, photos: r.photos ?? [], pincode: r.pincode, lat: r.lat, lng: r.lng,
    tripStartedAt: r.trip_started_at, etaMin: r.eta_min, distanceKm: r.distance_km == null ? null : Number(r.distance_km),
    price: r.price, discount: r.discount, amount: r.amount, rescheduleReason: r.reschedule_reason,
  };
}

/** A booking also shows in My Orders. */
export function requestAsOrder(r: DbRequest): Order {
  const status: OrderStatus = r.status === "Completed" ? "Completed" : r.status === "Cancelled" ? "Cancelled"
    : r.status === "Rescheduled" ? "Rescheduled" : ["Requested", "With ops"].includes(r.status) ? "Requested" : "In Progress";
  return {
    id: r.id, ref: r.ref, kind: "service", title: `Service Booking · ${r.type}`, art: "spare", amount: r.amount,
    date: fmtDateOnly(r.created_at), status, serviceId: r.id, coupon: r.coupon ?? undefined, discount: r.discount || undefined,
    createdAt: r.created_at,
  };
}

/** Technician app view of a job. */
export function toJob(r: DbRequest, me: string): Job {
  const status: JobStatus = r.status === "Requested" ? "New" : r.status === "Assigned" ? "Accepted"
    : r.status === "With ops" || r.status === "Cancelled" ? "Rejected" : (r.status as JobStatus);
  return {
    id: r.id, ref: r.ref, type: r.type, product: r.product, date: fmtDay(r.visit_date), isoDate: r.visit_date, slot: r.slot,
    issue: r.description || "No details given.", status, pincode: r.pincode,
    customer: { name: r.customer_name, phone: r.customer_phone, address: r.address, distanceKm: r.distance_km == null ? null : Number(r.distance_km), lat: r.lat, lng: r.lng },
    visitCharge: r.price - r.discount, amc: r.type === "AMC" && r.price === 0, needsCode: Boolean(r.customer_id),
    parts: r.parts ?? [], checklist: r.checklist ?? [], tdsBefore: r.tds_before ?? "", tdsAfter: r.tds_after ?? "", notes: r.tech_notes ?? "",
    payment: r.payment ?? undefined, completedAt: fmtStamp(r.completed_at) ?? undefined, completedIso: r.completed_at,
    customerRating: r.rating ?? undefined, rescheduleReason: r.reschedule_reason ?? undefined, photos: r.photos ?? [],
    source: r.source === "technician" && r.raised_by === me ? "Self-created" : r.customer_id ? "Customer app" : undefined,
  };
}

export interface DbReview {
  id: string; product_id: string | null; tech_id: string | null; author_id: string; author_name: string;
  stars: number; body: string; status: "Published" | "Hidden" | "Flagged"; created_at: string;
}
export const toReview = (r: DbReview, me?: string): Review => ({
  id: r.id, productId: r.product_id ?? undefined, techId: r.tech_id ?? undefined, author: r.author_name, stars: r.stars,
  body: r.body, date: fmtDateOnly(r.created_at), mine: Boolean(me && r.author_id === me),
});

export const toTxn = (t: { id: string; title: string; amount: number; created_at: string }): WalletTxn =>
  ({ id: t.id, title: t.title, amount: t.amount, at: fmtDateOnly(t.created_at) });

export const toNotification = (n: { id: string; kind: AppNotification["kind"]; title: string; body: string; link: AppNotification["link"]; read: boolean; created_at: string }): AppNotification =>
  ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link ?? undefined, read: n.read, at: fmtStamp(n.created_at) ?? "" });

export const toChat = (m: { id: string; sender: "customer" | "agent"; body: string; image_path: string | null; created_at: string }, viewer: "customer" | "agent"): ChatMessage => ({
  id: m.id, from: m.sender === (viewer === "customer" ? "customer" : "agent") ? "me" : "agent", body: m.body,
  image: m.image_path ?? undefined, at: new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase(),
});

/** Great-circle distance in km. */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough city-traffic ETA: ~18 km/h door to door, at least 2 minutes. */
export const etaMinutes = (km: number) => Math.max(2, Math.round((km / 18) * 60));
