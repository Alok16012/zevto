import type { Metadata } from "next";
import LeadForm from "./LeadForm";

export const metadata: Metadata = {
  title: "Book RO service | Zavtoo Paani Filter",
  description: "RO repair, service, installation and AMC at your doorstep. Leave your number — we'll call you back in minutes.",
  robots: { index: false },
};

/** The one campaign form every ad links to (Facebook, Instagram, Google, YouTube, WhatsApp). */
export default function Page() {
  return <LeadForm />;
}
