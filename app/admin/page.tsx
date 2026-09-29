import type { Metadata } from "next";
import AdminApp from "./AdminApp";

export const metadata: Metadata = {
  title: "Zavtoo Admin",
  description: "Zavtoo admin console — orders, service dispatch, customers, technicians, catalogue and offers.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminApp />;
}
