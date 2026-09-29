import type { Metadata } from "next";
import TechnicianApp from "./TechnicianApp";

export const metadata: Metadata = {
  title: "Zavtoo Partner",
  description: "Zavtoo technician app — jobs, van inventory and earnings.",
};

export default function Page() {
  return <TechnicianApp />;
}
