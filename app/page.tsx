import Storefront from "./storefront/Storefront";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zavtoo | Pure water. A better everyday.",
  description: "Explore Zavtoo home and commercial RO water purifiers, genuine replacement filters, installation, repairs and AMC plans.",
};

export default function Page() {
  return <Storefront view="home" />;
}
