"use client";

import { useState } from "react";
import { BagIcon, BoxIcon, CalendarIcon, ChevronRight, ClockIcon, PhoneIcon, PinIcon, PlusIcon, UsersIcon, WrenchIcon } from "../icons";
import { BrandMark } from "../Brand";
import { Footer, PageHeader, PrimaryButton, card } from "../ui";
import { Badge, Chips, Empty, JOB_LABEL, JOB_TONE, ORDER_TONE, Row, ghostBtn, inputStyle, sectionH } from "./kit";
import { inr } from "../../lib/data";
import { fmtDay, type DbTechnician } from "../../lib/catalog";
import { fmtDateOnly, fmtStamp, type DbRequest } from "../../lib/db";
import { LOW_STOCK, assignable, isOpenJob, type DbDealerOrder, type DealerData, type DealerOrderStatus } from "../../lib/dealerData";

const tel = (p: string) => `tel:+91${p.replace(/\D/g, "").slice(-10)}`;
const canWork = (t: DbTechnician) => t.active && t.kyc === "Verified";
const isDone = (j: DbRequest) => j.status === "Completed" || j.status === "Cancelled";

/* ───────────────────────── Dashboard ───────────────────────── */

export function DealerHome({ data, onOrders, onJobs, onListings, onTeam, onAddListing, onOpenOrder, onOpenJob }: {
  data: DealerData; onOrders: () => void; onJobs: () => void; onListings: () => void; onTeam: () => void; onAddListing: () => void;
  onOpenOrder: (id: string) => void; onOpenJob: (id: string) => void;
}) {
  const { dealer, orders, jobs, listings, team } = data;
  const delivered = orders.filter((o) => o.status === "Delivered");
  const sales = delivered.reduce((s, o) => s + o.amount, 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const monthSales = delivered.filter((o) => o.updated_at >= monthStart).reduce((s, o) => s + o.amount, 0);
  const newOrders = orders.filter((o) => o.status === "New");
  const inTransit = orders.filter((o) => o.status === "Accepted" || o.status === "Shipped").length;
  const openJobs = jobs.filter(isOpenJob);
  const teamJobs = jobs.filter((j) => j.tech_id && !isDone(j));
  const lowStock = listings.filter((l) => l.active && l.stock <= LOW_STOCK);
  const live = listings.filter((l) => l.active && l.stock > 0).length;
  const verified = dealer.kyc === "Verified";

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 16px 14px" }}>
        <BrandMark size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>{greet},</p>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dealer.name}</p>
        </div>
        <Badge tone={!dealer.active ? "grey" : verified ? "green" : "amber"}>{!dealer.active ? "Paused" : verified ? "✓ Verified" : "KYC pending"}</Badge>
      </div>

      {!dealer.active && <Notice tone="grey">Zavtoo has paused your shop, so customers can&apos;t see your listings right now. Call dealer help to sort it out.</Notice>}
      {dealer.active && !verified && (
        <Notice tone="amber">
          <b>Verification in progress.</b> Zavtoo will call you to check your shop and documents. Add your listings and technicians now — listings go live and you can take jobs once you&apos;re verified.
        </Notice>
      )}

      {/* Sales hero */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ borderRadius: 22, padding: 18, background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", color: "white", boxShadow: "0 10px 28px rgba(11,92,255,0.28)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Delivered this month</p>
              <p style={{ margin: "2px 0 0", fontSize: 28, fontWeight: 800 }}>{inr(monthSales)}</p>
            </div>
            <span style={{ background: "var(--gold)", color: "var(--blue-dark)", fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>{dealer.code}</span>
          </div>
          <div style={{ display: "flex", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.18)" }}>
            {[[inr(sales), "All-time sales"], [String(delivered.length), "Orders delivered"], [String(inTransit), "In progress"]].map(([v, l], i) => (
              <div key={l} style={{ flex: 1, paddingLeft: i ? 10 : 0, borderLeft: i ? "1px solid rgba(255,255,255,0.18)" : "none" }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{v}</p>
                <p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.7)" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Tile Icon={BagIcon} tint="var(--purple-tint)" c="var(--purple)" value={newOrders.length} label="New orders" onClick={onOrders} />
        <Tile Icon={WrenchIcon} tint="var(--orange-bg)" c="var(--orange)" value={openJobs.length} label="Open jobs in your area" onClick={onJobs} />
        <Tile Icon={BoxIcon} tint="var(--teal-bg)" c="var(--teal-text)" value={live} label="Live listings" onClick={onListings} />
        <Tile Icon={UsersIcon} tint="var(--gold-tint)" c="var(--gold-dark)" value={team.length} label="Technicians" onClick={onTeam} />
      </div>

      {lowStock.length > 0 && (
        <div style={{ padding: "14px 16px 0" }}>
          <button onClick={onListings} className="press" style={{ ...card, width: "100%", border: "1.5px solid var(--warning-border)", background: "var(--warning)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ flex: 1, fontSize: 13, color: "var(--ink)" }}>
              <b>{lowStock.length} listing{lowStock.length > 1 ? "s" : ""} running low</b>
              <span style={{ display: "block", fontSize: 12, color: "var(--ink-soft)" }}>{lowStock.map((l) => `${l.name} (${l.stock})`).join(", ")}</span>
            </span>
            <ChevronRight s={16} c="var(--warning-text)" />
          </button>
        </div>
      )}

      <div style={{ padding: "14px 16px 0" }}>
        <button onClick={onAddListing} className="press" style={{ ...card, width: "100%", border: "1.5px dashed var(--blue-soft)", padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", color: "var(--blue)", fontSize: 14, fontWeight: 700 }}>
          <PlusIcon s={18} c="var(--blue)" /> List a new product
        </button>
      </div>

      <SectionHead title="Orders to act on" onAll={onOrders} />
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {newOrders.length === 0
          ? <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", padding: "4px 2px" }}>You&apos;re all caught up.</p>
          : newOrders.slice(0, 3).map((o) => <OrderCard key={o.id} order={o} onOpen={() => onOpenOrder(o.id)} />)}
      </div>

      <SectionHead title="Service jobs" onAll={onJobs} />
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {openJobs.length + teamJobs.length === 0
          ? <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", padding: "4px 2px" }}>No open jobs right now.</p>
          : [...openJobs, ...teamJobs].slice(0, 3).map((j) => <JobCard key={j.id} job={j} tech={team.find((t) => t.id === j.tech_id)} onOpen={() => onOpenJob(j.id)} />)}
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "amber" | "grey"; children: React.ReactNode }) {
  const amber = tone === "amber";
  return (
    <div style={{ padding: "0 16px 14px" }}>
      <p style={{
        margin: 0, padding: "12px 14px", borderRadius: 14, fontSize: 12.5, lineHeight: 1.55, color: "var(--ink)",
        background: amber ? "var(--warning)" : "var(--surface-dim)", border: `1.5px solid ${amber ? "var(--warning-border)" : "var(--border)"}`,
      }}>{children}</p>
    </div>
  );
}

function Tile({ Icon, tint, c, value, label, onClick }: {
  Icon: (p: { s?: number; c?: string }) => React.ReactElement; tint: string; c: string; value: React.ReactNode; label: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="press" style={{ ...card, border: "none", padding: 14, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ width: 36, height: 36, borderRadius: 11, background: tint, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon s={19} c={c} /></span>
      <span>
        <span style={{ display: "block", fontSize: 21, fontWeight: 800, color: "var(--ink)", lineHeight: 1.1 }}>{value}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{label}</span>
      </span>
    </button>
  );
}

function SectionHead({ title, onAll }: { title: string; onAll: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 18px 10px" }}>
      <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: "var(--ink)" }}>{title}</h3>
      <button onClick={onAll} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>See all</button>
    </div>
  );
}

/* ───────────────────────── Orders ───────────────────────── */

function OrderCard({ order: o, onOpen }: { order: DbDealerOrder; onOpen: () => void }) {
  const units = o.items.reduce((s, i) => s + i.qty, 0);
  return (
    <button onClick={onOpen} className="press" style={{ ...card, width: "100%", border: "none", padding: 14, cursor: "pointer", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{fmtDateOnly(o.created_at)} · {o.pincode}</span>
        <div style={{ flex: 1 }} />
        <Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge>
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{o.items[0]?.name}{o.items.length > 1 && ` + ${o.items.length - 1} more`}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{o.customer_name} · {units} unit{units > 1 ? "s" : ""} · {o.payment}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{inr(o.amount)}</span>
      </div>
    </button>
  );
}

type OrderFilter = "open" | DealerOrderStatus | "all";

export function DealerOrdersScreen({ orders, onOpen }: { orders: DbDealerOrder[]; onOpen: (id: string) => void }) {
  const [f, setF] = useState<OrderFilter>("open");
  const count = (s: DealerOrderStatus) => orders.filter((o) => o.status === s).length;
  const rows = orders.filter((o) => f === "all" || (f === "open" ? ["New", "Accepted", "Shipped"].includes(o.status) : o.status === f));

  return (
    <div>
      <PageHeader title="Orders" />
      <div style={{ padding: "0 16px 24px" }}>
        <Chips<OrderFilter> value={f} onChange={setF} items={[
          { id: "open", label: "Open", count: count("New") + count("Accepted") + count("Shipped") },
          { id: "New", label: "New", count: count("New") },
          { id: "Shipped", label: "Shipped", count: count("Shipped") },
          { id: "Delivered", label: "Delivered", count: count("Delivered") },
          { id: "all", label: "All", count: orders.length },
        ]} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {orders.length === 0 && <Empty title="No orders yet" body="When a customer in your pincodes buys one of your live listings, the order lands here." />}
          {orders.length > 0 && rows.length === 0 && <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, padding: "30px 0" }}>Nothing here.</p>}
          {rows.map((o) => <OrderCard key={o.id} order={o} onOpen={() => onOpen(o.id)} />)}
        </div>
      </div>
    </div>
  );
}

const ORDER_FLOW: DealerOrderStatus[] = ["New", "Accepted", "Shipped", "Delivered"];
const NEXT_ACTION: Partial<Record<DealerOrderStatus, [DealerOrderStatus, string]>> = {
  New: ["Accepted", "Accept order"],
  Accepted: ["Shipped", "Mark as dispatched"],
  Shipped: ["Delivered", "Mark as delivered"],
};

export function DealerOrderDetail({ order: o, onBack, onStatus }: {
  order: DbDealerOrder; onBack: () => void; onStatus: (s: DealerOrderStatus, reason?: string) => Promise<boolean>;
}) {
  const step = ORDER_FLOW.indexOf(o.status);
  const next = NEXT_ACTION[o.status];
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (s: DealerOrderStatus, r?: string) => {
    setBusy(true);
    const ok = await onStatus(s, r);
    setBusy(false);
    if (ok) setRejecting(false);
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Order details" onBack={onBack} right={<Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge>} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        {step >= 0 && (
          <div style={{ ...card, padding: "16px 14px", display: "flex" }}>
            {ORDER_FLOW.map((s, i) => (
              <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {i > 0 && <span style={{ position: "absolute", top: 10, right: "50%", width: "100%", height: 3, background: i <= step ? "var(--blue)" : "var(--line)" }} />}
                <span style={{ position: "relative", zIndex: 1, width: 22, height: 22, borderRadius: "50%", background: i <= step ? "var(--blue)" : "var(--surface)", border: i <= step ? "none" : "2px solid var(--line-strong)", color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i <= step ? "✓" : ""}</span>
                <span style={{ marginTop: 6, fontSize: 11, fontWeight: i === step ? 700 : 500, color: i <= step ? "var(--ink)" : "var(--ink-mute)" }}>{s}</span>
              </div>
            ))}
          </div>
        )}
        {o.status === "Rejected" && <p style={{ margin: 0, padding: "10px 12px", borderRadius: 12, background: "var(--error)", color: "var(--error-text)", fontSize: 12.5, fontWeight: 600 }}>You rejected this order: {o.reject_reason}</p>}
        {o.status === "Cancelled" && <p style={{ margin: 0, padding: "10px 12px", borderRadius: 12, background: "var(--surface-dim)", color: "var(--text-muted)", fontSize: 12.5, fontWeight: 600 }}>Zavtoo cancelled the customer&apos;s order. Nothing more to do.</p>}
        {!o.whole_order && ["New", "Accepted", "Shipped"].includes(o.status) && (
          <p style={{ margin: "10px 2px 0", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            The customer bought Zavtoo items in the same order. Zavtoo&apos;s team keeps the customer updated, so you only need to deliver your items.
          </p>
        )}

        <h3 style={sectionH}>Customer</h3>
        <div style={{ ...card, padding: 14 }}>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{o.customer_name}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-soft)", display: "flex", gap: 6, lineHeight: 1.5 }}><PinIcon s={15} c="var(--ink-mute)" />{o.address}</p>
          {o.customer_phone && (
            <a href={tel(o.customer_phone)} style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--blue-tint)", color: "var(--blue)", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>
              <PhoneIcon s={15} c="var(--blue)" /> Call customer
            </a>
          )}
        </div>

        <h3 style={sectionH}>Items</h3>
        <div style={{ ...card, padding: "6px 14px" }}>
          {o.items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 13.5 }}>
              <span><b style={{ fontWeight: 600 }}>{it.name}</b><span style={{ color: "var(--ink-soft)" }}> × {it.qty}</span></span>
              <span style={{ fontWeight: 600 }}>{inr(it.price * it.qty)}</span>
            </div>
          ))}
        </div>

        <h3 style={sectionH}>Payment</h3>
        <div style={{ ...card, padding: "6px 14px", marginBottom: 16 }}>
          <Row k="Your items" v={inr(o.amount)} strong />
          <Row k="Paid via" v={o.payment === "COD" ? "Cash on delivery — collect at the door" : o.payment === "Wallet" ? "Zavtoo wallet" : "Online"} />
          <Row k="Ordered" v={fmtStamp(o.created_at)} />
        </div>

        {rejecting && (
          <div className="fade-up" style={{ ...card, padding: 14, marginBottom: 16, border: "1.5px solid #fecaca" }}>
            <label htmlFor="rej" style={{ display: "block", fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>Why can&apos;t you fulfil it?</label>
            <input id="rej" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="e.g. Out of stock" style={inputStyle()} />
            <p style={{ margin: "8px 2px 0", fontSize: 12, color: "var(--ink-soft)" }}>The units go back into your stock.{o.whole_order ? " The customer's order is cancelled and they're told right away." : ""}</p>
          </div>
        )}
      </div>

      {next && (
        <Footer>
          {rejecting ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setRejecting(false)} style={ghostBtn}>Back</button>
              <PrimaryButton disabled={busy} onClick={() => void act("Rejected", reason)} style={{ flex: 2, background: "var(--red)", boxShadow: "none" }}>Reject order</PrimaryButton>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              {o.status !== "Shipped" && <button onClick={() => setRejecting(true)} style={{ ...ghostBtn, color: "var(--red)" }}>Reject</button>}
              <PrimaryButton disabled={busy} onClick={() => void act(next[0])} style={{ flex: 2 }}>{busy ? "Saving…" : next[1]}</PrimaryButton>
            </div>
          )}
        </Footer>
      )}
    </div>
  );
}

/* ───────────────────────── Service jobs ───────────────────────── */

function JobCard({ job: j, tech, onOpen }: { job: DbRequest; tech?: DbTechnician; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="press" style={{ ...card, width: "100%", border: "none", padding: 14, cursor: "pointer", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{j.type}</span>
        <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>#{j.ref}</span>
        <div style={{ flex: 1 }} />
        <Badge tone={JOB_TONE[j.status]}>{JOB_LABEL[j.status]}</Badge>
      </div>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink)" }}>{j.customer_name} · {j.product}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6, fontSize: 12, color: "var(--ink-soft)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CalendarIcon s={14} c="var(--ink-mute)" />{fmtDay(j.visit_date)}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ClockIcon s={14} c="var(--ink-mute)" />{j.slot}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><PinIcon s={14} c="var(--ink-mute)" />{j.pincode}</span>
        <span>{tech ? `👷 ${tech.name}` : "Not assigned"}</span>
      </div>
    </button>
  );
}

type JobFilter = "open" | "team" | "done";

export function JobsScreen({ jobs, team, verified, onOpen }: { jobs: DbRequest[]; team: DbTechnician[]; verified: boolean; onOpen: (id: string) => void }) {
  const [f, setF] = useState<JobFilter>("open");
  const open = jobs.filter(isOpenJob);
  const active = jobs.filter((j) => j.tech_id && !isDone(j));
  const done = jobs.filter((j) => j.tech_id && isDone(j));
  const rows = f === "open" ? open : f === "team" ? active : done;
  return (
    <div>
      <PageHeader title="Service Jobs" />
      <div style={{ padding: "0 16px 24px" }}>
        {!verified && <p style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: 12, background: "var(--warning)", color: "var(--warning-text)", fontSize: 12.5, fontWeight: 600 }}>Open jobs in your area show up once Zavtoo verifies your shop.</p>}
        <Chips<JobFilter> value={f} onChange={setF} items={[
          { id: "open", label: "Open in your area", count: open.length },
          { id: "team", label: "Your team's", count: active.length },
          { id: "done", label: "Done", count: done.length },
        ]} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {rows.length === 0 && (
            f === "open" ? <Empty title="No open jobs" body="Installation, repair and AMC requests in your pincodes that no technician has taken yet appear here." />
              : <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, padding: "30px 0" }}>Nothing here.</p>
          )}
          {rows.map((j) => <JobCard key={j.id} job={j} tech={team.find((t) => t.id === j.tech_id)} onOpen={() => onOpen(j.id)} />)}
        </div>
      </div>
    </div>
  );
}

export function JobDetail({ job: j, team, verified, onBack, onAssign, onAddTech }: {
  job: DbRequest; team: DbTechnician[]; verified: boolean; onBack: () => void;
  onAssign: (techId: string) => Promise<boolean>; onAddTech: () => void;
}) {
  const tech = team.find((t) => t.id === j.tech_id);
  const canAssign = verified && assignable(j);
  const [picking, setPicking] = useState(!tech && canAssign);
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title={`${j.type} #${j.ref}`} onBack={onBack} right={<Badge tone={JOB_TONE[j.status]}>{JOB_LABEL[j.status]}</Badge>} />
      <div style={{ padding: "0 16px 24px", flex: 1 }}>
        <div style={{ ...card, padding: "6px 14px" }}>
          <Row k="Product" v={j.product} />
          <Row k="Visit" v={`${fmtDay(j.visit_date)}, ${j.slot}`} />
          <Row k="Visit charge" v={j.amount ? inr(j.amount) : "Free"} />
          {j.status === "Completed" && <Row k="Completed" v={fmtStamp(j.completed_at)} />}
          {j.rating != null && <Row k="Customer rating" v={"★".repeat(j.rating)} />}
        </div>
        {j.description && <p style={{ margin: "10px 4px 0", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>“{j.description}”</p>}
        {j.status === "Rescheduled" && j.reschedule_reason && <p style={{ margin: "10px 0 0", padding: "10px 12px", borderRadius: 12, background: "var(--error)", color: "var(--error-text)", fontSize: 12.5, fontWeight: 600 }}>Needs a new slot: {j.reschedule_reason}</p>}

        <h3 style={sectionH}>Customer</h3>
        <div style={{ ...card, padding: 14 }}>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{j.customer_name}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-soft)", display: "flex", gap: 6, lineHeight: 1.5 }}><PinIcon s={15} c="var(--ink-mute)" />{j.address}</p>
          {j.customer_phone && j.tech_id && (
            <a href={tel(j.customer_phone)} style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--blue-tint)", color: "var(--blue)", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>
              <PhoneIcon s={15} c="var(--blue)" /> Call customer
            </a>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={sectionH}>Technician</h3>
          {tech && canAssign && !picking && (
            <button onClick={() => setPicking(true)} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Change</button>
          )}
        </div>
        {!picking && tech && (
          <div style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={tech.name} photo={tech.photo_url} />
            <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{tech.name}</p><p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>{tech.code} · {tech.phone}</p></div>
            {tech.phone && <a href={tel(tech.phone)} aria-label={`Call ${tech.name}`} style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}><PhoneIcon s={17} c="var(--blue)" /></a>}
          </div>
        )}
        {!picking && !tech && !canAssign && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>{verified ? "This job can't be assigned any more." : "You can assign jobs once Zavtoo verifies your shop."}</p>
        )}
        {picking && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {team.length === 0 && <Empty title="No technicians yet" body="Add the people who go on visits for you." action={<PrimaryButton onClick={onAddTech} style={{ maxWidth: 220, margin: "0 auto" }}>Add technician</PrimaryButton>} />}
            {team.map((t) => {
              const ok = canWork(t);
              return (
                <button key={t.id} disabled={!ok || !!busy} onClick={async () => { setBusy(t.id); if (await onAssign(t.id)) setPicking(false); setBusy(null); }} className="press" style={{
                  ...card, display: "flex", alignItems: "center", gap: 12, padding: 12, textAlign: "left",
                  border: t.id === j.tech_id ? "2px solid var(--blue)" : "2px solid transparent",
                  cursor: ok ? "pointer" : "not-allowed", opacity: ok ? 1 : 0.55,
                }}>
                  <Avatar name={t.name} photo={t.photo_url} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{t.name}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--ink-soft)" }}>
                      {t.kyc !== "Verified" ? "Waiting for Zavtoo KYC" : !t.active ? "Paused by Zavtoo" : t.status}
                    </span>
                  </span>
                  {ok && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--blue)" }}>{busy === t.id ? "…" : "Assign"}</span>}
                </button>
              );
            })}
            {tech && <button onClick={() => setPicking(false)} style={{ ...ghostBtn, marginTop: 4 }}>Keep {tech.name}</button>}
          </div>
        )}
        {tech && !isDone(j) && (
          <p style={{ margin: "12px 4px 0", fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.5 }}>{tech.name} updates the job from the Zavtoo Partner app, and you&apos;ll see each step here.</p>
        )}
      </div>
    </div>
  );
}

export function Avatar({ name, photo, size = 40 }: { name: string; photo?: string | null; size?: number }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,var(--teal-light),var(--cyan-dark))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700 }}>{initials}</span>
  );
}
