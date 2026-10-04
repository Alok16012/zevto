import Storefront from "../storefront/Storefront";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "RO Services, AMC Plans & Spare Parts | Zavtoo Paani Filter", description: "RO repair from ₹299, filter replacement, installation, deep cleaning, water testing and AMC plans from ₹999/year — any brand, pan India." };
export default function Page() { return <Storefront view="services" />; }
