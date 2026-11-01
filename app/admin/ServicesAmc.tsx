"use client";

import { useState } from "react";
import { Toggle } from "../components/ui";
import { SERVICE_CATALOG, inr, type ServiceOffering } from "../lib/data";
import type { AmcPlan } from "../lib/adminData";
import { Badge, Btn, Modal, Panel, Table, fieldLabel, input, muted } from "./kit";

/* Service prices and details (service_catalog) and the AMC plans shown on the
 * website and in the app (amc_plans). */

export interface ServiceEdit { tagline: string; price: number; price_note: string; duration: string; includes: string[]; active: boolean }
export type AmcDraft = Omit<AmcPlan, "id">;

export function ServicesAmcSection({ plans, onSaveService, onSavePlan, onDeletePlan }: {
  plans: AmcPlan[];
  onSaveService: (type: string, patch: Partial<ServiceEdit>) => Promise<boolean>;
  onSavePlan: (d: AmcDraft, id?: string) => Promise<boolean>;
  onDeletePlan: (p: AmcPlan) => Promise<boolean>;
}) {
  const [svc, setSvc] = useState<ServiceOffering | null>(null);
  const [plan, setPlan] = useState<AmcPlan | "new" | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel title={`AMC plans (${plans.length})`} pad={false} actions={<Btn onClick={() => setPlan("new")}>+ Add plan</Btn>}>
        <Table rows={plans} rowKey={(p) => p.id} empty="No AMC plans yet — run supabase/partner-upgrade-migration.sql, then add plans here." cols={[
          { key: "n", head: "Plan", render: (p) => <><b style={{ color: p.active ? "var(--ink)" : "var(--ink-mute)" }}>{p.icon} {p.name}</b>{p.best && <div style={{ marginTop: 3 }}><Badge tone="amber">Best value</Badge></div>}</> },
          { key: "p", head: "Price / year", align: "right", render: (p) => <b>{inr(p.price)}</b> },
          { key: "f", head: "What's included", render: (p) => <span style={muted}>{p.features.join(" · ")}</span> },
          { key: "a", head: "Shown", render: (p) => <Toggle on={p.active} label={`Show ${p.name}`} onChange={(v) => void onSavePlan({ ...p, active: v }, p.id)} /> },
          { key: "x", head: "", align: "right", render: (p) => (
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <Btn small kind="ghost" onClick={() => setPlan(p)}>Edit</Btn>
              <Btn small kind="danger" onClick={() => { if (confirm(`Delete ${p.name}?`)) void onDeletePlan(p); }}>Delete</Btn>
            </div>
          ) },
        ]} />
      </Panel>

      <Panel title={`Services (${SERVICE_CATALOG.length})`} pad={false}>
        <Table rows={SERVICE_CATALOG} rowKey={(s) => s.type} empty="Loading services…" cols={[
          { key: "t", head: "Service", render: (s) => <><b style={{ color: s.active === false ? "var(--ink-mute)" : "var(--ink)" }}>{s.type}</b><div style={{ ...muted, maxWidth: 320 }}>{s.tagline}</div></> },
          { key: "p", head: "Price", align: "right", render: (s) => <><b>{s.price ? inr(s.price) : "Free"}</b>{s.priceNote && <div style={muted}>{s.priceNote}</div>}</> },
          { key: "d", head: "Duration", render: (s) => <span style={muted}>{s.duration || "—"}</span> },
          { key: "i", head: "Includes", render: (s) => <span style={muted}>{s.includes.length} items</span> },
          { key: "a", head: "Bookable", render: (s) => <Toggle on={s.active !== false} label={`Allow booking ${s.type}`} onChange={(v) => void onSaveService(s.type, { active: v })} /> },
          { key: "x", head: "", align: "right", render: (s) => <Btn small kind="ghost" onClick={() => setSvc(s)}>Edit</Btn> },
        ]} />
      </Panel>

      {svc && <ServiceModal s={svc} onClose={() => setSvc(null)} onSave={async (patch) => { if (await onSaveService(svc.type, patch)) setSvc(null); }} />}
      {plan && <PlanModal p={plan === "new" ? null : plan} nextSort={Math.max(0, ...plans.map((p) => p.sort)) + 1} onClose={() => setPlan(null)}
        onSave={async (d) => { if (await onSavePlan(d, plan === "new" ? undefined : plan.id)) setPlan(null); }} />}
    </div>
  );
}

const lines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

function ServiceModal({ s, onClose, onSave }: { s: ServiceOffering; onClose: () => void; onSave: (p: ServiceEdit) => Promise<void> }) {
  const [tagline, setTagline] = useState(s.tagline);
  const [price, setPrice] = useState(String(s.price));
  const [note, setNote] = useState(s.priceNote);
  const [duration, setDuration] = useState(s.duration);
  const [includes, setIncludes] = useState(s.includes.join("\n"));
  const [busy, setBusy] = useState(false);
  const err = price === "" ? "Enter a price (0 = free)" : tagline.trim().length < 5 ? "Add a short tagline" : null;
  return (
    <Modal title={`Edit ${s.type}`} onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!!err || busy} onClick={async () => {
        setBusy(true);
        await onSave({ tagline: tagline.trim(), price: Number(price), price_note: note.trim(), duration: duration.trim(), includes: lines(includes), active: s.active !== false });
        setBusy(false);
      }}>{busy ? "Saving…" : "Save service"}</Btn>
    </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Tagline</span><input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={140} style={input} /></label>
        <label><span style={fieldLabel}>Price (₹, 0 = free)</span><input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" style={input} /></label>
        <label><span style={fieldLabel}>Duration</span><input value={duration} onChange={(e) => setDuration(e.target.value)} maxLength={40} placeholder="e.g. 45–60 min" style={input} /></label>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Price note</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="e.g. visit charge · parts extra" style={input} /></label>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>What's included (one per line)</span>
          <textarea value={includes} onChange={(e) => setIncludes(e.target.value)} rows={6} style={{ ...input, resize: "vertical", fontFamily: "inherit" }} /></label>
      </div>
      {err && (tagline || price) && <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
    </Modal>
  );
}

function PlanModal({ p, nextSort, onClose, onSave }: { p: AmcPlan | null; nextSort: number; onClose: () => void; onSave: (d: AmcDraft) => Promise<void> }) {
  const [name, setName] = useState(p?.name ?? "");
  const [icon, setIcon] = useState(p?.icon ?? "⭐");
  const [price, setPrice] = useState(p ? String(p.price) : "");
  const [best, setBest] = useState(p?.best ?? false);
  const [features, setFeatures] = useState(p?.features.join("\n") ?? "");
  const [busy, setBusy] = useState(false);
  const err = name.trim().length < 3 ? "Enter the plan name" : !price ? "Enter the yearly price" : lines(features).length === 0 ? "Add at least one feature" : null;
  return (
    <Modal title={p ? `Edit ${p.name}` : "Add AMC plan"} onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!!err || busy} onClick={async () => {
        setBusy(true);
        await onSave({ name: name.trim(), icon: icon.trim(), price: Number(price), best, features: lines(features), active: p?.active ?? true, sort: p?.sort ?? nextSort });
        setBusy(false);
      }}>{busy ? "Saving…" : p ? "Save plan" : "Add plan"}</Btn>
    </>}>
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 12 }}>
        <label><span style={fieldLabel}>Icon</span><input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} style={{ ...input, textAlign: "center" }} /></label>
        <label><span style={fieldLabel}>Plan name</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Gold Plan" style={input} /></label>
        <label><span style={fieldLabel}>Price per year (₹)</span><input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" style={input} /></label>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Features (one per line)</span>
          <textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={6} placeholder={"4 Service Visits\nFree Filters Included"} style={{ ...input, resize: "vertical", fontFamily: "inherit" }} /></label>
        <label style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" checked={best} onChange={(e) => setBest(e.target.checked)} /> Show the “Best value” badge on this plan</label>
      </div>
      {err && (name || price) && <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
    </Modal>
  );
}
