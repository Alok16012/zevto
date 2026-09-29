"use client";

import { useMemo, useState } from "react";
import { StarIcon } from "../components/icons";
import { SERVICE_CATALOG, inr } from "../lib/data";
import {
  ORDER_FLOW, TODAY,
  type AdminCustomer, type AdminJob, type AdminJobStatus, type AdminOrder, type AdminOrderStatus, type AdminTech,
} from "../lib/adminData";
import { Badge, Btn, Filter, Initials, Modal, Panel, SearchBox, Table, muted, type Tone } from "./kit";

export const ORDER_TONE: Record<AdminOrderStatus, Tone> = { Placed: "purple", Shipped: "amber", Delivered: "green", Cancelled: "grey" };
export const JOB_TONE: Record<AdminJobStatus, Tone> = {
  Unassigned: "red", Assigned: "purple", "In Progress": "blue", Completed: "green", Rescheduled: "amber", Cancelled: "grey",
};

export const customerName = (all: AdminCustomer[], id: string) => all.find((c) => c.id === id)?.name ?? id;

/* ───────────────────────── Orders ───────────────────────── */

type OrderFilter = "All" | AdminOrderStatus;

export function OrdersSection({ orders, customers, onUpdate, notify }: {
  orders: AdminOrder[]; customers: AdminCustomer[]; onUpdate: (id: string, patch: Partial<AdminOrder>) => void; notify: (m: string) => void;
}) {
  const [f, setF] = useState<OrderFilter>("All");
  const [q, setQ] = useState("");
  const [confirmCancel, setConfirmCancel] = useState<AdminOrder | null>(null);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return orders.filter((o) => (f === "All" || o.status === f) &&
      (!n || `${o.id} ${o.items} ${customerName(customers, o.customerId)}`.toLowerCase().includes(n)));
  }, [orders, customers, f, q]);

  const counts = Object.fromEntries((["All", "Placed", "Shipped", "Delivered", "Cancelled"] as OrderFilter[]).map((s) => [s, s === "All" ? orders.length : orders.filter((o) => o.status === s).length]));

  const advance = (o: AdminOrder) => {
    const next = ORDER_FLOW[ORDER_FLOW.indexOf(o.status) + 1];
    if (!next) return;
    onUpdate(o.id, { status: next });
    notify(`#${o.id} marked ${next} — customer notified`);
  };

  return (
    <Panel title="Orders" pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search order, customer, item" />}>
      <div style={{ padding: "12px 16px" }}>
        <Filter<OrderFilter> options={["All", "Placed", "Shipped", "Delivered", "Cancelled"]} value={f} onChange={setF} counts={counts} />
      </div>
      <Table rows={rows} rowKey={(o) => o.id} empty="No orders match." cols={[
        { key: "id", head: "Order", render: (o) => <><b>#{o.id}</b><div style={muted}>{o.date}</div></> },
        { key: "c", head: "Customer", render: (o) => customerName(customers, o.customerId) },
        { key: "i", head: "Items", render: (o) => o.items },
        { key: "p", head: "Payment", render: (o) => <span style={muted}>{o.payment}</span> },
        { key: "a", head: "Amount", align: "right", render: (o) => <b>{inr(o.amount)}</b> },
        { key: "s", head: "Status", render: (o) => <Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge> },
        { key: "x", head: "", align: "right", render: (o) => (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            {o.status === "Placed" && <Btn small onClick={() => advance(o)}>Mark shipped</Btn>}
            {o.status === "Shipped" && <Btn small kind="gold" onClick={() => advance(o)}>Mark delivered</Btn>}
            {o.status === "Placed" && <Btn small kind="danger" onClick={() => setConfirmCancel(o)}>Cancel</Btn>}
          </div>
        ) },
      ]} />

      {confirmCancel && (
        <Modal title={`Cancel order #${confirmCancel.id}?`} onClose={() => setConfirmCancel(null)} footer={<>
          <Btn kind="ghost" onClick={() => setConfirmCancel(null)}>Keep order</Btn>
          <Btn kind="danger" onClick={() => { onUpdate(confirmCancel.id, { status: "Cancelled" }); notify(confirmCancel.payment === "COD" ? `#${confirmCancel.id} cancelled` : `#${confirmCancel.id} cancelled · ${inr(confirmCancel.amount)} refund started`); setConfirmCancel(null); }}>Cancel & refund</Btn>
        </>}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>
            {confirmCancel.items} for {customerName(customers, confirmCancel.customerId)}. {confirmCancel.payment === "COD" ? "Nothing was charged (cash on delivery)." : `${inr(confirmCancel.amount)} will be refunded to the original ${confirmCancel.payment} payment.`}
          </p>
        </Modal>
      )}
    </Panel>
  );
}

/* ───────────────────────── Service jobs / dispatch ───────────────────────── */

type JobFilter = "All" | AdminJobStatus;

export function ServicesSection({ jobs, customers, techs, onUpdate, notify }: {
  jobs: AdminJob[]; customers: AdminCustomer[]; techs: AdminTech[];
  onUpdate: (id: string, patch: Partial<AdminJob>) => void; notify: (m: string) => void;
}) {
  const [f, setF] = useState<JobFilter>("All");
  const [q, setQ] = useState("");
  const [assigning, setAssigning] = useState<AdminJob | null>(null);

  const rows = jobs.filter((j) => (f === "All" || j.status === f) &&
    (!q.trim() || `${j.id} ${j.type} ${j.area} ${customerName(customers, j.customerId)}`.toLowerCase().includes(q.trim().toLowerCase())));
  const counts = Object.fromEntries((["All", "Unassigned", "Assigned", "In Progress", "Rescheduled", "Completed"] as JobFilter[]).map((s) => [s, s === "All" ? jobs.length : jobs.filter((j) => j.status === s).length]));
  const techName = (id: string | null) => techs.find((t) => t.id === id)?.name;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {SERVICE_CATALOG.map((s) => {
          const n = jobs.filter((j) => j.type === s.type).length;
          return (
            <div key={s.type} style={{ background: "var(--surface)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--line)" }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600 }}>{s.type}</p>
              <p style={{ margin: "2px 0 0", ...muted }}>{n} jobs · {s.price ? inr(s.price) : "Free"}</p>
            </div>
          );
        })}
      </div>

      <Panel title="Service jobs" pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search job, customer, area" />}>
        <div style={{ padding: "12px 16px" }}>
          <Filter<JobFilter> options={["All", "Unassigned", "Assigned", "In Progress", "Rescheduled", "Completed"]} value={f} onChange={setF} counts={counts} />
        </div>
        <Table rows={rows} rowKey={(j) => j.id} empty="No jobs match." cols={[
          { key: "id", head: "Job", render: (j) => <><b>#{j.id}</b><div style={muted}>{j.type}</div></> },
          { key: "c", head: "Customer", render: (j) => <>{customerName(customers, j.customerId)}<div style={muted}>{j.area}</div></> },
          { key: "w", head: "When", render: (j) => <>{j.date === TODAY ? "Today" : j.date}<div style={muted}>{j.slot}</div></> },
          { key: "t", head: "Technician", render: (j) => techName(j.techId) ?? <span style={{ color: "var(--error-text)", fontWeight: 600 }}>Not assigned</span> },
          { key: "s", head: "Status", render: (j) => <><Badge tone={JOB_TONE[j.status]}>{j.status}</Badge>{j.note && <div style={{ ...muted, marginTop: 3 }}>{j.note}</div>}</> },
          { key: "r", head: "Rating", render: (j) => j.rating ? <span style={{ color: "var(--gold-dark)", fontWeight: 700 }}>{"★".repeat(j.rating)}</span> : <span style={muted}>—</span> },
          { key: "x", head: "", align: "right", render: (j) => (
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              {(j.status === "Unassigned" || j.status === "Rescheduled") && <Btn small onClick={() => setAssigning(j)}>{j.status === "Rescheduled" ? "Re-book" : "Assign"}</Btn>}
              {j.status === "Assigned" && <Btn small kind="ghost" onClick={() => setAssigning(j)}>Reassign</Btn>}
              {["Unassigned", "Assigned", "Rescheduled"].includes(j.status) && (
                <Btn small kind="danger" onClick={() => { onUpdate(j.id, { status: "Cancelled" }); notify(`#${j.id} cancelled`); }}>Cancel</Btn>
              )}
            </div>
          ) },
        ]} />
      </Panel>

      {assigning && (
        <AssignModal job={assigning} techs={techs} jobs={jobs} onClose={() => setAssigning(null)}
          onAssign={(techId, date) => {
            onUpdate(assigning.id, { techId, status: "Assigned", date, note: undefined });
            notify(`#${assigning.id} assigned to ${techName(techId)} — technician & customer notified`);
            setAssigning(null);
          }} />
      )}
    </div>
  );
}

function AssignModal({ job, techs, jobs, onClose, onAssign }: {
  job: AdminJob; techs: AdminTech[]; jobs: AdminJob[]; onClose: () => void; onAssign: (techId: string, date: string) => void;
}) {
  const eligible = techs.filter((t) => t.active && t.kyc === "Verified");
  const [pick, setPick] = useState<string | null>(job.techId);
  const [date, setDate] = useState(job.status === "Rescheduled" ? "30 Sep 2026" : job.date);
  const load = (id: string) => jobs.filter((j) => j.techId === id && j.date === date && ["Assigned", "In Progress"].includes(j.status)).length;
  // Jobs list Noida by sector; other cities by name.
  const city = job.area.startsWith("Sector") ? "Noida" : job.area;
  const covers = (t: AdminTech) => t.area.includes(city);
  // Technicians who cover the city first, then the least busy, then the best rated.
  const ranked = [...eligible].sort((a, b) => Number(covers(b)) - Number(covers(a)) || load(a.id) - load(b.id) || b.rating - a.rating);

  return (
    <Modal title={`Assign #${job.id} · ${job.type}`} onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!pick} onClick={() => pick && onAssign(pick, date)}>Assign technician</Btn>
    </>}>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-soft)" }}>{job.product} · {job.area} · {job.slot}</p>
      {job.status === "Rescheduled" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["30 Sep 2026", "01 Oct 2026", "02 Oct 2026"].map((d) => (
            <button key={d} onClick={() => setDate(d)} aria-pressed={date === d} style={{ flex: 1, padding: "7px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", border: date === d ? "1.5px solid var(--blue)" : "1.5px solid var(--line)", background: date === d ? "var(--blue-tint)" : "var(--surface)", color: date === d ? "var(--blue)" : "var(--text-secondary)" }}>{d.slice(0, 6)}</button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ranked.map((t, i) => {
          const n = load(t.id);
          return (
            <button key={t.id} onClick={() => setPick(t.id)} aria-pressed={pick === t.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, cursor: "pointer", textAlign: "left",
              border: pick === t.id ? "2px solid var(--blue)" : "2px solid var(--line)", background: pick === t.id ? "var(--blue-tint)" : "var(--surface)",
            }}>
              <Initials name={t.name} size={34} />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{t.name} {i === 0 && covers(t) && <Badge tone="green">Best match</Badge>}</span>
                <span style={{ ...muted, color: covers(t) ? "var(--success-text)" : "var(--ink-mute)" }}>{covers(t) ? `Covers ${city}` : `${t.area} · outside area`}</span>
              </span>
              <span style={{ textAlign: "right" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", fontSize: 12.5, fontWeight: 700 }}><StarIcon s={12} />{t.rating}</span>
                <span style={muted}>{n} jobs that day</span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
