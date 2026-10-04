import type { Metadata } from "next";
import Storefront from "../storefront/Storefront";
export const metadata: Metadata = { title: "Terms & Conditions | Zavtoo Paani Filter", description: "Terms and conditions for using Zavtoo Paani Filter services, orders, delivery, returns and warranty." };
export default function Page() { return <Storefront view="terms" />; }
