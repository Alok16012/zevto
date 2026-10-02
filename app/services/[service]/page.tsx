import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICE_CATALOG } from "../../lib/data";
import Storefront from "../../storefront/Storefront";

const slug = (type: string) => type.toLowerCase().replaceAll(" ", "-");
export function generateStaticParams() {
  return SERVICE_CATALOG.map(service => ({ service: slug(service.type) }));
}
export async function generateMetadata({ params }: { params: Promise<{ service: string }> }): Promise<Metadata> {
  const { service } = await params;
  const selected = SERVICE_CATALOG.find(s => slug(s.type) === service);
  return { title: selected ? `Book ${selected.type} | Zavtoo` : "Service not found | Zavtoo", description: selected?.tagline };
}
export default async function Page({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  const offering = SERVICE_CATALOG.find(s => slug(s.type) === service);
  if (!offering) notFound();
  return <Storefront view="booking" service={offering} />;
}
