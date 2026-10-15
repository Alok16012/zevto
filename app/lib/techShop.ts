"use client";

/* Technician shop: technicians buy Zavtoo products from ops (tech_purchases);
 * delivered units land in their own list (tech_listings), which customers in
 * their pincodes can buy in the app. Customers' orders arrive as tech_orders. */

import type { ArtKind } from "./data";

export interface DbTechListing {
  id: string; tech_id: string;
  /** The Zavtoo catalogue product. */
  product_id: string;
  /** The technician's selling price (up to MRP). */
  price: number;
  stock: number;
  selling: boolean;
  created_at: string; updated_at: string;
}

export type PurchaseStatus = "Pending" | "Delivered" | "Rejected" | "Cancelled";

export interface DbTechPurchase {
  id: string; ref: string; tech_id: string;
  items: { id: string; name: string; qty: number; price: number; mrp: number; art?: ArtKind }[];
  amount: number; status: PurchaseStatus; note: string | null; created_at: string; updated_at: string;
}

/** Customers can buy it in the app right now. */
export const onSale = (l: DbTechListing) => l.selling && l.stock > 0;
