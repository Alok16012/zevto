"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, PinIcon, StarIcon } from "../components/icons";
import { Avatar, BottomSheet, PageHeader, PrimaryButton, Toggle, card, sectionTitle } from "../components/ui";
import { ReviewCard } from "../components/Reviews";
import { inr, type Review, type Technician } from "../lib/data";
import { PARTS, PAYOUTS, PAYOUT, TODAY, WEEK_EARNINGS, jobPayout, type Job } from "../lib/techData";

const small: React.CSSProperties = { margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 };
const LOW_STOCK = 2;

/* ───────────────────────── Van inventory ───────────────────────── */

export function InventoryScreen({ stock, onRequest }: { stock: Record<string, number>; onRequest: (items: Record<string, number>) => void }) {
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
          <p style={{ ...small, fontSize: 12, margin: "10px 4px 14px" }}>Pick up from the Sector 63 warehouse after 6 PM. Demo: stock is added straight away.</p>
          <PrimaryButton disabled={!Object.values(req).some(Boolean)} onClick={() => { onRequest(req); setAsking(false); }}>Send Request</PrimaryButton>
        </BottomSheet>
      )}
    </div>
  );
}

const qtyBtn: React.CSSProperties = { width: 30, height: 30, border: "none", borderRadius: 9, background: "var(--blue-tint)", color: "var(--blue)", fontSize: 17, fontWeight: 700, cursor: "pointer" };

/* ───────────────────────── Earnings ───────────────────────── */

export function EarningsScreen({ jobs }: { jobs: Job[] }) {
  const doneToday = jobs.filter((j) => j.status === "Completed" && j.date === TODAY);
  const today = doneToday.reduce((s, j) => s + jobPayout(j), 0);
  const week = [...WEEK_EARNINGS, { day: "Today", amount: today, jobs: doneToday.length }];
  const weekTotal = week.reduce((s, d) => s + d.amount, 0);
  const max = Math.max(...week.map((d) => d.amount), 1);
  const cash = doneToday.filter((j) => j.payment === "Cash").reduce((s, j) => s + (j.amc ? 0 : j.visitCharge), 0);
  // Weekly incentive: ₹500 bonus for 35+ jobs in the last 7 days.
  const weekJobs = week.reduce((s, d) => s + d.jobs, 0);

  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="Earnings" />
      <div style={{ padding: "0 16px" }}>
        <div style={{ borderRadius: 22, padding: 18, color: "white", background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", boxShadow: "0 10px 28px rgba(11,92,255,0.28)" }}>
          <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}>Last 7 days · 23 – 29 Sep</p>
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

        <div style={{ ...card, padding: 14, marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
            <span>🎯 Weekly target bonus · ₹500</span><span style={{ color: "var(--blue)" }}>{Math.min(weekJobs, 35)}/35 jobs</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: "var(--line)", marginTop: 8 }}>
            <div style={{ width: `${Math.min(100, (weekJobs / 35) * 100)}%`, height: "100%", borderRadius: 4, background: "linear-gradient(90deg,var(--gold),var(--gold-dark))" }} />
          </div>
          <p style={{ ...small, fontSize: 11.5 }}>{weekJobs >= 35 ? "Bonus unlocked! It'll be added to Monday's payout." : `${35 - weekJobs} more jobs to unlock the bonus.`}</p>
        </div>

        <h3 style={sectionTitle}>Today&apos;s jobs</h3>
        <div style={{ ...card, padding: "4px 14px" }}>
          {doneToday.map((j, i) => (
            <div key={j.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{j.type} · {j.customer.name}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>#{j.id} · {j.payment}</p>
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
          {PAYOUTS.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckIcon s={13} c="var(--success-text)" /></span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{p.period}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>Paid to bank · {p.at}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{inr(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Partner profile ───────────────────────── */

export function PartnerProfileScreen({ tech, reviews, jobsDone, onLogout }: {
  tech: Technician; reviews: Review[]; jobsDone: number; onLogout: () => void;
}) {
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const [autoAccept, setAutoAccept] = useState(false);
  const mine = reviews.filter((r) => r.techId === tech.id);

  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="Partner Profile" />
      <div style={{ padding: "0 16px" }}>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar initials={tech.initials} size={62} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{tech.name}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>Partner ID ZT-{tech.id.toUpperCase()}-0142</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--success-text)", fontWeight: 600 }}>✓ KYC verified · background checked</p>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            {[[<><StarIcon key="s" s={14} /> {tech.rating}</>, "Rating"], [(tech.jobs + jobsDone).toLocaleString("en-IN"), "Jobs done"], [`${tech.years} yrs`, "Experience"]].map(([v, l], i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>{v}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        <h3 style={sectionTitle}>Service area</h3>
        <div style={{ ...card, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
          <PinIcon s={22} c="var(--blue)" />
          <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>Noida · Sectors 15 – 78</p><p style={small}>Up to 10 km from Sector 63 hub</p></div>
        </div>

        <h3 style={sectionTitle}>Availability</h3>
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
              const on = days.includes(d);
              return (
                <button key={d} onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])} aria-pressed={on} style={{
                  flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontSize: 11.5, fontWeight: 700, border: "none",
                  background: on ? "var(--blue)" : "var(--bg-secondary)", color: on ? "white" : "var(--ink-mute)",
                }}>{d.slice(0, 2)}</button>
              );
            })}
          </div>
          <p style={{ ...small, fontSize: 12 }}>Working hours 8:00 AM – 6:00 PM</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <div><p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>Auto-accept nearby jobs</p><p style={{ ...small, fontSize: 11.5 }}>Within 3 km, in your free slots</p></div>
            <Toggle on={autoAccept} onChange={setAutoAccept} label="Auto-accept nearby jobs" />
          </div>
        </div>

        <h3 style={sectionTitle}>Skills</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tech.skills.map((s) => <span key={s} style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", background: "var(--blue-tint)", padding: "6px 12px", borderRadius: 999 }}>{s}</span>)}
        </div>

        <h3 style={sectionTitle}>Documents</h3>
        <div style={{ ...card, padding: "4px 14px" }}>
          {[["Aadhaar card", "Verified"], ["Driving licence", "Verified"], ["Bank account ••4410", "Verified"], ["RO training certificate", "Expires Mar 2027"]].map(([d, s], i) => (
            <div key={d} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 13.5 }}>
              <span>{d}</span><span style={{ fontSize: 12, fontWeight: 600, color: "var(--success-text)" }}>{s}</span>
            </div>
          ))}
        </div>

        <h3 style={sectionTitle}>Customer reviews ({mine.length})</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mine.map((r) => <ReviewCard key={r.id} r={r} />)}
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
