"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COUPONS, PRODUCTS, SERVICE_CATALOG, TECHNICIANS, initialsOf, type Coupon, type Product, type ServiceOffering, type ServiceType, type Technician } from "./data";
import { PARTS, type Part } from "./techData";
import { supabaseFor, type AppKind } from "./supabase";

/* The catalogue lists in data.ts/techData.ts start with the built-in seed (so
 * server-rendered pages work). In the browser, the apps replace their contents
 * with live database rows here and keep them in sync. */

export interface DbTechnician {
  id: string; code: string; name: string; phone: string; email: string | null; dealer_id: string | null;
  pincodes: string[]; skills: string[]; languages: string; years: number; rating: number; jobs_done: number;
  kyc: "Pending" | "Verified"; active: boolean; status: "Online" | "Offline" | "On job"; photo_url: string | null; created_at: string;
}

export const toTechnician = (t: DbTechnician): Technician => ({
  id: t.id, code: t.code, name: t.name, initials: initialsOf(t.name), rating: Number(t.rating) || 0, jobs: t.jobs_done,
  years: t.years, skills: t.skills ?? [], languages: t.languages ?? "", phone: t.phone ?? "", pincodes: t.pincodes ?? [],
  dealerId: t.dealer_id ?? "", photoUrl: t.photo_url ?? undefined,
});

const swap = <T,>(list: T[], rows: T[]) => { list.splice(0, list.length, ...rows); };

async function loadCatalog(sb: SupabaseClient) {
  const [products, services, coupons, parts, techs] = await Promise.all([
    sb.from("products").select("*").order("sort"),
    sb.from("service_catalog").select("*").order("sort"),
    sb.from("coupons").select("*").order("created_at"),
    sb.from("parts").select("*").order("price"),
    sb.from("technicians").select("*").order("rating", { ascending: false }),
  ]);
  const err = products.error ?? services.error ?? coupons.error;
  if (err) throw err;

  swap<Product>(PRODUCTS, (products.data ?? []).map((p) => ({
    id: p.id, name: p.name, spec: p.spec, price: p.price, mrp: p.mrp, category: p.category, art: p.art,
    rating: Number(p.rating) || 0, reviews: p.reviews_count ?? 0, stages: p.stages, warranty: p.warranty, description: p.description,
    stock: p.stock, active: p.active,
  })));
  swap<ServiceOffering>(SERVICE_CATALOG, (services.data ?? []).map((s) => ({
    type: s.type as ServiceType, tagline: s.tagline, price: s.price, priceNote: s.price_note, duration: s.duration,
    includes: s.includes ?? [], rating: 0, bookings: "", active: s.active,
  })));
  swap<Coupon>(COUPONS, (coupons.data ?? []).map((c) => ({
    code: c.code, title: c.title, desc: c.descr, kind: c.kind, value: c.value, maxOff: c.max_off ?? undefined,
    minOrder: c.min_order, appliesTo: c.applies_to, expires: fmtDay(c.expires), active: c.active, used: c.used,
  })));
  // Parts and technicians need a login; logged-out visitors just don't get them.
  if (!parts.error) swap<Part>(PARTS, (parts.data ?? []).map((p) => ({ id: p.id, name: p.name, price: p.price })));
  if (!techs.error) swap<Technician>(TECHNICIANS, ((techs.data ?? []) as DbTechnician[]).map(toTechnician));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-31" → "31 Oct 2026". */
export const fmtDay = (iso: string | null | undefined) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
};

/**
 * Loads the live catalogue for an app and re-renders the app whenever products,
 * services, coupons or technicians change. `version` bumps on every refresh.
 * Pass the session's user id so technician visibility refreshes after login.
 */
export function useCatalog(app: AppKind, userId: string | null | undefined) {
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId === undefined) return; // session still loading
    const sb = supabaseFor(app);
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => loadCatalog(sb)
      .then(() => { if (alive) { setVersion((v) => v + 1); setError(null); } })
      .catch((e) => { if (alive) setError(e?.message ?? "Couldn't load the catalogue"); });
    run();
    const later = () => { clearTimeout(timer); timer = setTimeout(run, 300); };
    const ch = sb.channel(`catalog:${app}:${Math.random().toString(36).slice(2, 8)}`);
    ["products", "service_catalog", "coupons", "technicians"].forEach((table) =>
      ch.on("postgres_changes", { event: "*", schema: "public", table }, later));
    ch.subscribe();
    return () => { alive = false; clearTimeout(timer); sb.removeChannel(ch); };
  }, [app, userId]);

  return { ready: version > 0, version, error };
}
