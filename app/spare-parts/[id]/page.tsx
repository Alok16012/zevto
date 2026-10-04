import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BrandMark, Wordmark } from "../../components/Brand";
import { inr } from "../../lib/data";
import PartPhotos from "./PartPhotos";

/* Public page for a spare part a technician shared. Only approved parts are
 * readable without logging in (row-level security), so anything else 404s. */

interface SharedPart { id: string; name: string; price: number; specs: string; photos: string[] }

const getPart = cache(async (id: string): Promise<SharedPart | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const res = await fetch(`${url}/rest/v1/tech_parts?select=id,name,price,specs,photos&status=eq.Approved&id=eq.${id}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as SharedPart[];
  return rows[0] ?? null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getPart((await params).id);
  if (!p) return { title: "Spare part not found | Zavtoo" };
  const description = `${inr(p.price)}${p.specs ? ` · ${p.specs.replace(/\s+/g, " ").slice(0, 140)}` : ""}`;
  return { title: `${p.name} | Zavtoo`, description, openGraph: { title: p.name, description, images: p.photos.slice(0, 1) } };
}

export default async function SharedPartPage({ params }: { params: Promise<{ id: string }> }) {
  const part = await getPart((await params).id);
  if (!part) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", display: "flex", justifyContent: "center" }}>
      <main style={{ width: "100%", maxWidth: 520, padding: "16px 16px 32px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 16 }}>
          <BrandMark size={36} />
          <Wordmark />
        </Link>

        <PartPhotos photos={part.photos} name={part.name} />

        <span style={{ display: "inline-block", marginTop: 16, background: "var(--success)", color: "var(--success-text)", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
          ✓ Approved by Zavtoo
        </span>
        <h1 style={{ margin: "8px 0 2px", fontSize: 22, fontWeight: 800, color: "var(--ink)", overflowWrap: "anywhere" }}>{part.name}</h1>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--blue)" }}>{inr(part.price)}</p>

        {part.specs && (
          <section style={{ marginTop: 16, background: "var(--surface)", borderRadius: 18, boxShadow: "var(--shadow-card)", padding: 16 }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Specifications</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "var(--ink-soft)", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{part.specs}</p>
          </section>
        )}

        <p style={{ margin: "16px 2px", fontSize: 13, lineHeight: 1.6, color: "var(--ink-soft)" }}>
          Shared by your Zavtoo technician. Reply to them to order this part, or book a service visit and they&apos;ll bring it along.
        </p>
        <Link href="/app" style={{
          display: "block", textAlign: "center", textDecoration: "none", borderRadius: 16, padding: "15px 18px", fontSize: 15, fontWeight: 700,
          background: "linear-gradient(135deg,var(--blue),var(--blue-dark))", color: "white", boxShadow: "0 6px 16px rgba(11,92,255,0.30)",
        }}>Book a service visit</Link>
      </main>
    </div>
  );
}
