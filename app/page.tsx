import Storefront from "./storefront/Storefront";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zavtoo Paani Filter | RO Water Purifiers, Spare Parts & Service",
  description: "Your one-stop solution for RO water purifiers, 500+ genuine spare parts, repairs, installation and AMC plans across India. 20+ years, 50,000+ happy customers.",
};

export default function Page() {
  return <Storefront view="home" />;
}
