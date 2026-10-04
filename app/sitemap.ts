import type { MetadataRoute } from "next";
import { PRODUCTS, SERVICE_CATALOG } from "./lib/data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const slug = (type: string) => type.toLowerCase().replaceAll(" ", "-");

/** Listed products, including ones added in the admin console (falls back to the built-in list). */
async function productIds(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    const res = await fetch(`${url}/rest/v1/products?select=id&active=eq.true`, { headers: { apikey: key!, Authorization: `Bearer ${key}` }, cache: "no-store" });
    const rows: { id: string }[] = res.ok ? await res.json() : [];
    if (rows.length) return rows.map((r) => r.id);
  } catch { /* use the built-in list */ }
  return PRODUCTS.map((p) => p.id);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/shop", "/services", "/about-us", "/contact-us", "/privacy-policy", "/terms-and-condition"];
  return [
    ...pages.map((p) => ({ url: `${SITE}${p}`, changeFrequency: "weekly" as const, priority: p ? 0.8 : 1 })),
    ...(await productIds()).map((id) => ({ url: `${SITE}/products/${id}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...SERVICE_CATALOG.map((s) => ({ url: `${SITE}/services/${slug(s.type)}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
