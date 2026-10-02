import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS, productById } from "../../lib/data";
import Storefront from "../../storefront/Storefront";
export function generateStaticParams() { return PRODUCTS.map(p => ({ id: p.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = productById((await params).id);
  return { title: p ? `${p.name} | Zavtoo` : "Product not found | Zavtoo", description: p?.description };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const product = productById((await params).id);
  if (!product) notFound();
  return <Storefront view="product" product={product} />;
}
