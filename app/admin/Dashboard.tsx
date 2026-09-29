"use client";

import { inr } from "../lib/data";
import { REVENUE_14D, TODAY, type AdminCustomer, type AdminJob, type AdminOrder, type AdminProduct, type AdminReview, type AdminTech } from "../lib/adminData";
import { Badge, Btn, Panel, Stat, Table, muted } from "./kit";
import { ORDER_TONE, JOB_TONE, customerName } from "./Operations";
import type { Section } from "./AdminApp";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function Dashboard({ orders, jobs, customers, techs, products, reviews, go }: {
  orders: AdminOrder[]; jobs: AdminJob[]; customers: AdminCustomer[]; techs: AdminTech[];
  products: AdminProduct[]; reviews: AdminReview[]; go: (s: Section) => void;
}) {
  const todayOrders = orders.filter((o) => o.date === TODAY && o.status !== "Cancelled");
  const todayJobsDone = jobs.filter((j) => j.date === TODAY && j.status === "Completed");
  const revenueToday = todayOrders.reduce((s, o) => s + o.amount, 0) + todayJobsDone.reduce((s, j) => s + j.amount, 0);
  const open = jobs.filter((j) => ["Unassigned", "Assigned", "In Progress"].includes(j.status));
  const unassigned = jobs.filter((j) => j.status === "Unassigned");
  const rescheduled = jobs.filter((j) => j.status === "Rescheduled");
  const flagged = reviews.filter((r) => r.status === "Flagged");
  const lowStock = products.filter((p) => p.active && p.stock <= 5);
  const pendingKyc = techs.filter((t) => t.kyc === "Pending");
  const rated = jobs.filter((j) => j.rating);
  const avgRating = rated.length ? rated.reduce((s, j) => s + (j.rating ?? 0), 0) / rated.length : 0;

  // Today's bar is live; earlier days come from reporting.
  const series = REVENUE_14D.map((d, i) => (i === REVENUE_14D.length - 1 ? { ...d, v: revenueToday } : d));
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
        <Stat label="Service rating" value={`${avgRating.toFixed(1)} ★`} sub={`${plural(rated.length, "rated job")} · ${techs.filter((t) => t.status !== "Offline").length} techs online`} tone="amber" />
      </div>

      <div className="admin-grid-2">
        <Panel title="Revenue · last 14 days" actions={<span style={{ fontSize: 13, fontWeight: 700 }}>{inr(total14)}</span>}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 180 }}>
            {series.map((d, i) => {
              const today = i === series.length - 1;
              return (
                <div key={d.d} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                  <div title={`${d.d} Sep · ${inr(d.v)}`} style={{ width: "100%", height: `${Math.max(3, (d.v / max) * 100)}%`, borderRadius: 5, background: today ? "var(--gold)" : "var(--blue)", opacity: today ? 1 : 0.8 }} />
                  <span style={{ fontSize: 10, color: today ? "var(--ink)" : "var(--ink-mute)", fontWeight: today ? 700 : 500 }}>{d.d}</span>
                </div>
              );
            })}
          </div>
          <p style={{ ...muted, margin: "10px 0 0" }}>Product orders + completed service jobs, Sep 2026. Today (gold) updates live.</p>
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

      <div className="admin-grid-2">
        <Panel title="Latest orders" actions={<Btn kind="ghost" small onClick={() => go("orders")}>View all</Btn>} pad={false}>
          <Table rows={orders.slice(0, 6)} rowKey={(o) => o.id} cols={[
            { key: "id", head: "Order", render: (o) => <b>#{o.id}</b> },
            { key: "c", head: "Customer", render: (o) => customerName(customers, o.customerId) },
            { key: "i", head: "Items", render: (o) => <span style={muted}>{o.items}</span> },
            { key: "a", head: "Amount", align: "right", render: (o) => inr(o.amount) },
            { key: "s", head: "Status", render: (o) => <Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge> },
          ]} />
        </Panel>
        <Panel title="Service jobs today" actions={<Btn kind="ghost" small onClick={() => go("services")}>Dispatch</Btn>}>
          {(["Unassigned", "Assigned", "In Progress", "Completed", "Rescheduled"] as const).map((s) => {
            const n = jobs.filter((j) => j.status === s && (j.date === TODAY || s === "Unassigned")).length;
            const all = jobs.filter((j) => j.date === TODAY || j.status === "Unassigned").length || 1;
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
