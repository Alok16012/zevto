import type { Metadata } from "next";
import Storefront from "../storefront/Storefront";
export const metadata: Metadata = { title: "Contact us | Zavtoo Paani Filter", description: "Call, WhatsApp, email or visit Zavtoo Paani Filter at K-15, Raja Puri, Dwarka Road, New Delhi. Open 7 days a week." };
export default function Page() { return <Storefront view="contact" />; }
