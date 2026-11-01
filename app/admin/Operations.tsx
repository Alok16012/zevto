"use client";

import { useMemo, useState } from "react";
import { StarIcon } from "../components/icons";
import TechAvatar from "../components/TechAvatar";
import { PRODUCTS, SERVICE_CATALOG, TIME_SLOTS, inr, isPincode, type ServiceType } from "../lib/data";
import { fmtDay } from "../lib/catalog";
import {
  ORDER_FLOW,
  type AdminCustomer, type AdminJob, type AdminJobStatus, type AdminOrder, type AdminOrderStatus, type AdminTech, type Dealer,
} from "../lib/adminData";
import { Badge, Btn, Filter, Modal, Panel, SearchBox, Table, fieldLabel, input, muted, type Tone } from "./kit";

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

export function ServicesSection({ jobs, customers, techs, dealers, onAssign, onCancel, onCreateTask }: {
  jobs: AdminJob[]; customers: AdminCustomer[]; techs: AdminTech[]; dealers: Dealer[];
  onAssign: (j: AdminJob, techId: string, isoDate: string) => Promise<void>; onCancel: (j: AdminJob) => Promise<void>;
  onCreateTask: (t: NewAdminTask) => Promise<boolean>;
}) {
  const [f, setF] = useState<JobFilter>("All");
  const [q, setQ] = useState("");
  const [assigning, setAssigning] = useState<AdminJob | null>(null);
  const [creating, setCreating] = useState(false);
  const dealerName = (id: string | null) => dealers.find((d) => d.id === id)?.name;

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

      <Panel title="Service jobs" pad={false} actions={<>
        <SearchBox value={q} onChange={setQ} placeholder="Search job, customer, pincode" />
        <Btn onClick={() => setCreating(true)}>+ New task</Btn>
      </>}>
        <div style={{ padding: "12px 16px" }}>
          <Filter<JobFilter> options={FILTERS} value={f} onChange={setF} counts={counts} />
        </div>
        <Table rows={rows} rowKey={(j) => j.id} empty={jobs.length ? "No jobs match." : "No service bookings yet."} cols={[
          { key: "id", head: "Job", render: (j) => <><b>#{j.ref}</b><div style={muted}>{j.type}</div></> },
          { key: "c", head: "Customer", render: (j) => <>
            {jobCustomer(customers, j)}<div style={muted}>{j.area} · {j.pincode}</div>
            {j.customerPhone && <div style={muted}>{j.customerPhone}</div>}
            {j.raisedBy && <div style={{ marginTop: 3 }}><Badge tone="purple">Raised by {j.raisedBy}</Badge></div>}
            {j.source === "dealer" && <div style={{ marginTop: 3 }}><Badge tone="purple">Dealer task · {dealerName(j.raisedDealer) ?? "dealer"}</Badge></div>}
            {j.source === "admin" && <div style={{ marginTop: 3 }}><Badge tone="blue">Booked by ops</Badge></div>}
          </> },
          { key: "w", head: "When", render: (j) => <>{j.isoDate === today ? "Today" : j.date}<div style={muted}>{j.slot}</div></> },
          { key: "t", head: "Technician", render: (j) => techName(j.techId)
            ?? (j.preferredTechId ? <span style={{ color: "var(--warning-text)", fontWeight: 600 }}>Asked {techName(j.preferredTechId) ?? "a technician"}</span>
              : <span style={{ color: "var(--error-text)", fontWeight: 600 }}>Not assigned</span>) },
          { key: "s", head: "Status", render: (j) => <><Badge tone={JOB_TONE[j.status]}>{j.status}</Badge>{j.note && <div style={{ ...muted, marginTop: 3, maxWidth: 220 }}>{j.note}</div>}</> },
          { key: "o", head: "Codes", render: (j) => j.startCode ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: "nowrap" }}>
              <div><span style={muted}>Start</span> <b style={{ letterSpacing: "0.12em" }}>{j.startCode}</b></div>
              {j.closeCode && <div><span style={muted}>Close</span> <b style={{ letterSpacing: "0.12em" }}>{j.closeCode}</b></div>}
            </div>
          ) : <span style={muted} title="Customer isn't on the app — no codes needed">—</span> },
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

      {creating && <NewTaskModal customers={customers} techs={techs} onClose={() => setCreating(false)}
        onCreate={async (t) => { if (await onCreateTask(t)) setCreating(false); }} />}
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

/* ───────────────────────── New task (ops books a job) ───────────────────────── */

export interface NewAdminTask {
  customerId: string | null; name: string; phone: string; address: string; pincode: string;
  type: ServiceType; product: string; isoDate: string; slot: string; issue: string; techId: string | null;
}

function NewTaskModal({ customers, techs, onClose, onCreate }: {
  customers: AdminCustomer[]; techs: AdminTech[]; onClose: () => void; onCreate: (t: NewAdminTask) => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [type, setType] = useState<ServiceType>(SERVICE_CATALOG[0]?.type ?? "Repair");
  const [product, setProduct] = useState("");
  const [date, setDate] = useState(isoDay(1));
  const [slot, setSlot] = useState("");
  const [issue, setIssue] = useState("");
  const [techId, setTechId] = useState("");
  const [busy, setBusy] = useState(false);

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) { setName(c.name); setPhone(c.phone); }
  };
  const eligible = techs.filter((t) => t.active && t.kyc === "Verified")
    .sort((a, b) => Number(b.pincodes.includes(pincode)) - Number(a.pincodes.includes(pincode)));
  const err = name.trim().length < 2 ? "Enter the customer's name" : address.trim().length < 8 ? "Enter the full address"
    : !isPincode(pincode) ? "Enter the 6-digit pincode" : date < isoDay() ? "Pick today or a later date"
    : techId && !slot ? "Pick a time slot for the technician" : null;

  const save = async () => {
    if (err) return;
    setBusy(true);
    await onCreate({ customerId: customerId || null, name: name.trim(), phone: phone.trim(), address: address.trim(), pincode, type,
      product: product || "RO purifier", isoDate: date, slot: slot || "Any time", issue: issue.trim(), techId: techId || null });
    setBusy(false);
  };
  const field = (label: string, el: React.ReactNode, span = false) => <label style={span ? { gridColumn: "1 / -1" } : undefined}><span style={fieldLabel}>{label}</span>{el}</label>;

  return (
    <Modal title="New service task" onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!!err || busy} onClick={() => void save()}>{busy ? "Creating…" : techId ? "Create & assign" : "Create task"}</Btn>
    </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {field("App customer (optional)", <select value={customerId} onChange={(e) => pickCustomer(e.target.value)} style={input}>
          <option value="">Not on the app / new customer</option>
          {customers.filter((c) => !c.blocked).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.code}{c.phone ? ` · ${c.phone}` : ""}</option>)}
        </select>, true)}
        {field("Customer name", <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} style={input} />)}
        {field("Mobile", <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={16} inputMode="tel" style={input} />)}
        {field("Address", <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={200} placeholder="House no., society, sector, city" style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />, true)}
        {field("Pincode", <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" style={input} />)}
        {field("Service", <select value={type} onChange={(e) => setType(e.target.value as ServiceType)} style={input}>
          {SERVICE_CATALOG.map((s) => <option key={s.type} value={s.type}>{s.type} · {s.price ? inr(s.price) : "Free"}</option>)}
        </select>)}
        {field("Product", <select value={product} onChange={(e) => setProduct(e.target.value)} style={input}>
          <option value="">RO purifier (unknown model)</option>
          {PRODUCTS.filter((p) => p.category !== "spare" && !p.dealerId && !p.techId).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          <option value="Other brand purifier">Other brand purifier</option>
        </select>)}
        {field("Visit date", <input type="date" value={date} min={isoDay()} onChange={(e) => setDate(e.target.value)} style={input} />)}
        {field("Time slot", <select value={slot} onChange={(e) => setSlot(e.target.value)} style={input}>
          <option value="">Any time</option>
          {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>)}
        {field("Assign to (optional)", <select value={techId} onChange={(e) => setTechId(e.target.value)} style={input}>
          <option value="">Assign later</option>
          {eligible.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.code}{t.pincodes.includes(pincode) ? " · covers pincode" : ""}</option>)}
        </select>, true)}
        {field("What needs doing", <textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={2} maxLength={300} style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />, true)}
      </div>
      {err && (name || address || pincode) ? <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>
        : <p style={{ ...muted, margin: "10px 0 0" }}>{customerId ? "The customer gets start and close codes in their app." : "Not an app customer, so no codes are needed."}</p>}
    </Modal>
  );
}
