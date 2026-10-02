import Storefront from "../storefront/Storefront";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Shop water purifiers | Zavtoo" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const single = (v: string | string[] | undefined) => typeof v === "string" ? v : undefined;
  return <Storefront view="shop" filters={{ category: single(params.category), q: single(params.q), saved: single(params.saved) }} />;
}
