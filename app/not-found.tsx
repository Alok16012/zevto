import Link from "next/link";
import { BrandMark } from "./components/Brand";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center", background: "linear-gradient(180deg,#eaf5f8,#fff)" }}>
      <BrandMark size={56} />
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: "0.2em", color: "#1479ab" }}>PAGE NOT FOUND</p>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: "#0b1f2c" }}>This page has run dry.</h1>
      <p style={{ margin: 0, maxWidth: 420, fontSize: 15, lineHeight: 1.6, color: "#41525c" }}>
        The page you&apos;re looking for doesn&apos;t exist or has moved. Find purifiers, spare parts and service from the homepage.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
        <Link href="/" style={{ background: "#1479ab", color: "#fff", padding: "12px 22px", borderRadius: 6, fontWeight: 600, textDecoration: "none" }}>Go to homepage</Link>
        <Link href="/contact-us" style={{ border: "1.5px solid #1479ab", color: "#1479ab", padding: "11px 22px", borderRadius: 6, fontWeight: 600, textDecoration: "none" }}>Contact us</Link>
      </div>
    </main>
  );
}
