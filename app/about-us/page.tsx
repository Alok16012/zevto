import type { Metadata } from "next";
import Storefront from "../storefront/Storefront";
export const metadata: Metadata = { title: "About us | Zavtoo Paani Filter", description: "20 years of delivering pure water to India — the story, mission and founder of Zavtoo Paani Filter Pvt Ltd." };
export default function Page() { return <Storefront view="about" />; }
