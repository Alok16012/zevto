"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckIcon, StarIcon } from "../components/icons";
import { BottomSheet, PageHeader, PrimaryButton, card, sectionTitle } from "../components/ui";
import TechAvatar, { photoToDataUrl } from "../components/TechAvatar";
import { ServiceAreaEditor, ServiceAreaSummary } from "./ServiceArea";
import { ReviewCard } from "../components/Reviews";
import { inr, type Review, type Technician } from "../lib/data";
import { PARTS, PAYOUT, jobPayout, todayIso, type Job } from "../lib/techData";

export interface Payout { id: string; period: string; amount: number; status: "Pending" | "Paid"; paidAt: string | null }
export interface MyStockRequest { id: string; items: Record<string, number>; status: "Pending" | "Approved" | "Rejected"; at: string }

const small: React.CSSProperties = { margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 };
const LOW_STOCK = 2;

/* ───────────────────────── Van inventory ───────────────────────── */

export function InventoryScreen({ stock, requests, onRequest }: {
  stock: Record<string, number>; requests: MyStockRequest[]; onRequest: (items: Record<string, number>) => Promise<boolean>;
}) {
  const [asking, setAsking] = useState(false);
  const [req, setReq] = useState<Record<string, number>>({});
  const low = PARTS.filter((p) => (stock[p.id] ?? 0) <= LOW_STOCK);
  const value = PARTS.reduce((s, p) => s + p.price * (stock[p.id] ?? 0), 0);

  const openRequest = () => {
    // Pre-fill a top-up for everything running low.
    setReq(Object.fromEntries(low.map((p) => [p.id, Math.max(1, 5 - (stock[p.id] ?? 0))])));
    setAsking(true);
  };

  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="Van Inventory" />
      <div style={{ padding: "0 16px" }}>
        <div style={{ ...card, padding: "14px 16px", display: "flex" }}>
          {[[String(PARTS.reduce((s, p) => s + (stock[p.id] ?? 0), 0)), "Items in van"], [String(low.length), "Running low"], [inr(value), "Stock value"]].map(([v, l], i) => (
            <div key={l} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: i === 1 && low.length ? "var(--error-text)" : "var(--ink)" }}>{v}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>{l}</p>
            </div>
          ))}
        </div>

        <h3 style={sectionTitle}>Parts</h3>
        <div style={{ ...card, padding: "2px 14px" }}>
          {PARTS.map((p, i) => {
            const n = stock[p.id] ?? 0;
            const tone = n === 0 ? "var(--error-text)" : n <= LOW_STOCK ? "var(--warning-text)" : "var(--success-text)";
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>MRP {inr(p.price)}</p>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: tone, minWidth: 24, textAlign: "right" }}>{n}</span>
                {n <= LOW_STOCK && <span style={{ fontSize: 10, fontWeight: 700, color: tone }}>{n === 0 ? "OUT" : "LOW"}</span>}
              </div>
            );
          })}
        </div>
        <PrimaryButton onClick={openRequest} style={{ marginTop: 14 }}>Request stock from warehouse</PrimaryButton>
        {requests.length > 0 && (
          <>
            <h3 style={sectionTitle}>Your requests</h3>
            <div style={{ ...card, padding: "4px 14px" }}>
              {requests.slice(0, 10).map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{Object.entries(r.items).map(([id, n]) => `${PARTS.find((p) => p.id === id)?.name ?? id} × ${n}`).join(", ")}</p>
                    <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>{r.at}</p>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
                    background: r.status === "Approved" ? "var(--success)" : r.status === "Rejected" ? "var(--error)" : "var(--warning)",
                    color: r.status === "Approved" ? "var(--success-text)" : r.status === "Rejected" ? "var(--error-text)" : "var(--warning-text)" }}>{r.status}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <p style={{ ...small, textAlign: "center", fontSize: 11.5 }}>Parts used on a job are deducted when you close it.</p>
      </div>

      {asking && (
        <BottomSheet title="Request stock" onClose={() => setAsking(false)}>
          <div style={{ ...card, padding: "2px 14px" }}>
            {PARTS.map((p, i) => {
              const q = req[p.id] ?? 0;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{p.name}</span>
                  <button aria-label={`Less ${p.name}`} onClick={() => setReq({ ...req, [p.id]: Math.max(0, q - 1) })} style={qtyBtn}>−</button>
                  <span style={{ minWidth: 18, textAlign: "center", fontWeight: 700 }}>{q}</span>
                  <button aria-label={`More ${p.name}`} onClick={() => setReq({ ...req, [p.id]: Math.min(20, q + 1) })} style={qtyBtn}>+</button>
                </div>
              );
            })}
          </div>
          <p style={{ ...small, fontSize: 12, margin: "10px 4px 14px" }}>Ops reviews the request. Once approved, it&apos;s added to your van stock here.</p>
          <PrimaryButton disabled={!Object.values(req).some(Boolean)} onClick={async () => {
            const items = Object.fromEntries(Object.entries(req).filter(([, n]) => n > 0));
            if (await onRequest(items)) setAsking(false);
          }}>Send Request</PrimaryButton>
        </BottomSheet>
      )}
    </div>
  );
}

const qtyBtn: React.CSSProperties = { width: 30, height: 30, border: "none", borderRadius: 9, background: "var(--blue-tint)", color: "var(--blue)", fontSize: 17, fontWeight: 700, cursor: "pointer" };

/* ───────────────────────── Earnings ───────────────────────── */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function EarningsScreen({ jobs, payouts }: { jobs: Job[]; payouts: Payout[] }) {
  const done = jobs.filter((j) => j.status === "Completed" && j.completedIso);
  const dayOf = (j: Job) => localIso(new Date(j.completedIso!));
  const todayKey = todayIso();
  const doneToday = done.filter((j) => dayOf(j) === todayKey);
  const today = doneToday.reduce((s, j) => s + jobPayout(j), 0);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = localIso(d);
    const mine = done.filter((j) => dayOf(j) === key);
    return { day: i === 6 ? "Today" : DAY_NAMES[d.getDay()], amount: mine.reduce((s, j) => s + jobPayout(j), 0), jobs: mine.length };
  });
  const weekTotal = week.reduce((s, d) => s + d.amount, 0);
  const max = Math.max(...week.map((d) => d.amount), 1);
  const cash = doneToday.filter((j) => j.payment === "Cash").reduce((s, j) => s + (j.amc ? 0 : j.visitCharge), 0);
  const weekJobs = week.reduce((s, d) => s + d.jobs, 0);

  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="Earnings" />
      <div style={{ padding: "0 16px" }}>
        <div style={{ borderRadius: 22, padding: 18, color: "white", background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", boxShadow: "0 10px 28px rgba(11,92,255,0.28)" }}>
          <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}>Last 7 days</p>
          <p style={{ margin: "4px 0 14px", fontSize: 30, fontWeight: 800 }}>{inr(weekTotal)}</p>
          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
            {week.map((d) => (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                <div title={inr(d.amount)} style={{ width: "100%", height: `${Math.max(4, (d.amount / max) * 100)}%`, borderRadius: 6, background: d.day === "Today" ? "var(--gold)" : "rgba(255,255,255,0.35)" }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: d.day === "Today" ? 700 : 500 }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {[["Today", inr(today)], ["Jobs · 7 days", String(weekJobs)], ["Cash in hand", inr(cash)]].map(([l, v]) => (
            <div key={l} style={{ ...card, flex: 1, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 11, color: "var(--ink-soft)" }}>{l}</p>
              <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 800 }}>{v}</p>
            </div>
          ))}
        </div>


        <h3 style={sectionTitle}>Today&apos;s jobs</h3>
        <div style={{ ...card, padding: "4px 14px" }}>
          {doneToday.map((j, i) => (
            <div key={j.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{j.type} · {j.customer.name}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>#{j.ref} · {j.payment}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--success-text)" }}>+{inr(jobPayout(j))}</span>
            </div>
          ))}
          {doneToday.length === 0 && <p style={{ margin: 0, padding: "16px 0", textAlign: "center", fontSize: 13, color: "var(--ink-mute)" }}>No completed jobs yet today.</p>}
        </div>
        <p style={{ ...small, fontSize: 11.5, margin: "8px 4px 0" }}>
          You keep {PAYOUT.visitShare * 100}% of the visit charge (₹{PAYOUT.freeJobFee} for free installs &amp; AMC visits) plus {PAYOUT.partsCommission * 100}% on parts.
        </p>

        <h3 style={sectionTitle}>Weekly payouts</h3>
        <div style={{ ...card, padding: "4px 14px" }}>
          {payouts.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: p.status === "Paid" ? "var(--success)" : "var(--warning)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.status === "Paid" ? <CheckIcon s={13} c="var(--success-text)" /> : <span style={{ fontSize: 12, color: "var(--warning-text)" }}>…</span>}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{p.period}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>{p.status === "Paid" ? `Paid to bank · ${p.paidAt ?? ""}` : "Being processed"}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{inr(p.amount)}</span>
            </div>
          ))}
          {payouts.length === 0 && <p style={{ margin: 0, padding: "16px 0", textAlign: "center", fontSize: 13, color: "var(--ink-mute)" }}>No payouts yet. Zavtoo settles completed jobs weekly.</p>}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Partner profile ───────────────────────── */

export function PartnerProfileScreen({ tech, kyc, email, dealer, reviews, onLogout, onPhoto, onSavePincodes }: {
  tech: Technician; kyc: "Pending" | "Verified"; email: string; dealer: { name: string; code: string } | null; reviews: Review[];
  onLogout: () => void; onPhoto: (dataUrl: string | null) => Promise<boolean>; onSavePincodes: (pins: string[]) => Promise<boolean>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasPhoto = !!tech.photoUrl;
  const pins = tech.pincodes;
  const [editArea, setEditArea] = useState(false);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await photoToDataUrl(file);
      if (!(await onPhoto(url))) throw new Error("Couldn't upload the photo");
      setPhotoErr(null);
    } catch (e) {
      setPhotoErr(e instanceof Error ? e.message : "Couldn't use that photo");
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };
  const removePhoto = () => { void onPhoto(null); };
  const mine = reviews.filter((r) => r.techId === tech.id);

  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="Partner Profile" />
      <div style={{ padding: "0 16px" }}>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <TechAvatar id={tech.id} name={tech.name} size={72} ring photoUrl={tech.photoUrl ?? null} />
              <button onClick={() => fileRef.current?.click()} aria-label="Change photo" className="press" style={{
                position: "absolute", right: -4, bottom: -2, width: 28, height: 28, borderRadius: "50%", border: "2px solid white", cursor: "pointer",
                background: "var(--blue)", color: "white", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
              }}>📷</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{tech.name}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>Technician ID <b style={{ color: "var(--ink)", letterSpacing: "0.03em" }}>{tech.code}</b></p>
              {dealer && <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>Dealer: {dealer.name} · {dealer.code}</p>}
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)", overflowWrap: "anywhere" }}>{email}</p>
              {kyc === "Verified"
                ? <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--success-text)", fontWeight: 600 }}>✓ KYC verified</p>
                : <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--warning-text)", fontWeight: 600 }}>KYC pending — Zavtoo will verify your documents</p>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
            <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--blue)", fontSize: 12.5, fontWeight: 600 }}>
              {busy ? "Uploading…" : hasPhoto ? "Change photo" : "Add your photo"}
            </button>
            {hasPhoto && <button onClick={removePhoto} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--red)", fontSize: 12.5, fontWeight: 600 }}>Remove</button>}
            <span style={{ fontSize: 11, color: "var(--ink-mute)" }}>{hasPhoto ? "Shown to customers" : "Customers see this before you arrive"}</span>
          </div>
          {photoErr && <p role="alert" style={{ margin: "6px 0 0", fontSize: 12, color: "var(--error-text)", fontWeight: 600 }}>{photoErr}</p>}
          <div style={{ display: "flex", marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            {[[<><StarIcon key="s" s={14} /> {tech.rating || "New"}</>, "Rating"], [tech.jobs.toLocaleString("en-IN"), "Jobs done"], [`${tech.years} yrs`, "Experience"]].map(([v, l], i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>{v}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        <h3 style={sectionTitle}>Service area</h3>
        {editArea ? (
          <div style={{ ...card, padding: 14 }}>
            <ServiceAreaEditor initial={pins} onSave={async (p) => { if (await onSavePincodes(p)) setEditArea(false); }} />
          </div>
        ) : <ServiceAreaSummary pins={pins} onEdit={() => setEditArea(true)} />}


        <h3 style={sectionTitle}>Skills</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tech.skills.map((s) => <span key={s} style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", background: "var(--blue-tint)", padding: "6px 12px", borderRadius: 999 }}>{s}</span>)}
        </div>


        <h3 style={sectionTitle}>Customer reviews ({mine.length})</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mine.map((r) => <ReviewCard key={r.id} r={r} />)}
          {mine.length === 0 && <p style={{ ...card, margin: 0, padding: 16, textAlign: "center", color: "var(--ink-soft)", fontSize: 13 }}>Reviews from your customers will show up here.</p>}
        </div>

        <div style={{ marginTop: 22 }}>
          <button onClick={onLogout} className="press" style={{ width: "100%", background: "var(--surface)", color: "var(--red)", border: "none", borderRadius: 16, padding: 15, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Log Out</button>
          <p style={{ textAlign: "center", fontSize: 12, marginTop: 14 }}>
            <Link href="/" style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>Open customer app →</Link>
          </p>
          <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-disabled)", marginTop: 6 }}>Zavtoo Partner v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
