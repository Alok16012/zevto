import type { Metadata } from "next";
import Storefront from "../storefront/Storefront";
export const metadata: Metadata = { title: "Contact us | Zavtoo Paani Filter", description: "Zavtoo Paani Filter customer care (call & WhatsApp): 8929 45 46 47. Office: 808B, DLF Prime Tower, Pocket F, Okhla Phase I, Okhla Industrial Estate, New Delhi, Delhi 110020. Open 7 days a week." };
export default function Page() { return <Storefront view="contact" />; }
