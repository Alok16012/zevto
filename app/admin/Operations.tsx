"use client";

import { useMemo, useState } from "react";
import { StarIcon } from "../components/icons";
import TechAvatar from "../components/TechAvatar";
import { SERVICE_CATALOG, inr } from "../lib/data";
import { fmtDay } from "../lib/catalog";
import {
  ORDER_FLOW,
  type AdminCustomer, type AdminJob, type AdminJobStatus, type AdminOrder, type AdminOrderStatus, type AdminTech,
} from "../lib/adminData";
import { Badge, Btn, Filter, Modal, Panel, SearchBox, Table, muted, type Tone } from "./kit";

export const ORDER_TONE: Record<AdminOrderStatus, Tone> = { Placed: "purple", Shipped: "amber", Delivered: "green", Cancelled: "grey" };
export const JOB_TONE: Record<AdminJobStatus, Tone> = {
  "Awaiting tech": "amber", Unassigned: "red", Assigned: "purple", "On the way": "blue", Arrived: "blue", "In Progress": "blue",
  Completed: "green", Rescheduled: "amber", Cancelled: "grey",
};

export const customerName = (all: AdminCustomer[], id: string) => all.find((c) => c.id === id)?.name ?? "—";
const jobCustomer = (all: AdminCustomer[], j: AdminJob) => j.customerLabel || customerName(all, j.customerId);

/** Local "YYYY-MM-DD", `days` from today. */
export const isoDay = (days = 0) => {
  const d = new Date(Date.now() + days * 864e5);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/* ───────────────────────── Orders ───────────────────────── */

type OrderFilter = "All" | AdminOrderStatus;

export function OrdersSection({ orders, customers, onStatus }: {
  orders: AdminOrder[]; customers: AdminCustomer[]; onStatus: (o: AdminOrder, status: AdminOrderStatus) => Promise<void>;
}) {
  const [f, setF] = useState<OrderFilter>("All");
  const [q, setQ] = useState("");
  const [confirmCancel, setConfirmCancel] = useState<AdminOrder | null>(null);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return orders.filter((o) => (f === "All" || o.status === f) &&
      (!n || `${o.ref} ${o.items} ${customerName(customers, o.customerId)}`.toLowerCase().includes(n)));
  }, [orders, customers, f, q]);

  const counts = Object.fromEntries((["All", "Placed", "Shipped", "Delivered", "Cancelled"] as OrderFilter[]).map((s) => [s, s === "All" ? orders.length : orders.filter((o) => o.status === s).length]));

  const advance = (o: AdminOrder) => {
    const next = ORDER_FLOW[ORDER_FLOW.indexOf(o.status) + 1];
    if (next) void onStatus(o, next);
  };

  return (
    <Panel title="Orders" pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search order, customer, item" />}>
      <div style={{ padding: "12px 16px" }}>
        <Filter<OrderFilter> options={["All", "Placed", "Shipped", "Delivered", "Cancelled"]} value={f} onChange={setF} counts={counts} />
      </div>
      <Table rows={rows} rowKey={(o) => o.id} empty={orders.length ? "No orders match." : "No orders yet. They'll appear here the moment a customer checks out."} cols={[
        { key: "id", head: "Order", render: (o) => <><b>#{o.ref}</b><div style={muted}>{o.date}</div></> },
        { key: "c", head: "Customer", render: (o) => <>{customerName(customers, o.customerId)}<div style={{ ...muted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.address}</div></> },
        { key: "i", head: "Items", render: (o) => o.items },
        { key: "p", head: "Payment", render: (o) => <><span style={muted}>{o.payment}</span><div style={{ fontSize: 11, color: o.paymentStatus === "Paid" ? "var(--success-text)" : "var(--warning-text)", fontWeight: 600 }}>{o.paymentStatus}</div></> },
        { key: "a", head: "Amount", align: "right", render: (o) => <b>{inr(o.amount)}</b> },
        { key: "s", head: "Status", render: (o) => <Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge> },
        { key: "x", head: "", align: "right", render: (o) => (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            {o.status === "Placed" && <Btn small onClick={() => advance(o)}>Mark shipped</Btn>}
            {o.status === "Shipped" && <Btn small kind="gold" onClick={() => advance(o)}>Mark delivered</Btn>}
            {(o.status === "Placed" || o.status === "Shipped") && <Btn small kind="danger" onClick={() => setConfirmCancel(o)}>Cancel</Btn>}
          </div>
        ) },
      ]} />

      {confirmCancel && (
        <Modal title={`Cancel order #${confirmCancel.ref}?`} onClose={() => setConfirmCancel(null)} footer={<>
          <Btn kind="ghost" onClick={() => setConfirmCancel(null)}>Keep order</Btn>
          <Btn kind="danger" onClick={() => { void onStatus(confirmCancel, "Cancelled"); setConfirmCancel(null); }}>Cancel order</Btn>
        </>}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>
            {confirmCancel.items} for {customerName(customers, confirmCancel.customerId)}. Any wallet balance used goes back to their wallet automatically.
            {confirmCancel.payment === "Online" && confirmCancel.paymentStatus === "Paid" && <> Refund the online payment of {inr(confirmCancel.amount)} from your payment gateway dashboard.</>}
          </p>
        </Modal>
      )}
    </Panel>
  );
}

/* ───────────────────────── Service jobs / dispatch ───────────────────────── */

type JobFilter = "All" | AdminJobStatus;
const FILTERS: JobFilter[] = ["All", "Unassigned", "Awaiting tech", "Assigned", "On the way", "In Progress", "Rescheduled", "Completed", "Cancelled"];
const ACTIVE: AdminJobStatus[] = ["Assigned", "On the way", "Arrived", "In Progress"];

export function ServicesSection({ jobs, customers, techs, onAssign, onCancel }: {
  jobs: AdminJob[]; customers: AdminCustomer[]; techs: AdminTech[];
  onAssign: (j: AdminJob, techId: string, isoDate: string) => Promise<void>; onCancel: (j: AdminJob) => Promise<void>;
}) {
  const [f, setF] = useState<JobFilter>("All");
  const [q, setQ] = useState("");
  const [assigning, setAssigning] = useState<AdminJob | null>(null);

  const rows = jobs.filter((j) => (f === "All" || j.status === f || (f === "On the way" && j.status === "Arrived")) &&
    (!q.trim() || `${j.ref} ${j.type} ${j.area} ${j.pincode} ${jobCustomer(customers, j)} ${j.raisedBy ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())));
  const counts = Object.fromEntries(FILTERS.map((s) => [s, s === "All" ? jobs.length : jobs.filter((j) => j.status === s).length]));
  const techName = (id: string | null) => techs.find((t) => t.id === id)?.name;
  const today = isoDay();

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

      <Panel title="Service jobs" pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search job, customer, pincode" />}>
        <div style={{ padding: "12px 16px" }}>
          <Filter<JobFilter> options={FILTERS} value={f} onChange={setF} counts={counts} />
        </div>
        <Table rows={rows} rowKey={(j) => j.id} empty={jobs.length ? "No jobs match." : "No service bookings yet."} cols={[
          { key: "id", head: "Job", render: (j) => <><b>#{j.ref}</b><div style={muted}>{j.type}</div></> },
          { key: "c", head: "Customer", render: (j) => <>
            {jobCustomer(customers, j)}<div style={muted}>{j.area} · {j.pincode}</div>
            {j.customerPhone && <div style={muted}>{j.customerPhone}</div>}
            {j.raisedBy && <div style={{ marginTop: 3 }}><Badge tone="purple">Raised by {j.raisedBy}</Badge></div>}
          </> },
          { key: "w", head: "When", render: (j) => <>{j.isoDate === today ? "Today" : j.date}<div style={muted}>{j.slot}</div></> },
          { key: "t", head: "Technician", render: (j) => techName(j.techId)
            ?? (j.preferredTechId ? <span style={{ color: "var(--warning-text)", fontWeight: 600 }}>Asked {techName(j.preferredTechId) ?? "a technician"}</span>
              : <span style={{ color: "var(--error-text)", fontWeight: 600 }}>Not assigned</span>) },
          { key: "s", head: "Status", render: (j) => <><Badge tone={JOB_TONE[j.status]}>{j.status}</Badge>{j.note && <div style={{ ...muted, marginTop: 3, maxWidth: 220 }}>{j.note}</div>}</> },
          { key: "r", head: "Rating", render: (j) => j.rating ? <span style={{ color: "var(--gold-dark)", fontWeight: 700 }}>{"★".repeat(j.rating)}</span> : <span style={muted}>—</span> },
          { key: "x", head: "", align: "right", render: (j) => (
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              {(j.status === "Unassigned" || j.status === "Rescheduled" || j.status === "Awaiting tech") && (
                <Btn small onClick={() => setAssigning(j)}>{j.status === "Rescheduled" ? "Re-book" : "Assign"}</Btn>
              )}
              {j.status === "Assigned" && <Btn small kind="ghost" onClick={() => setAssigning(j)}>Reassign</Btn>}
              {["Unassigned", "Awaiting tech", "Assigned", "Rescheduled"].includes(j.status) && (
                <Btn small kind="danger" onClick={() => { if (confirm(`Cancel #${j.ref}? The customer will be notified.`)) void onCancel(j); }}>Cancel</Btn>
              )}
            </div>
          ) },
        ]} />
      </Panel>

      {assigning && (
        <AssignModal job={assigning} techs={techs} jobs={jobs} onClose={() => setAssigning(null)}
          onAssign={(techId, isoDate) => { void onAssign(assigning, techId, isoDate); setAssigning(null); }} />
      )}
    </div>
  );
}

function AssignModal({ job, techs, jobs, onClose, onAssign }: {
  job: AdminJob; techs: AdminTech[]; jobs: AdminJob[]; onClose: () => void; onAssign: (techId: string, isoDate: string) => void;
}) {
  const eligible = techs.filter((t) => t.active && t.kyc === "Verified");
  const [pick, setPick] = useState<string | null>(job.techId ?? job.preferredTechId);
  // Rescheduled jobs need a new day; never offer a day that has passed.
  const firstDay = job.status === "Rescheduled" || job.isoDate < isoDay() ? isoDay(1) : job.isoDate;
  const days = Array.from(new Set([firstDay, isoDay(1), isoDay(2), isoDay(3)])).filter((d) => d >= isoDay()).slice(0, 4);
  const [date, setDate] = useState(firstDay);
  const load = (id: string) => jobs.filter((j) => j.techId === id && j.isoDate === date && ACTIVE.includes(j.status)).length;
  const covers = (t: AdminTech) => t.pincodes.includes(job.pincode);
  const primary = (t: AdminTech) => t.pincodes[0] === job.pincode;
  // Technicians who serve the pincode first (primary area first), then the least busy, then the best rated.
  const ranked = [...eligible].sort((a, b) =>
    Number(covers(b)) - Number(covers(a)) || Number(primary(b)) - Number(primary(a)) || load(a.id) - load(b.id) || b.rating - a.rating);

  return (
    <Modal title={`Assign #${job.ref} · ${job.type}`} onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!pick} onClick={() => pick && onAssign(pick, date)}>Assign technician</Btn>
    </>}>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-soft)" }}>{job.product} · {job.area} · pincode {job.pincode} · {job.slot}</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {days.map((d) => (
          <button key={d} onClick={() => setDate(d)} aria-pressed={date === d} style={{ flex: 1, padding: "7px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", border: date === d ? "1.5px solid var(--blue)" : "1.5px solid var(--line)", background: date === d ? "var(--blue-tint)" : "var(--surface)", color: date === d ? "var(--blue)" : "var(--text-secondary)" }}>
            {d === isoDay() ? "Today" : d === isoDay(1) ? "Tomorrow" : fmtDay(d).slice(0, 6)}
          </button>
        ))}
      </div>
      {eligible.length === 0 && <p style={{ ...muted, fontSize: 13 }}>No verified technicians yet. Add one under People → Technicians.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ranked.map((t, i) => {
          const n = load(t.id);
          return (
            <button key={t.id} onClick={() => setPick(t.id)} aria-pressed={pick === t.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, cursor: "pointer", textAlign: "left",
              border: pick === t.id ? "2px solid var(--blue)" : "2px solid var(--line)", background: pick === t.id ? "var(--blue-tint)" : "var(--surface)",
            }}>
              <TechAvatar id={t.id} name={t.name} size={36} photoUrl={t.photoUrl} />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>
                  {t.name} <span style={{ ...muted, fontWeight: 500 }}>{t.code}</span> {i === 0 && covers(t) && <Badge tone="green">Best match</Badge>}
                </span>
                <span style={{ ...muted, color: covers(t) ? "var(--success-text)" : "var(--ink-mute)" }}>
                  {covers(t) ? (primary(t) ? `Lives in ${job.pincode}` : `Covers ${job.pincode}`) : `Doesn't cover ${job.pincode}`}
                </span>
              </span>
              <span style={{ textAlign: "right" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", fontSize: 12.5, fontWeight: 700 }}><StarIcon s={12} />{t.rating || "New"}</span>
                <span style={muted}>{n} jobs that day</span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
