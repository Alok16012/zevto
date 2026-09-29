"use client";

import { useState } from "react";
import { CheckIcon, ChevronRight, CopyIcon, TagIcon } from "./icons";
import { BottomSheet, PageHeader, Tabs, card, field } from "./ui";
import { COUPONS, couponByCode, couponDiscount, couponError, inr, type Coupon } from "../lib/data";

/* ───────────────────────── Offers page ───────────────────────── */

type OfferTab = "all" | "product" | "service";

export function OffersPage({ onBack, onShop, onBook }: { onBack: () => void; onShop: () => void; onBook: () => void }) {
  const [tab, setTab] = useState<OfferTab>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const rows = COUPONS.filter((c) => tab === "all" || c.appliesTo === tab || c.appliesTo === "all");

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); } catch { /* clipboard blocked — the code is on screen anyway */ }
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
  };

  return (
    <div>
      <PageHeader title="Offers & Coupons" onBack={onBack} />
      <div style={{ padding: "0 16px 24px" }}>
        <div style={{
          borderRadius: 20, padding: "16px 18px", marginBottom: 14, color: "white", position: "relative", overflow: "hidden",
          background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", boxShadow: "0 10px 28px rgba(11,92,255,0.28)",
        }}>
          <div style={{ position: "absolute", right: -40, top: -50, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,0.35), transparent 70%)" }} />
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>Festive season</p>
          <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800 }}>Save up to <span style={{ color: "var(--gold)" }}>₹2,000</span></p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}>Apply a code at checkout or while booking a service.</p>
        </div>

        <Tabs<OfferTab> value={tab} onChange={setTab} tabs={[{ id: "all", label: "All" }, { id: "product", label: "Products" }, { id: "service", label: "Services" }]} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          {rows.map((c) => (
            <CouponCard key={c.code} c={c} action={
              <button onClick={() => copy(c.code)} className="press" style={pillBtn(copied === c.code)}>
                {copied === c.code ? <><CheckIcon s={13} c="var(--success-text)" /> Copied</> : <><CopyIcon s={13} c="var(--blue)" /> Copy</>}
              </button>
            } />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={onShop} className="press" style={{ ...card, ...linkCard }}>Shop products <ChevronRight s={14} c="var(--blue)" /></button>
          <button onClick={onBook} className="press" style={{ ...card, ...linkCard }}>Book a service <ChevronRight s={14} c="var(--blue)" /></button>
        </div>
      </div>
    </div>
  );
}

const linkCard: React.CSSProperties = {
  flex: 1, border: "none", padding: 14, cursor: "pointer", color: "var(--blue)", fontSize: 13, fontWeight: 600,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
};

const pillBtn = (done: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 5, border: "none", cursor: "pointer", borderRadius: 999,
  padding: "7px 12px", fontSize: 12, fontWeight: 700, flexShrink: 0,
  background: done ? "var(--success)" : "var(--blue-tint)", color: done ? "var(--success-text)" : "var(--blue)",
});

function CouponCard({ c, action, note, dim }: { c: Coupon; action: React.ReactNode; note?: string | null; dim?: boolean }) {
  return (
    <div style={{ ...card, display: "flex", overflow: "hidden", opacity: dim ? 0.6 : 1 }}>
      {/* Ticket stub */}
      <div style={{
        width: 58, flexShrink: 0, background: "linear-gradient(180deg,var(--gold),var(--gold-dark))",
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: "var(--blue-dark)", fontSize: 13, fontWeight: 800, letterSpacing: "0.04em" }}>
          {c.kind === "flat" ? `₹${c.value} OFF` : `${c.value}% OFF`}
        </span>
        <span style={{ position: "absolute", right: -7, top: "50%", width: 14, height: 14, marginTop: -7, borderRadius: "50%", background: "var(--app-bg)" }} />
      </div>
      <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)", letterSpacing: "0.04em", border: "1.5px dashed var(--line-strong)", borderRadius: 8, padding: "2px 8px" }}>{c.code}</span>
          {action}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{c.title}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>{c.desc}</p>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: dim ? "var(--error-text)" : note ? "var(--success-text)" : "var(--ink-mute)", fontWeight: note ? 600 : 400 }}>
          {note ?? `Min. ${inr(c.minOrder)} · valid till ${c.expires}`}
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── Apply-coupon row + picker ───────────────────────── */

/** Coupon line for the cart / service booking — opens a picker sheet. */
export function CouponApply({ amount, on, applied, onApply }: {
  amount: number; on: "product" | "service"; applied: string | null; onApply: (code: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const hit = applied ? couponByCode(applied) : undefined;
  const off = hit ? couponDiscount(hit, amount) : 0;

  const tryApply = (raw: string) => {
    const c = couponByCode(raw);
    if (!c) { setErr("That code doesn't exist"); return; }
    const why = couponError(c, amount, on);
    if (why) { setErr(why); return; }
    onApply(c.code); setOpen(false); setErr(null); setCode("");
  };

  return (
    <>
      {hit ? (
        <div style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12, border: "1.5px solid var(--success-border)" }}>
          <TagIcon s={22} c="var(--success-text)" />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{hit.code} applied</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--success-text)", fontWeight: 600 }}>You save {inr(off)}</p>
          </div>
          <button onClick={() => onApply(null)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>REMOVE</button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="press" style={{ ...card, width: "100%", border: "none", padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
          <TagIcon s={22} c="var(--blue)" />
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Apply coupon</span>
          <ChevronRight s={16} c="var(--ink-mute)" />
        </button>
      )}

      {open && (
        <BottomSheet title="Apply coupon" onClose={() => { setOpen(false); setErr(null); }}>
          <form onSubmit={(e) => { e.preventDefault(); tryApply(code); }} style={{ display: "flex", gap: 8 }}>
            <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(null); }} placeholder="Enter coupon code"
              aria-label="Coupon code" style={{ ...field, flex: 1, textTransform: "uppercase", letterSpacing: "0.04em" }} />
            <button type="submit" disabled={!code.trim()} style={{
              border: "none", borderRadius: 14, padding: "0 18px", fontSize: 14, fontWeight: 700, cursor: code.trim() ? "pointer" : "not-allowed",
              background: code.trim() ? "var(--blue)" : "var(--line-strong)", color: code.trim() ? "white" : "var(--ink-mute)",
            }}>Apply</button>
          </form>
          {err && <p role="alert" style={{ margin: "8px 2px 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
          <p style={{ margin: "16px 2px 10px", fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>Available for this {on === "product" ? "order" : "booking"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {COUPONS.filter((c) => c.appliesTo === on || c.appliesTo === "all").map((c) => {
              const why = couponError(c, amount, on);
              return (
                <CouponCard key={c.code} c={c} dim={!!why}
                  note={why ?? `You save ${inr(couponDiscount(c, amount))}`}
                  action={<button disabled={!!why} onClick={() => tryApply(c.code)} style={{ ...pillBtn(false), cursor: why ? "not-allowed" : "pointer" }}>Apply</button>} />
              );
            })}
          </div>
        </BottomSheet>
      )}
    </>
  );
}
