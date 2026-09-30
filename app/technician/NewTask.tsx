"use client";

import { useState } from "react";
import { Footer, PageHeader, PrimaryButton, card, field, label, sectionTitle } from "../components/ui";
import { SERVICE_ICON } from "../components/ServicesHub";
import { PRODUCTS, SERVICE_CATALOG, TIME_SLOTS, inr, type ServiceType } from "../lib/data";
import type { OpsTask } from "../lib/bridge";
import { TODAY } from "../lib/techData";

/* A task the technician raises in the field — a neighbour who wants a
 * purifier checked, a follow-up visit, a lead for a new sale. They either do
 * it themselves or hand it to ops to schedule. */

export interface NewTask {
  customer: { name: string; phone: string; address: string };
  type: ServiceType;
  product: string;
  issue: string;
  date: string;
  slot: string;
}

export type TaskRoute = "self" | "ops";

const DAYS = [TODAY, "30 Sep 2026", "01 Oct 2026", "02 Oct 2026"];
const dayLabel = (d: string) => (d === TODAY ? "Today" : d === DAYS[1] ? "Tomorrow" : d.slice(0, 6));

export function NewTaskPage({ onBack, onSubmit }: { onBack: () => void; onSubmit: (t: NewTask, route: TaskRoute) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<ServiceType>("Repair");
  const [product, setProduct] = useState("");
  const [issue, setIssue] = useState("");
  const [date, setDate] = useState(TODAY);
  const [slot, setSlot] = useState("");
  const [route, setRoute] = useState<TaskRoute>("self");
  const [touched, setTouched] = useState(false);

  const errs = {
    name: name.trim().length < 2 ? "Enter the customer's name" : null,
    phone: !/^[6-9]\d{9}$/.test(phone) ? "Enter a 10-digit mobile number" : null,
    address: address.trim().length < 8 ? "Enter the full address" : null,
    product: !product ? "Pick the product" : null,
    // Ops can pick the slot themselves; you can't do a job without one.
    slot: route === "self" && !slot ? "Pick a time slot" : null,
  };
  const ok = Object.values(errs).every((e) => !e);
  const bad = (k: keyof typeof errs) => (touched && errs[k] ? { border: "1.5px solid var(--error-text)" } : {});
  const price = SERVICE_CATALOG.find((o) => o.type === type)!.price;

  const submit = () => {
    setTouched(true);
    if (!ok) return;
    onSubmit({
      customer: { name: name.trim(), phone: `+91${phone}`, address: address.trim() },
      type, product, issue: issue.trim() || "No details given.", date, slot: slot || "Any time",
    }, route);
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="New Task" onBack={onBack} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        <h3 style={{ ...sectionTitle, marginTop: 0 }}>Customer</h3>
        <label style={label} htmlFor="nt-name">Name</label>
        <input id="nt-name" value={name} onChange={(e) => setName(e.target.value)} style={{ ...field, ...bad("name") }} />
        <label style={{ ...label, marginTop: 12 }} htmlFor="nt-phone">Mobile number</label>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ ...field, width: "auto", color: "var(--ink-soft)" }}>+91</span>
          <input id="nt-phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} style={{ ...field, flex: 1, ...bad("phone") }} />
        </div>
        <label style={{ ...label, marginTop: 12 }} htmlFor="nt-addr">Address</label>
        <textarea id="nt-addr" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House no., society, sector, city" style={{ ...field, resize: "none", ...bad("address") }} />

        <h3 style={sectionTitle}>Service</h3>
        <div className="no-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -16px", padding: "2px 16px 4px" }}>
          {SERVICE_CATALOG.map((o) => {
            const on = o.type === type;
            const ic = SERVICE_ICON[o.type];
            return (
              <button key={o.type} onClick={() => setType(o.type)} aria-pressed={on} style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 14px 8px 10px", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, background: on ? "var(--blue)" : "var(--surface)", color: on ? "white" : "var(--text-secondary)",
                boxShadow: on ? "0 4px 12px rgba(11,92,255,0.28)" : "var(--shadow-card)",
              }}><ic.Icon s={16} c={on ? "white" : ic.fg} /> {o.type}</button>
            );
          })}
        </div>
        <p style={{ margin: "6px 2px 0", fontSize: 11.5, color: "var(--ink-mute)" }}>Customer pays {price ? inr(price) : "nothing"} for this service.</p>

        <label style={{ ...label, marginTop: 12 }} htmlFor="nt-product">Product</label>
        <select id="nt-product" value={product} onChange={(e) => setProduct(e.target.value)} style={{ ...field, color: product ? "var(--ink)" : "var(--ink-mute)", ...bad("product") }}>
          <option value="" disabled>Choose the purifier</option>
          {PRODUCTS.filter((p) => p.category !== "spare").map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          <option value="Other brand purifier">Other brand purifier</option>
        </select>

        <label style={{ ...label, marginTop: 12 }} htmlFor="nt-issue">What needs doing? <span style={{ fontWeight: 400, color: "var(--ink-mute)" }}>(optional)</span></label>
        <textarea id="nt-issue" rows={3} maxLength={300} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. Neighbour of SRV1041, water tastes salty, wants a check-up" style={{ ...field, resize: "none" }} />

        <h3 style={sectionTitle}>When</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {DAYS.map((d) => (
            <button key={d} onClick={() => setDate(d)} aria-pressed={date === d} style={chip(date === d)}>{dayLabel(d)}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {TIME_SLOTS.map((s) => (
            <button key={s} onClick={() => setSlot(slot === s ? "" : s)} aria-pressed={slot === s} style={{ ...chip(slot === s), flex: "0 0 auto", ...(touched && errs.slot ? { border: "1.5px solid var(--error-text)" } : {}) }}>{s}</button>
          ))}
        </div>

        <h3 style={sectionTitle}>Who does it?</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {([
            ["self", "🧰 Keep it with me", "Added to your jobs. You'll visit and close it yourself."],
            ["ops", "📤 Send to ops", "Ops confirms with the customer and assigns the best technician. Slot is optional."],
          ] as const).map(([id, t, d]) => (
            <button key={id} onClick={() => setRoute(id)} aria-pressed={route === id} style={{
              ...card, padding: 14, textAlign: "left", cursor: "pointer", display: "flex", gap: 12, alignItems: "center",
              border: route === id ? "2px solid var(--blue)" : "2px solid transparent",
            }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: route === id ? "6px solid var(--blue)" : "2px solid var(--line-strong)" }} />
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t}</span>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{d}</span>
              </span>
            </button>
          ))}
        </div>
        {touched && !ok && (
          <p role="alert" style={{ margin: "12px 2px 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>
            {Object.values(errs).find(Boolean)}
          </p>
        )}
        <div style={{ height: 12 }} />
      </div>
      <Footer>
        <PrimaryButton tone={route === "ops" ? "gold" : "blue"} onClick={submit}>{route === "self" ? "Add to My Jobs" : "Send to Ops"}</PrimaryButton>
      </Footer>
    </div>
  );
}

const chip = (on: boolean): React.CSSProperties => ({
  flex: 1, padding: "9px 10px", borderRadius: 12, cursor: "pointer", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
  background: on ? "var(--blue-tint)" : "var(--surface)", color: on ? "var(--blue)" : "var(--text-secondary)",
  border: on ? "1.5px solid var(--blue)" : "1.5px solid var(--line)",
});

/** The technician's own list of tasks handed to ops, with where each one stands. */
export function SentToOpsList({ tasks }: { tasks: OpsTask[] }) {
  if (!tasks.length) return null;
  const tone = (s: OpsTask["status"]) =>
    s === "Assigned" ? { bg: "var(--success)", fg: "var(--success-text)" } : s === "Cancelled" ? { bg: "var(--surface-dim)", fg: "var(--text-muted)" } : { bg: "var(--gold-tint)", fg: "var(--gold-dark)" };
  return (
    <>
      <h3 style={sectionTitle}>Sent to ops ({tasks.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tasks.map((t) => (
          <div key={t.id} style={{ ...card, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{t.type} · {t.customer.name}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: tone(t.status).bg, color: tone(t.status).fg, whiteSpace: "nowrap" }}>
                {t.status === "Assigned" ? `Assigned · ${t.assignedTo}` : t.status}
              </span>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>#{t.id} · {dayLabel(t.date)}, {t.slot} · raised {t.createdAt}</p>
          </div>
        ))}
      </div>
    </>
  );
}
