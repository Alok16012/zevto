"use client";

/* Shapes and loader for the dealer app at /dealer. Row-level security decides
 * what comes back: the dealer's own shop, listings and orders, their team, and
 * service jobs that are their team's or open in their pincodes. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArtKind, Category } from "./data";
import type { DbTechnician } from "./catalog";
import type { DbRequest } from "./db";

export interface DbDealer {
  id: string; code: string; user_id: string | null; name: string; owner: string; phone: string; email: string | null;
  gstin: string; address: string; city: string; pincodes: string[]; kyc: "Pending" | "Verified"; active: boolean; created_at: string;
}

/** A dealer listing is a product row with dealer_id set. */
export interface DbListing {
  id: string; name: string; spec: string; price: number; mrp: number; category: Category; art: ArtKind; stages: string;
  warranty: string; description: string; stock: number; active: boolean; images: string[]; dealer_id: string; sold_by: string | null;
  rating: number; reviews_count: number; updated_at: string;
}

export type DealerOrderStatus = "New" | "Accepted" | "Shipped" | "Delivered" | "Rejected" | "Cancelled";

export interface DbDealerOrder {
  id: string; order_id: string; dealer_id: string;
  items: { id: string; name: string; qty: number; price: number; mrp: number; art?: ArtKind }[];
  amount: number; customer_name: string; customer_phone: string; address: string; pincode: string; payment: string;
  whole_order: boolean; status: DealerOrderStatus; reject_reason: string | null; created_at: string; updated_at: string;
}

export interface DealerData {
  dealer: DbDealer;
  listings: DbListing[];
  orders: DbDealerOrder[];
  jobs: DbRequest[];
  team: DbTechnician[];
}

export async function loadDealerData(sb: SupabaseClient, uid: string): Promise<DealerData> {
  const me = await sb.from("dealers").select("*").eq("user_id", uid).maybeSingle();
  if (me.error) throw me.error;
  if (!me.data) throw new Error("NO_DEALER");
  const dealer = me.data as DbDealer;
  const [listings, orders, jobs, team] = await Promise.all([
    sb.from("products").select("*").eq("dealer_id", dealer.id).order("updated_at", { ascending: false }),
    sb.from("dealer_orders").select("*").eq("dealer_id", dealer.id).order("created_at", { ascending: false }).limit(300),
    sb.from("service_requests").select("*").order("visit_date", { ascending: true }).limit(300),
    sb.from("technicians").select("*").eq("dealer_id", dealer.id).order("name"),
  ]);
  const err = listings.error ?? orders.error ?? jobs.error ?? team.error;
  if (err) throw err;
  return {
    dealer,
    listings: (listings.data ?? []) as DbListing[],
    orders: (orders.data ?? []) as DbDealerOrder[],
    jobs: (jobs.data ?? []) as DbRequest[],
    team: (team.data ?? []) as DbTechnician[],
  };
}

export const LOW_STOCK = 2;

/** Customers only see a listing while it's switched on, in stock and the shop is verified. */
export const isLive = (l: DbListing) => l.active && l.stock > 0;

/** Jobs a dealer can still hand to someone on their team. */
export const assignable = (j: DbRequest) => ["Requested", "With ops", "Assigned", "Rescheduled"].includes(j.status);

/** A job waiting for anyone — not yet taken by a technician. */
export const isOpenJob = (j: DbRequest) => !j.tech_id && (j.status === "With ops" || (j.status === "Requested" && !j.preferred_tech_id));
