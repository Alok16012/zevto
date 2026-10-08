"use client";

import { useState } from "react";
import { BagIcon, BoxIcon, CalendarIcon, ChevronRight, ClockIcon, PhoneIcon, PinIcon, PlusIcon, StarIcon, WalletIcon, WrenchIcon } from "../icons";
import { BrandMark } from "../Brand";
import { Footer, PageHeader, PrimaryButton, card } from "../ui";
import { Badge, Chips, Empty, JOB_TONE, ORDER_TONE, Row, ghostBtn, sectionH } from "./kit";
import { inr } from "../../lib/data";
import { LOW_STOCK, PLATFORM_FEE, net, type DealerOrder, type DealerOrderStatus, type DealerState, type Job, type JobStatus, type Technician } from "../../lib/dealer";

const tel = (p: string) => `tel:+91${p.replace(/\D/g, "").slice(-10)}`;

/* ───────────────────────── Dashboard ───────────────────────── */

export function DealerHome({ state, onOrders, onJobs, onListings, onAddListing, onOpenOrder, onOpenJob, onPayouts }: {
  state: DealerState; onOrders: () => void; onJobs: () => void; onListings: () => void; onAddListing: () => void;
  onOpenOrder: (id: string) => void; onOpenJob: (id: string) => void; onPayouts: () => void;
}) {
  const { profile, orders, jobs, listings } = state;
  const delivered = orders.filter((o) => o.status === "Delivered");
  const sales = delivered.reduce((s, o) => s + o.amount, 0);
  const jobIncome = jobs.filter((j) => j.status === "Completed").reduce((s, j) => s + j.amount, 0);
  const earned = net(sales + jobIncome);
  const paidOut = state.payouts.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  const newOrders = orders.filter((o) => o.status === "New");
  const openJobs = jobs.filter((j) => j.status !== "Completed");
  const lowStock = listings.filter((l) => l.active && l.stock <= LOW_STOCK);
  const live = listings.filter((l) => l.active && l.stock > 0).length;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 16px 14px" }}>
        <BrandMark size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>{greet},</p>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.shopName}</p>
        </div>
        <Badge tone={profile.kyc === "Verified" ? "green" : "amber"}>{profile.kyc === "Verified" ? "✓ Verified" : "KYC pending"}</Badge>
      </div>

      {/* Earnings hero */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ borderRadius: 22, padding: 18, background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", color: "white", boxShadow: "0 10px 28px rgba(11,92,255,0.28)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Your earnings (after {Math.round(PLATFORM_FEE * 100)}% fee)</p>
              <p style={{ margin: "2px 0 0", fontSize: 28, fontWeight: 800 }}>{inr(earned)}</p>
            </div>
            <span style={{ background: "var(--gold)", color: "var(--blue-dark)", fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>{profile.tier.toUpperCase()} DEALER</span>
          </div>
          <div style={{ display: "flex", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.18)" }}>
            {[[inr(sales), "Product sales"], [inr(jobIncome), "Service income"], [inr(paidOut), "Paid out"]].map(([v, l], i) => (
              <div key={l} style={{ flex: 1, paddingLeft: i ? 10 : 0, borderLeft: i ? "1px solid rgba(255,255,255,0.18)" : "none" }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{v}</p>
                <p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.7)" }}>{l}</p>
              </div>
            ))}
          </div>
          <button onClick={onPayouts} style={{ marginTop: 12, background: "rgba(255,255,255,0.14)", border: "none", color: "white", borderRadius: 10, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <WalletIcon s={15} c="white" /> View payouts
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ padding: "14px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Tile Icon={BagIcon} tint="var(--purple-tint)" c="var(--purple)" value={newOrders.length} label="New orders" onClick={onOrders} />
        <Tile Icon={WrenchIcon} tint="var(--orange-bg)" c="var(--orange)" value={openJobs.length} label="Open service jobs" onClick={onJobs} />
        <Tile Icon={BoxIcon} tint="var(--teal-bg)" c="var(--teal-text)" value={live} label="Live listings" onClick={onListings} />
        <Tile Icon={StarIcon} tint="var(--gold-tint)" c="var(--gold-dark)" value={profile.rating ? profile.rating.toFixed(1) : "—"} label="Shop rating" />
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

      {/* Quick actions */}
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

      <SectionHead title="Open service jobs" onAll={onJobs} />
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {openJobs.length === 0
          ? <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", padding: "4px 2px" }}>No open jobs.</p>
          : openJobs.slice(0, 3).map((j) => <JobCard key={j.id} job={j} tech={state.team.find((t) => t.id === j.techId)} onOpen={() => onOpenJob(j.id)} />)}
      </div>
    </div>
  );
}

function Tile({ Icon, tint, c, value, label, onClick }: {
  Icon: (p: { s?: number; c?: string }) => React.ReactElement; tint: string; c: string; value: React.ReactNode; label: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} disabled={!onClick} className="press" style={{ ...card, border: "none", padding: 14, textAlign: "left", cursor: onClick ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 8 }}>
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

function OrderCard({ order: o, onOpen }: { order: DealerOrder; onOpen: () => void }) {
  const units = o.items.reduce((s, i) => s + i.qty, 0);
  return (
    <button onClick={onOpen} className="press" style={{ ...card, width: "100%", border: "none", padding: 14, cursor: "pointer", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)" }}>#{o.id}</span>
        <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>· {o.date}</span>
        <div style={{ flex: 1 }} />
        <Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge>
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{o.items[0].name}{o.items.length > 1 && ` + ${o.items.length - 1} more`}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{o.customer} · {units} unit{units > 1 ? "s" : ""} · {o.pay}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{inr(o.amount)}</span>
      </div>
    </button>
  );
}

type OrderFilter = "open" | DealerOrderStatus | "all";

export function DealerOrdersScreen({ orders, onOpen }: { orders: DealerOrder[]; onOpen: (id: string) => void }) {
  const [f, setF] = useState<OrderFilter>("open");
  const count = (s: DealerOrderStatus) => orders.filter((o) => o.status === s).length;
  const rows = orders.filter((o) =>
    f === "all" || (f === "open" ? ["New", "Accepted", "Shipped"].includes(o.status) : o.status === f));

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
          {orders.length === 0 && <Empty title="No orders yet" body="When customers in your service area buy one of your live listings, the order lands here." />}
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

export function DealerOrderDetail({ order: o, onBack, onStatus }: { order: DealerOrder; onBack: () => void; onStatus: (s: DealerOrderStatus) => void }) {
  const step = ORDER_FLOW.indexOf(o.status);
  const next = NEXT_ACTION[o.status];
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title={`Order #${o.id}`} onBack={onBack} right={<Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge>} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        {o.status !== "Rejected" && (
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

        <h3 style={sectionH}>Customer</h3>
        <div style={{ ...card, padding: 14 }}>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{o.customer}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-soft)", display: "flex", gap: 6, lineHeight: 1.5 }}><PinIcon s={15} c="var(--ink-mute)" />{o.address}</p>
          <a href={tel(o.phone)} style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--blue-tint)", color: "var(--blue)", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>
            <PhoneIcon s={15} c="var(--blue)" /> Call customer
          </a>
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
          <Row k="Order total" v={inr(o.amount)} />
          <Row k="Paid via" v={o.pay === "COD" ? "Cash on delivery — collect at door" : "Online (prepaid)"} />
          <Row k={`Zavtoo fee (${Math.round(PLATFORM_FEE * 100)}%)`} v={"− " + inr(o.amount - net(o.amount))} />
          <div style={{ borderTop: "1px dashed var(--line-strong)" }}><Row k="You receive" v={<span style={{ color: "var(--success-text)" }}>{inr(net(o.amount))}</span>} strong /></div>
        </div>
      </div>

      {next && (
        <Footer>
          <div style={{ display: "flex", gap: 10 }}>
            {o.status === "New" && <button onClick={() => onStatus("Rejected")} style={{ ...ghostBtn, color: "var(--red)" }}>Reject</button>}
            <PrimaryButton onClick={() => onStatus(next[0])} style={{ flex: 2 }}>{next[1]}</PrimaryButton>
          </div>
        </Footer>
      )}
    </div>
  );
}

/* ───────────────────────── Service jobs ───────────────────────── */

function JobCard({ job: j, tech, onOpen }: { job: Job; tech?: Technician; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="press" style={{ ...card, width: "100%", border: "none", padding: 14, cursor: "pointer", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{j.type}</span>
        <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>#{j.id}</span>
        <div style={{ flex: 1 }} />
        <Badge tone={JOB_TONE[j.status]}>{j.status}</Badge>
      </div>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink)" }}>{j.customer} · {j.product}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6, fontSize: 12, color: "var(--ink-soft)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CalendarIcon s={14} c="var(--ink-mute)" />{j.date}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ClockIcon s={14} c="var(--ink-mute)" />{j.slot}</span>
        <span>{tech ? `👷 ${tech.name}` : "Not assigned"}</span>
      </div>
    </button>
  );
}

type JobFilter = "open" | JobStatus | "all";

export function JobsScreen({ jobs, team, onOpen }: { jobs: Job[]; team: Technician[]; onOpen: (id: string) => void }) {
  const [f, setF] = useState<JobFilter>("open");
  const count = (s: JobStatus) => jobs.filter((j) => j.status === s).length;
  const rows = jobs.filter((j) => f === "all" || (f === "open" ? j.status !== "Completed" : j.status === f));
  return (
    <div>
      <PageHeader title="Service Jobs" />
      <div style={{ padding: "0 16px 24px" }}>
        <Chips<JobFilter> value={f} onChange={setF} items={[
          { id: "open", label: "Open", count: jobs.length - count("Completed") },
          { id: "New", label: "Unassigned", count: count("New") },
          { id: "In Progress", label: "In progress", count: count("In Progress") },
          { id: "Completed", label: "Completed", count: count("Completed") },
          { id: "all", label: "All", count: jobs.length },
        ]} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {jobs.length === 0 && <Empty title="No service jobs yet" body="Installation, repair and AMC requests from customers in your pincodes will show up here." />}
          {jobs.length > 0 && rows.length === 0 && <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, padding: "30px 0" }}>Nothing here.</p>}
          {rows.map((j) => <JobCard key={j.id} job={j} tech={team.find((t) => t.id === j.techId)} onOpen={() => onOpen(j.id)} />)}
        </div>
      </div>
    </div>
  );
}

export function JobDetail({ job: j, team, load, onBack, onAssign, onStatus, onAddTech }: {
  job: Job; team: Technician[]; load: Record<string, number>; onBack: () => void;
  onAssign: (techId: string) => void; onStatus: (s: JobStatus) => void; onAddTech: () => void;
}) {
  const tech = team.find((t) => t.id === j.techId);
  const [picking, setPicking] = useState(!tech && j.status === "New");
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title={`${j.type} #${j.id}`} onBack={onBack} right={<Badge tone={JOB_TONE[j.status]}>{j.status}</Badge>} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        <div style={{ ...card, padding: "6px 14px" }}>
          <Row k="Product" v={j.product} />
          <Row k="Visit" v={`${j.date}, ${j.slot}`} />
          <Row k="Charge" v={j.amount ? inr(j.amount) : "Free (with purchase)"} />
          {j.amount > 0 && <Row k="You receive" v={<span style={{ color: "var(--success-text)" }}>{inr(net(j.amount))}</span>} />}
        </div>
        {j.note && <p style={{ margin: "10px 4px 0", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>“{j.note}”</p>}

        <h3 style={sectionH}>Customer</h3>
        <div style={{ ...card, padding: 14 }}>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{j.customer}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-soft)", display: "flex", gap: 6, lineHeight: 1.5 }}><PinIcon s={15} c="var(--ink-mute)" />{j.address}</p>
          <a href={tel(j.phone)} style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--blue-tint)", color: "var(--blue)", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>
            <PhoneIcon s={15} c="var(--blue)" /> Call customer
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={sectionH}>Technician</h3>
          {tech && j.status !== "Completed" && !picking && (
            <button onClick={() => setPicking(true)} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Change</button>
          )}
        </div>
        {!picking && tech && (
          <div style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={tech.name} />
            <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{tech.name}</p><p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>+91 {tech.phone}</p></div>
            <a href={tel(tech.phone)} aria-label={`Call ${tech.name}`} style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}><PhoneIcon s={17} c="var(--blue)" /></a>
          </div>
        )}
        {picking && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {team.length === 0 && <Empty title="No technicians yet" body="Add the people who go on visits for you." action={<PrimaryButton onClick={onAddTech} style={{ maxWidth: 220, margin: "0 auto" }}>Add technician</PrimaryButton>} />}
            {team.map((t) => (
              <button key={t.id} disabled={!t.available} onClick={() => { onAssign(t.id); setPicking(false); }} className="press" style={{
                ...card, display: "flex", alignItems: "center", gap: 12, padding: 12, textAlign: "left",
                border: t.id === j.techId ? "2px solid var(--blue)" : "2px solid transparent",
                cursor: t.available ? "pointer" : "not-allowed", opacity: t.available ? 1 : 0.55,
              }}>
                <Avatar name={t.name} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{t.name}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--ink-soft)" }}>
                    {t.available ? "Available" : "Off duty"} · {load[t.id] ?? 0} open job{(load[t.id] ?? 0) === 1 ? "" : "s"}
                  </span>
                </span>
                {t.available && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--blue)" }}>Assign</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {!picking && j.status !== "Completed" && j.status !== "New" && (
        <Footer>
          <PrimaryButton onClick={() => onStatus(j.status === "Assigned" ? "In Progress" : "Completed")}>
            {j.status === "Assigned" ? "Start job" : "Mark job completed"}
          </PrimaryButton>
        </Footer>
      )}
    </div>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,var(--teal-light),var(--cyan-dark))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700 }}>{initials}</span>
  );
}
