import Storefront from "../storefront/Storefront";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Service & AMC | Zavtoo" };
export default function Page() { return <Storefront view="services" />; }
