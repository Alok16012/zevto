import type { Metadata } from "next";
import ZavtooApp from "../ZavtooApp";

export const metadata: Metadata = {
  title: "Zavtoo Partner",
  description: "Zavtoo technician app — jobs, van inventory and earnings.",
};

export default function Page() {
  return <ZavtooApp initialRole="technician" />;
}
