"use client";

import { useEffect, useState } from "react";
import { Toggle } from "../components/ui";
import type { AdminTech } from "../lib/adminData";
import { friendly, supabaseFor } from "../lib/supabase";
import { describeSchedule, type EarningSchedule, type PayBasis, type RateMode } from "../lib/techData";
import { Badge, Btn, Modal, Panel, SearchBox, Table, fieldLabel, input, muted } from "./kit";

/* ───────────────────────── Earning schedules ─────────────────────────
 * How technicians are paid: commission, salary or both; service and spare-part
 * commission as a % or a fixed ₹; travel per km. One schedule is the default and
 * any technician can be moved to another. Tables: earning_schedules,
 * tech_earning_plans (supabase/earning-schedules-migration.sql). */

type Notify = (msg: string, bad?: boolean) => void;
const sb = () => supabaseFor("admin");
const notSetUp = "Earning schedules aren't set up yet — run supabase/earning-schedules-migration.sql in Supabase first.";
const msgOf = (e: { message: string }) => /earning_schedules|tech_earning_plans/.test(e.message) ? notSetUp : friendly(e);

interface Plan { tech_id: string; schedule_id: string }

export function EarningSchedulesSection({ techs, notify }: { techs: AdminTech[]; notify: Notify }) {
  const [schedules, setSchedules] = useState<EarningSchedule[] | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<EarningSchedule | "new" | null>(null);
  const [q, setQ] = useState("");

  const reload = async () => {
    const [s, p] = await Promise.all([
      sb().from("earning_schedules").select("*").order("created_at"),
      sb().from("tech_earning_plans").select("tech_id, schedule_id"),
    ]);
    const e = s.error ?? p.error;
    if (e) { setErr(msgOf(e)); setSchedules([]); return; }
    setErr(null);
    setSchedules((s.data as EarningSchedule[]).map((x) => ({ ...x, km_rate: Number(x.km_rate) })));
    setPlans(p.data as Plan[]);
  };
  useEffect(() => { void reload(); }, []);

  if (!schedules) return <p style={muted}>Loading earning schedules…</p>;
  const def = schedules.find((s) => s.is_default);
  const scheduleOf = (techId: string) => schedules.find((s) => s.id === plans.find((p) => p.tech_id === techId)?.schedule_id) ?? def;
  const countOn = (s: EarningSchedule) => techs.filter((t) => scheduleOf(t.id)?.id === s.id).length;

  const assign = async (t: AdminTech, scheduleId: string) => {
    const { error } = scheduleId === def?.id
      ? await sb().from("tech_earning_plans").delete().eq("tech_id", t.id)
      : await sb().from("tech_earning_plans").upsert({ tech_id: t.id, schedule_id: scheduleId, updated_at: new Date().toISOString() });
    if (error) { notify(msgOf(error), true); return; }
    notify(`${t.name} is now on ${schedules.find((s) => s.id === scheduleId)?.name}`);
    void reload();
  };
  const makeDefault = async (s: EarningSchedule) => {
    const { error } = await sb().from("earning_schedules").update({ is_default: true }).eq("id", s.id);
    if (error) { notify(msgOf(error), true); return; }
    notify(`${s.name} is the default — technicians without their own schedule use it`);
    void reload();
  };
  const remove = async (s: EarningSchedule) => {
    if (s.is_default) { notify("Make another schedule the default before deleting this one.", true); return; }
    const n = countOn(s);
    if (!confirm(`Delete “${s.name}”?${n ? ` ${n} technician${n > 1 ? "s" : ""} on it will move to ${def?.name ?? "the default"}.` : ""}`)) return;
    const { error } = await sb().from("earning_schedules").delete().eq("id", s.id);
    if (error) { notify(msgOf(error), true); return; }
    notify(`${s.name} deleted`);
    void reload();
  };
  const shown = techs.filter((t) => !q.trim() || `${t.name} ${t.code} ${t.phone}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {err && <p role="alert" style={{ margin: 0, padding: "10px 14px", borderRadius: 12, background: "var(--warning)", color: "var(--warning-text)", fontSize: 13, fontWeight: 600 }}>{err}</p>}
      <p style={{ ...muted, margin: 0, lineHeight: 1.6, fontSize: 13 }}>
        Set how technicians earn. Commission is worked out on every completed job; travel uses the distance recorded when the technician starts the trip. Changes show in the technician app the next time it loads.
      </p>

      <Panel title="Schedules" actions={<Btn small disabled={!!err} onClick={() => setEditing("new")}>＋ New schedule</Btn>} pad={false}>
        <Table<EarningSchedule> rows={schedules} rowKey={(s) => s.id} empty="No schedules yet."
          cols={[
            { key: "name", head: "Name", render: (s) => <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><strong>{s.name}</strong>{s.is_default && <Badge tone="blue">Default</Badge>}</span> },
            { key: "basis", head: "Pay basis", render: (s) => <Badge tone={s.pay_basis === "Commission" ? "green" : s.pay_basis === "Salary" ? "purple" : "amber"}>{s.pay_basis}</Badge> },
            { key: "what", head: "Earns", render: (s) => <span style={{ ...muted, fontSize: 12.5 }}>{describeSchedule(s)}</span> },
            { key: "n", head: "Technicians", align: "right", render: (s) => countOn(s) },
            { key: "act", head: "", align: "right", render: (s) => (
              <span style={{ display: "inline-flex", gap: 6 }}>
                {!s.is_default && <Btn small kind="ghost" onClick={() => void makeDefault(s)}>Make default</Btn>}
                <Btn small kind="ghost" onClick={() => setEditing(s)}>Edit</Btn>
                {!s.is_default && <Btn small kind="danger" onClick={() => void remove(s)}>Delete</Btn>}
              </span>
            ) },
          ]} />
      </Panel>

      <Panel title="Technicians" actions={<SearchBox value={q} onChange={setQ} placeholder="Search technician…" />} pad={false}>
        <Table<AdminTech> rows={shown} rowKey={(t) => t.id} empty="No technicians yet."
          cols={[
            { key: "name", head: "Technician", render: (t) => <span><strong>{t.name}</strong><br /><span style={muted}>{t.code}{t.phone ? ` · ${t.phone}` : ""}</span></span> },
            { key: "sch", head: "Earning schedule", render: (t) => (
              <select value={scheduleOf(t.id)?.id ?? ""} disabled={!schedules.length} onChange={(e) => void assign(t, e.target.value)} aria-label={`Earning schedule for ${t.name}`} style={{ ...input, maxWidth: 280 }}>
                {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_default ? " (default)" : ""}</option>)}
              </select>
            ) },
            { key: "pay", head: "Pays", render: (t) => { const s = scheduleOf(t.id); return <span style={{ ...muted, fontSize: 12.5 }}>{s ? describeSchedule(s) : "—"}</span>; } },
          ]} />
      </Panel>

      {editing && <ScheduleModal schedule={editing === "new" ? null : editing} first={!schedules.length} onClose={() => setEditing(null)} notify={notify}
        onSaved={() => { setEditing(null); void reload(); }} />}
    </div>
  );
}

/* ─────── Create / edit a schedule ─────── */

const BASES: { id: PayBasis; hint: string }[] = [
  { id: "Commission", hint: "Paid per job only" },
  { id: "Salary", hint: "Fixed monthly salary, no commission" },
  { id: "Salary + Commission", hint: "Monthly salary plus commission per job" },
];

function ScheduleModal({ schedule, first, onClose, onSaved, notify }: { schedule: EarningSchedule | null; first: boolean; onClose: () => void; onSaved: () => void; notify: Notify }) {
  const [f, setF] = useState(() => ({
    name: schedule?.name ?? "", pay_basis: schedule?.pay_basis ?? ("Commission" as PayBasis), monthly_salary: String(schedule?.monthly_salary ?? ""),
    service_mode: schedule?.service_mode ?? ("Percent" as RateMode), service_value: String(schedule?.service_value ?? ""), free_job_fee: String(schedule?.free_job_fee ?? ""),
    parts_mode: schedule?.parts_mode ?? ("Percent" as RateMode), parts_value: String(schedule?.parts_value ?? ""),
    km_rate: String(schedule?.km_rate ?? ""), round_trip: schedule?.round_trip ?? true,
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, kind: "int" | "dec" | "text" = "text") => (e: { target: { value: string } }) => {
    setErr(null);
    const v = kind === "int" ? e.target.value.replace(/\D/g, "").slice(0, 8) : kind === "dec" ? e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 8) : e.target.value;
    setF({ ...f, [k]: v });
  };
  const salary = f.pay_basis !== "Commission";
  const commission = f.pay_basis !== "Salary";
  const num = (v: string) => Number(v || 0);

  const submit = async () => {
    if (f.name.trim().length < 2) return setErr("Give the schedule a name, e.g. “Senior technician” or “Salary + 5%”.");
    if (salary && !(num(f.monthly_salary) > 0)) return setErr("Enter the monthly salary.");
    if (f.service_mode === "Percent" && num(f.service_value) > 100) return setErr("Service commission can't be more than 100%.");
    if (f.parts_mode === "Percent" && num(f.parts_value) > 100) return setErr("Parts commission can't be more than 100%.");
    const row = {
      name: f.name.trim(), pay_basis: f.pay_basis, monthly_salary: salary ? Math.round(num(f.monthly_salary)) : 0,
      service_mode: f.service_mode, service_value: commission ? Math.round(num(f.service_value)) : 0, free_job_fee: commission ? Math.round(num(f.free_job_fee)) : 0,
      parts_mode: f.parts_mode, parts_value: commission ? Math.round(num(f.parts_value)) : 0,
      km_rate: Math.round(num(f.km_rate) * 100) / 100, round_trip: f.round_trip,
      ...(first && { is_default: true }),
    };
    setBusy(true);
    const { error } = schedule ? await sb().from("earning_schedules").update(row).eq("id", schedule.id) : await sb().from("earning_schedules").insert(row);
    setBusy(false);
    if (error) { setErr(msgOf(error)); return; }
    notify(schedule ? `${row.name} saved` : `${row.name} created — assign it to technicians below`);
    onSaved();
  };

  const rate = (label: string, mode: "service_mode" | "parts_mode", value: "service_value" | "parts_value", fixedHint: string) => (
    <div>
      <span style={fieldLabel}>{label}</span>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={f[mode]} onChange={(e) => setF({ ...f, [mode]: e.target.value as RateMode })} aria-label={`${label} type`} style={{ ...input, width: 150 }}>
          <option value="Percent">Percentage (%)</option>
          <option value="Fixed">Fixed amount (₹)</option>
        </select>
        <input value={f[value]} onChange={set(value, "int")} inputMode="numeric" placeholder="0" aria-label={`${label} value`} style={input} />
      </div>
      <small style={muted}>{f[mode] === "Percent" ? `${f[value] || 0}% of the ${mode === "service_mode" ? "visit charge" : "parts value"}` : fixedHint.replace("{v}", f[value] || "0")}</small>
    </div>
  );

  return (
    <Modal title={schedule ? `Edit ${schedule.name}` : "New earning schedule"} onClose={onClose} wide
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn disabled={busy} onClick={() => void submit()}>{busy ? "Saving…" : schedule ? "Save schedule" : "Create schedule"}</Btn></>}>
      <label><span style={fieldLabel}>Schedule name</span><input value={f.name} onChange={set("name")} maxLength={60} placeholder="e.g. Senior technician" style={input} autoFocus /></label>

      <span style={{ ...fieldLabel, marginTop: 14 }}>Pay basis</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        {BASES.map((b) => {
          const on = f.pay_basis === b.id;
          return (
            <button key={b.id} type="button" onClick={() => setF({ ...f, pay_basis: b.id })} aria-pressed={on} style={{
              textAlign: "left", padding: "10px 12px", borderRadius: 12, cursor: "pointer",
              border: on ? "2px solid var(--blue)" : "1.5px solid var(--line-strong)", background: on ? "var(--blue-tint)" : "var(--surface)",
            }}><strong style={{ fontSize: 13.5, color: "var(--ink)" }}>{b.id}</strong><br /><span style={muted}>{b.hint}</span></button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 14 }}>
        {salary && <label><span style={fieldLabel}>Monthly salary (₹)</span><input value={f.monthly_salary} onChange={set("monthly_salary", "int")} inputMode="numeric" placeholder="e.g. 15000" style={input} /></label>}
        {commission && rate("Service commission", "service_mode", "service_value", "₹{v} for every completed job")}
        {commission && <label><span style={fieldLabel}>Free job fee (₹ per job)</span><input value={f.free_job_fee} onChange={set("free_job_fee", "int")} inputMode="numeric" placeholder="0" style={input} />
          <small style={muted}>For jobs with no visit charge — free installs and AMC visits</small></label>}
        {commission && rate("Spare parts commission", "parts_mode", "parts_value", "₹{v} for every part fitted")}
        <label><span style={fieldLabel}>Travel allowance (₹ per km)</span><input value={f.km_rate} onChange={set("km_rate", "dec")} inputMode="decimal" placeholder="e.g. 3.5" style={input} />
          <small style={muted}>Uses the distance to the customer recorded when the trip starts</small></label>
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600 }}>
          <Toggle on={f.round_trip} onChange={(v) => setF({ ...f, round_trip: v })} label="Pay travel both ways" />
          {f.round_trip ? "Pay both ways (there and back)" : "Pay one way only"}
        </span>
      </div>
      <p style={{ margin: "14px 0 0", padding: "10px 12px", borderRadius: 10, background: "var(--bg-secondary)", fontSize: 12.5, lineHeight: 1.5 }}>
        <strong>Example:</strong> a ₹299 repair, 10 km away, with one ₹450 part →{" "}
        {exampleText(f.pay_basis, f.service_mode, num(f.service_value), f.parts_mode, num(f.parts_value), num(f.km_rate), f.round_trip, num(f.monthly_salary))}
      </p>
      {err && <p role="alert" style={{ margin: "10px 0 0", color: "var(--error-text)", fontWeight: 600, fontSize: 13 }}>{err}</p>}
    </Modal>
  );
}

function exampleText(basis: PayBasis, sMode: RateMode, sVal: number, pMode: RateMode, pVal: number, km: number, both: boolean, salary: number) {
  const c = basis !== "Salary";
  const service = c ? (sMode === "Percent" ? (299 * sVal) / 100 : sVal) : 0;
  const parts = c ? (pMode === "Percent" ? (450 * pVal) / 100 : pVal) : 0;
  const travel = 10 * (both ? 2 : 1) * km;
  const total = Math.round(service + parts + travel);
  const bits = [c && `service ₹${Math.round(service)}`, c && `parts ₹${Math.round(parts)}`, km > 0 && `travel ₹${Math.round(travel)}`].filter(Boolean).join(" + ");
  return `${bits || "₹0"} = ₹${total} for the job${basis !== "Commission" ? `, plus ₹${salary.toLocaleString("en-IN")} salary a month` : ""}.`;
}
