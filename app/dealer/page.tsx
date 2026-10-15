import type { Metadata } from "next";
import ZavtooApp from "../ZavtooApp";

export const metadata: Metadata = {
  title: "Zavtoo Dealer",
  description: "List your RO purifiers and spares on Zavtoo, fulfil local orders and run service jobs.",
};

export default function Page() {
  return <ZavtooApp initialRole="dealer" />;
}
