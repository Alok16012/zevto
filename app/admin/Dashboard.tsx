"use client";

import { useState } from "react";
import { inr } from "../lib/data";
import { type AdminCustomer, type AdminJob, type AdminOrder, type AdminProduct, type AdminReview, type AdminTech } from "../lib/adminData";
import { Badge, Btn, Panel, Stat, Table, muted } from "./kit";
import { ORDER_TONE, JOB_TONE, customerName, isoDay } from "./Operations";
import type { Section } from "./AdminApp";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function Dashboard({ orders, jobs, customers, techs, products, reviews, go }: {
  orders: AdminOrder[]; jobs: AdminJob[]; customers: AdminCustomer[]; techs: AdminTech[];
  products: AdminProduct[]; reviews: AdminReview[]; go: (s: Section) => void;
}) {
  const TODAY = isoDay();
  // Revenue per local day: product orders (not cancelled) + completed service jobs.
  const revenueOn = (day: string) =>
    orders.filter((o) => o.day === day && o.status !== "Cancelled").reduce((s, o) => s + o.amount, 0)
    + jobs.filter((j) => j.completedDay === day && j.status === "Completed").reduce((s, j) => s + j.amount, 0);
  const todayOrders = orders.filter((o) => o.day === TODAY && o.status !== "Cancelled");
  const todayJobsDone = jobs.filter((j) => j.completedDay === TODAY && j.status === "Completed");
  const revenueToday = revenueOn(TODAY);
  const open = jobs.filter((j) => ["Unassigned", "Awaiting tech", "Assigned", "On the way", "Arrived", "In Progress"].includes(j.status));
  const unassigned = jobs.filter((j) => j.status === "Unassigned" || j.status === "Awaiting tech");
  const rescheduled = jobs.filter((j) => j.status === "Rescheduled");
  const flagged = reviews.filter((r) => r.status === "Flagged");
  const lowStock = products.filter((p) => p.active && p.stock != null && p.stock <= 5);
  const pendingKyc = techs.filter((t) => t.kyc === "Pending");
  const rated = jobs.filter((j) => j.rating);
  const avgRating = rated.length ? rated.reduce((s, j) => s + (j.rating ?? 0), 0) / rated.length : 0;

  const series = Array.from({ length: 14 }, (_, i) => {
    const day = isoDay(i - 13);
    return { day, d: day.slice(8), v: revenueOn(day) };
  });
  const max = Math.max(...series.map((d) => d.v), 1);
  const total14 = series.reduce((s, d) => s + d.v, 0);

  const attention: { label: string; count: number; tone: "red" | "amber" | "purple"; to: Section }[] = [
    { label: "Service requests waiting for a technician", count: unassigned.length, tone: "red", to: "services" },
    { label: "Rescheduled jobs to re-book", count: rescheduled.length, tone: "amber", to: "services" },
    { label: "Orders to ship", count: orders.filter((o) => o.status === "Placed").length, tone: "amber", to: "orders" },
    { label: "Flagged reviews to moderate", count: flagged.length, tone: "purple", to: "reviews" },
    { label: "Products low on stock", count: lowStock.length, tone: "amber", to: "products" },
    { label: "Technician KYC pending", count: pendingKyc.length, tone: "purple", to: "technicians" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="admin-grid-4">
        <Stat label="Revenue today" value={inr(revenueToday)} sub={`${plural(todayOrders.length, "order")} · ${plural(todayJobsDone.length, "job")} closed`} tone="green" />
        <Stat label="Open service jobs" value={String(open.length)} sub={`${unassigned.length} unassigned`} tone={unassigned.length ? "red" : "blue"} />
        <Stat label="Customers" value={String(customers.filter((c) => !c.blocked).length)} sub={`${customers.filter((c) => c.amc !== "None").length} with AMC`} tone="purple" />
        <Stat label="Service rating" value={rated.length ? `${avgRating.toFixed(1)} ★` : "—"} sub={`${plural(rated.length, "rated job")} · ${techs.filter((t) => t.status !== "Offline").length} techs online`} tone="amber" />
      </div>

      <div className="admin-grid-2">
        <Panel title="Revenue · last 14 days" actions={<span style={{ fontSize: 13, fontWeight: 700 }}>{inr(total14)}</span>}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 180 }}>
            {series.map((d, i) => {
              const today = i === series.length - 1;
              return (
                <div key={d.day} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                  <div title={`${d.day} · ${inr(d.v)}`} style={{ width: "100%", height: `${Math.max(3, (d.v / max) * 100)}%`, borderRadius: 5, background: today ? "var(--gold)" : "var(--blue)", opacity: today ? 1 : 0.8 }} />
                  <span style={{ fontSize: 10, color: today ? "var(--ink)" : "var(--ink-mute)", fontWeight: today ? 700 : 500 }}>{d.d}</span>
                </div>
              );
            })}
          </div>
          <p style={{ ...muted, margin: "10px 0 0" }}>Product orders (excluding cancelled) + completed service jobs. Today in gold, updating live.</p>
        </Panel>

        <Panel title="Needs attention">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {attention.map((a) => (
              <button key={a.label} onClick={() => go(a.to)} className="admin-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
                <Badge tone={a.count ? a.tone : "grey"}>{a.count}</Badge>
                <span style={{ flex: 1, fontSize: 13, color: a.count ? "var(--ink)" : "var(--ink-mute)" }}>{a.label}</span>
                <span style={{ color: "var(--ink-mute)" }}>›</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <AmcVsProducts orders={orders} jobs={jobs} />

      <div className="admin-grid-2">
        <Panel title="Latest orders" actions={<Btn kind="ghost" small onClick={() => go("orders")}>View all</Btn>} pad={false}>
          <Table rows={orders.slice(0, 6)} rowKey={(o) => o.id} cols={[
            { key: "id", head: "Order", render: (o) => <b>#{o.ref}</b> },
            { key: "c", head: "Customer", render: (o) => customerName(customers, o.customerId) },
            { key: "i", head: "Items", render: (o) => <span style={muted}>{o.items}</span> },
            { key: "a", head: "Amount", align: "right", render: (o) => inr(o.amount) },
            { key: "s", head: "Status", render: (o) => <Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge> },
          ]} />
        </Panel>
        <Panel title="Service jobs today" actions={<Btn kind="ghost" small onClick={() => go("services")}>Dispatch</Btn>}>
          {(["Unassigned", "Assigned", "In Progress", "Completed", "Rescheduled"] as const).map((s) => {
            const n = jobs.filter((j) => j.status === s && (j.isoDate === TODAY || s === "Unassigned")).length;
            const all = jobs.filter((j) => j.isoDate === TODAY || j.status === "Unassigned").length || 1;
            return (
              <div key={s} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <Badge tone={JOB_TONE[s]}>{s}</Badge><b>{n}</b>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--line)" }}>
                  <div style={{ width: `${(n / all) * 100}%`, height: "100%", borderRadius: 3, background: "var(--blue)" }} />
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}

/* ───────── AMC vs product sales, month by month ───────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SERIES = [
  { key: "amc", label: "AMC plans", color: "var(--blue)" },
  { key: "products", label: "Product sales", color: "var(--gold)" },
] as const;

function AmcVsProducts({ orders, jobs }: { orders: AdminOrder[]; jobs: AdminJob[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const amcJobs = jobs.filter((j) => j.type === "AMC" && j.status === "Completed" && j.completedDay?.startsWith(key));
    const sold = orders.filter((o) => o.status !== "Cancelled" && o.day.startsWith(key));
    return {
      key, label: MONTHS[d.getMonth()],
      amc: amcJobs.reduce((s, j) => s + j.amount, 0), amcCount: amcJobs.length,
      products: sold.reduce((s, o) => s + o.amount, 0), productsCount: sold.length,
    };
  });
  const max = Math.max(1, ...months.flatMap((m) => [m.amc, m.products]));
  const totals = { amc: months.reduce((s, m) => s + m.amc, 0), products: months.reduce((s, m) => s + m.products, 0) };
  const share = totals.amc + totals.products ? Math.round((totals.amc / (totals.amc + totals.products)) * 100) : 0;

  return (
    <Panel title="AMC vs product sales · last 6 months" actions={
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {SERIES.map((s) => (
          <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />{s.label} <b style={{ color: "var(--ink)" }}>{inr(totals[s.key])}</b>
          </span>
        ))}
      </div>
    }>
      <div role="img" aria-label={`AMC ${inr(totals.amc)} vs products ${inr(totals.products)} over 6 months`} style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 200, borderBottom: "1px solid var(--line)" }}>
        {months.map((m) => (
          <div key={m.key} onMouseEnter={() => setHover(m.key)} onMouseLeave={() => setHover(null)} style={{ flex: 1, height: "100%", position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, cursor: "default" }}>
            {SERIES.map((s) => (
              <div key={s.key} style={{ width: "34%", maxWidth: 28, height: `${Math.max(1.5, (m[s.key] / max) * 100)}%`, background: s.color, borderRadius: "4px 4px 0 0", opacity: hover && hover !== m.key ? 0.45 : 1 }} />
            ))}
            {hover === m.key && (
              <div style={{ position: "absolute", bottom: "calc(100% - 40px)", left: "50%", transform: "translateX(-50%)", zIndex: 2, background: "var(--ink)", color: "white", borderRadius: 10, padding: "8px 10px", fontSize: 12, whiteSpace: "nowrap", boxShadow: "var(--shadow-xl)", pointerEvents: "none" }}>
                <b>{m.label}</b>
                <div>AMC: {inr(m.amc)} · {m.amcCount} plan{m.amcCount === 1 ? "" : "s"}</div>
                <div>Products: {inr(m.products)} · {m.productsCount} order{m.productsCount === 1 ? "" : "s"}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {months.map((m) => <span key={m.key} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--ink-mute)", marginTop: 6 }}>{m.label}</span>)}
      </div>
      <p style={{ ...muted, margin: "10px 0 0" }}>AMC = completed AMC jobs; products = orders that weren&apos;t cancelled. AMC is {share}% of the two combined.</p>
    </Panel>
  );
}
