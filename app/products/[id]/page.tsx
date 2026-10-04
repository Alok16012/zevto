import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PRODUCTS, productById, type Product } from "../../lib/data";
import Storefront from "../../storefront/Storefront";

export function generateStaticParams() { return PRODUCTS.map(p => ({ id: p.id })); }

/** Built-in catalogue first; products added later in the admin console come from the database. */
const findProduct = cache(async (id: string): Promise<Product | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && /^[a-z0-9-]{1,60}$/.test(id)) {
    try {
      const res = await fetch(`${url}/rest/v1/products?select=*&id=eq.${id}&active=eq.true`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
      });
      const [p] = res.ok ? await res.json() : [];
      if (p) return {
        id: p.id, name: p.name, spec: p.spec, price: p.price, mrp: p.mrp, category: p.category, art: p.art,
        rating: Number(p.rating) || 0, reviews: p.reviews_count ?? 0, stages: p.stages, warranty: p.warranty, description: p.description,
        stock: p.stock, active: p.active, images: p.images ?? [],
      };
    } catch { /* fall back to the built-in catalogue */ }
  }
  return productById(id) ?? null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await findProduct((await params).id);
  return {
    title: p ? `${p.name} | Zavtoo Paani Filter` : "Product not found | Zavtoo Paani Filter",
    description: p?.description,
    openGraph: p?.images?.length ? { images: p.images.slice(0, 1) } : undefined,
  };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const product = await findProduct((await params).id);
  if (!product) notFound();
  return <Storefront view="product" product={product} />;
}
