import type { Metadata } from "next";
import Storefront from "../storefront/Storefront";
export const metadata: Metadata = { title: "Privacy Policy | Zavtoo Paani Filter", description: "How Zavtoo Paani Filter Pvt Ltd collects, uses and protects your personal information." };
export default function Page() { return <Storefront view="privacy" />; }
