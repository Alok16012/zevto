import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BrandMark, Wordmark } from "../../components/Brand";
import { inr } from "../../lib/data";
import { COMPANY } from "../../storefront/content";
import PrintButton from "./PrintButton";

/* Public bill for a completed service job. The link carries a secret token
 * (service_requests.bill_token); without it the bill isn't readable. */

interface BillLine { name?: string; price?: number; qty: number; src?: string }
export interface Bill {
  ref: string; customer_name: string; customer_phone: string; address: string; type: string; product: string;
  visit_date: string; completed_at: string | null; price: number; discount: number; amount: number; coupon: string | null;
  parts: BillLine[]; payment: string | null; tds_before: string; tds_after: string; notes: string;
  tech_name: string | null; tech_code: string | null;
}

const UUID = /^[0-9a-f-]{36}$/i;

const getBill = cache(async (id: string, token: string): Promise<Bill | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !UUID.test(id) || !UUID.test(token)) return null;
  const res = await fetch(`${url}/rest/v1/rpc/public_bill`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ p_id: id, p_token: token }), cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as Bill | null;
});

export const metadata: Metadata = { title: "Service bill | Zavtoo", robots: { index: false } };

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function BillPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const bill = await getBill(id, t ?? "");
  if (!bill) notFound();

  const amc = bill.type === "AMC" && bill.price === 0;
  const parts = (bill.parts ?? []).filter((p) => p.qty > 0);
  const partsTotal = parts.reduce((s, p) => s + (p.price ?? 0) * p.qty, 0);
  const visit = bill.price - bill.discount;
  const row = (k: string, v: React.ReactNode, strong = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", fontSize: strong ? 16 : 13.5, fontWeight: strong ? 800 : 500, color: strong ? "var(--ink)" : "var(--ink-soft)", borderTop: strong ? "1px dashed var(--line-strong)" : "none" }}>
      <span>{k}</span><span style={{ color: "var(--ink)", fontWeight: strong ? 800 : 600, textAlign: "right" }}>{v}</span>
    </div>
  );
  const card: React.CSSProperties = { marginTop: 14, background: "var(--surface)", borderRadius: 18, boxShadow: "var(--shadow-card)", padding: 16 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", display: "flex", justifyContent: "center" }}>
      <main style={{ width: "100%", maxWidth: 560, padding: "16px 16px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}><BrandMark size={36} /><Wordmark /></Link>
          <PrintButton />
        </div>

        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-mute)" }}>SERVICE BILL</p>
              <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>#{bill.ref}</h1>
            </div>
            <div style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
              <div><b style={{ color: "var(--ink)" }}>{COMPANY.name}</b></div>
              <div>{COMPANY.phone} · {COMPANY.email}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 14, fontSize: 13, lineHeight: 1.55 }}>
            <div><div style={{ color: "var(--ink-mute)", fontSize: 11.5, fontWeight: 700 }}>BILLED TO</div><b>{bill.customer_name}</b><div style={{ color: "var(--ink-soft)" }}>{bill.customer_phone}</div><div style={{ color: "var(--ink-soft)", overflowWrap: "anywhere" }}>{bill.address}</div></div>
            <div><div style={{ color: "var(--ink-mute)", fontSize: 11.5, fontWeight: 700 }}>SERVICE</div><b>{bill.type}</b><div style={{ color: "var(--ink-soft)" }}>{bill.product}</div>
              <div style={{ color: "var(--ink-soft)" }}>Completed {fmt(bill.completed_at)}</div>{bill.tech_name && <div style={{ color: "var(--ink-soft)" }}>Technician: {bill.tech_name} ({bill.tech_code})</div>}</div>
          </div>
        </section>

        <section style={card}>
          <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>Charges</h2>
          {row("Visit charge", bill.price ? inr(bill.price) : "FREE")}
          {bill.discount > 0 && row(`Discount${bill.coupon ? ` (${bill.coupon})` : ""}`, `− ${inr(bill.discount)}`)}
          {parts.map((p, i) => row(`${p.name ?? "Part"} × ${p.qty}`, amc ? "Included in AMC" : inr((p.price ?? 0) * p.qty)))}
          {amc && visit === 0 && parts.length > 0 && row("AMC cover", "All parts included")}
          {row("Total paid", inr(bill.amount), true)}
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>Paid by {bill.payment ?? "—"}{!amc && partsTotal ? ` · parts ${inr(partsTotal)}` : ""}</p>
        </section>

        {(bill.tds_before || bill.tds_after || bill.notes) && (
          <section style={card}>
            <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>Service report</h2>
            {bill.tds_before && row("Input water TDS", `${bill.tds_before} ppm`)}
            {bill.tds_after && row("Output water TDS", `${bill.tds_after} ppm`)}
            {bill.notes && <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-soft)", whiteSpace: "pre-line" }}>{bill.notes}</p>}
          </section>
        )}

        <p style={{ margin: "16px 2px 0", fontSize: 12, lineHeight: 1.6, color: "var(--ink-mute)" }}>
          Repairs and maintenance carry a 90-day service warranty; spare parts and filters carry a 10-day warranty. Questions? WhatsApp {COMPANY.whatsapp}.
        </p>
      </main>
    </div>
  );
}
