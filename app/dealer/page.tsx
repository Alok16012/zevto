import type { Metadata } from "next";
import DealerApp from "./DealerApp";

export const metadata: Metadata = {
  title: "Zavtoo Dealer",
  description: "List your RO purifiers and spares on Zavtoo, fulfil local orders and run service jobs.",
};

export default function Page() {
  return <DealerApp />;
}
