"use client";

import { useState } from "react";
import { StarIcon } from "../components/icons";
import TechAvatar from "../components/TechAvatar";
import { PIN_AREAS, inr, isPincode } from "../lib/data";
import type { AdminCustomer, AdminJob, AdminOrder, AdminTech, Dealer } from "../lib/adminData";
import { Badge, Btn, Filter, Initials, Modal, Panel, SearchBox, Table, fieldLabel, input, muted } from "./kit";
import { JOB_TONE, ORDER_TONE, isoDay } from "./Operations";

/** A strong random password people can still read out over the phone. */
export function makePassword() {
  const words = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const core = Array.from(bytes, (b) => words[b % words.length]).join("");
  return `${core.slice(0, 4)}-${core.slice(4, 8)}-${core.slice(8, 12)}`;
}

/* ───────────────────────── Customers ───────────────────────── */

type AmcFilter = "All" | "AMC active" | "AMC expiring" | "No AMC" | "Blocked";

export function CustomersSection({ customers, orders, jobs, onBlock, onCredit, onResetPassword }: {
  customers: AdminCustomer[]; orders: AdminOrder[]; jobs: AdminJob[];
  onBlock: (c: AdminCustomer, blocked: boolean) => Promise<void>; onCredit: (c: AdminCustomer, amount: number, reason: string) => Promise<boolean>;
  onResetPassword: (id: string, password: string) => Promise<boolean>;
}) {
  const [resetting, setResetting] = useState<AdminCustomer | null>(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState<AmcFilter>("All");
  const [open, setOpen] = useState<string | null>(null);

  const match = (c: AdminCustomer) =>
    f === "All" ? true : f === "Blocked" ? c.blocked : f === "AMC active" ? c.amc === "Active" : f === "AMC expiring" ? c.amc === "Expiring" : c.amc === "None";
  const rows = customers.filter((c) => match(c) && (!q.trim() || `${c.code} ${c.name} ${c.email} ${c.phone} ${c.city}`.toLowerCase().includes(q.trim().toLowerCase())));
  const cur = customers.find((c) => c.id === open);

  return (
    <Panel title={`Customers (${customers.length})`} pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search name, ID, email, phone" />}>
      <div style={{ padding: "12px 16px" }}>
        <Filter<AmcFilter> options={["All", "AMC active", "AMC expiring", "No AMC", "Blocked"]} value={f} onChange={setF} />
      </div>
      <Table rows={rows} rowKey={(c) => c.id} empty={customers.length ? "No customers match." : "No customers yet. They appear here when they sign up in the app."} cols={[
        { key: "n", head: "Customer", render: (c) => (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Initials name={c.name} />
            <div><b style={{ color: c.blocked ? "var(--ink-mute)" : "var(--ink)" }}>{c.name}</b><div style={muted}>{c.code} · {c.email}</div></div>
          </div>
        ) },
        { key: "p", head: "Phone", render: (c) => <span style={muted}>{c.phone || "—"}</span> },
        { key: "city", head: "Area", render: (c) => c.city },
        { key: "o", head: "Orders", align: "right", render: (c) => c.orders },
        { key: "s", head: "Spent", align: "right", render: (c) => inr(c.spent) },
        { key: "amc", head: "AMC", render: (c) => c.blocked ? <Badge tone="red">Blocked</Badge> : <Badge tone={c.amc === "Active" ? "green" : c.amc === "Expiring" ? "amber" : "grey"}>{c.amc}</Badge> },
        { key: "x", head: "", align: "right", render: (c) => <Btn small kind="ghost" onClick={() => setOpen(c.id)}>View</Btn> },
      ]} />

      {cur && <CustomerModal c={cur} orders={orders.filter((o) => o.customerId === cur.id)} jobs={jobs.filter((j) => j.customerId === cur.id)}
        onClose={() => setOpen(null)} onBlock={(b) => onBlock(cur, b)} onCredit={(n, r) => onCredit(cur, n, r)}
        onReset={() => { setResetting(cur); setOpen(null); }} />}
      {resetting && (
        <ResetPasswordModal who={{ name: resetting.name, email: resetting.email, code: resetting.code }} onClose={() => setResetting(null)}
          onReset={(p) => onResetPassword(resetting.id, p)} />
      )}
    </Panel>
  );
}

function CustomerModal({ c, orders, jobs, onClose, onBlock, onCredit, onReset }: {
  c: AdminCustomer; orders: AdminOrder[]; jobs: AdminJob[]; onClose: () => void;
  onBlock: (blocked: boolean) => Promise<void>; onCredit: (amount: number, reason: string) => Promise<boolean>; onReset: () => void;
}) {
  const [credit, setCredit] = useState("");
  const [reason, setReason] = useState("Goodwill credit");
  const [busy, setBusy] = useState(false);
  const n = Number(credit);
  const ok = Number.isInteger(n) && n > 0 && n <= 5000;

  return (
    <Modal title={c.name} onClose={onClose} footer={<>
      <Btn kind={c.blocked ? "primary" : "danger"} onClick={() => {
        if (c.blocked || confirm(`Block ${c.name}? They won't be able to place orders or book services.`)) void onBlock(!c.blocked);
      }}>
        {c.blocked ? "Unblock customer" : "Block customer"}
      </Btn>
      <Btn kind="ghost" onClick={onReset}>Reset password</Btn>
      <Btn kind="ghost" onClick={onClose}>Close</Btn>
    </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
        {[["Customer ID", c.code], ["Joined", c.joined], ["Email", c.email], ["Phone", c.phone || "—"], ["Lifetime spend", inr(c.spent)], ["Wallet", inr(c.wallet)]].map(([k, v]) => (
          <div key={k} style={{ minWidth: 0 }}><div style={muted}>{k}</div><b style={{ overflowWrap: "anywhere" }}>{v}</b></div>
        ))}
      </div>

      <p style={{ ...fieldLabel, marginTop: 16 }}>Orders</p>
      {orders.length ? orders.map((o) => (
        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
          <span>#{o.ref} · {o.items}</span><span style={{ display: "flex", gap: 8, alignItems: "center" }}>{inr(o.amount)} <Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge></span>
        </div>
      )) : <p style={muted}>No orders.</p>}

      <p style={{ ...fieldLabel, marginTop: 16 }}>Service jobs</p>
      {jobs.length ? jobs.map((j) => (
        <div key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
          <span>#{j.ref} · {j.type} · {j.isoDate === isoDay() ? "Today" : j.date}</span><Badge tone={JOB_TONE[j.status]}>{j.status}</Badge>
        </div>
      )) : <p style={muted}>No service jobs.</p>}

      <p style={{ ...fieldLabel, marginTop: 16 }}>Add wallet credit</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={credit} onChange={(e) => setCredit(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="₹ amount" aria-label="Credit amount" style={{ ...input, width: 110 }} />
        <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Credit reason" style={{ ...input, flex: 1 }}>
          {["Goodwill credit", "Late technician", "Refund adjustment", "Referral correction"].map((r) => <option key={r}>{r}</option>)}
        </select>
        <Btn disabled={!ok || busy} onClick={async () => { setBusy(true); if (await onCredit(n, reason)) setCredit(""); setBusy(false); }}>Credit</Btn>
      </div>
      <p style={{ ...muted, margin: "6px 0 0" }}>Max ₹5,000 per credit. The customer gets a notification.</p>
    </Modal>
  );
}

/* ───────────────────────── Technicians ───────────────────────── */

export interface NewTechnician {
  name: string; email: string; phone: string; password: string; dealerId: string | null;
  pincodes: string[]; skills: string[]; years: number; languages: string; verified: boolean;
}

export function TechniciansSection({ techs, jobs, dealers, onUpdate, onCreate, onResetPassword }: {
  techs: AdminTech[]; jobs: AdminJob[]; dealers: Dealer[];
  onUpdate: (t: AdminTech, patch: { kyc?: "Verified"; active?: boolean; dealerId?: string | null }) => Promise<void>;
  onCreate: (t: NewTechnician) => Promise<{ code: string } | null>;
  onResetPassword: (t: AdminTech, password: string) => Promise<boolean>;
}) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<AdminTech | null>(null);
  const rows = techs.filter((t) => !q.trim() || `${t.name} ${t.code} ${t.email} ${t.pincodes.join(" ")} ${t.skills.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase()));
  const today = (id: string) => jobs.filter((j) => j.techId === id && j.isoDate === isoDay() && j.status !== "Cancelled");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="admin-grid-4">
        {[["Online now", techs.filter((t) => t.active && t.status === "Online").length, "green"], ["On a job", techs.filter((t) => t.status === "On job").length, "blue"], ["Offline", techs.filter((t) => t.status === "Offline").length, "grey"], ["KYC pending", techs.filter((t) => t.kyc === "Pending").length, "purple"]].map(([l, v, tone]) => (
          <div key={l as string} style={{ background: "var(--surface)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{l}</span><Badge tone={tone as "green"}>{v}</Badge>
          </div>
        ))}
      </div>

      <Panel title={`Technicians (${techs.length})`} pad={false} actions={<>
        <SearchBox value={q} onChange={setQ} placeholder="Search name, ID, pincode, skill" />
        <Btn onClick={() => setAdding(true)}>+ Add technician</Btn>
      </>}>
        <Table rows={rows} rowKey={(t) => t.id} empty={techs.length ? "No technicians match." : "No technicians yet. Add one to give them a login."} cols={[
          { key: "n", head: "Technician", render: (t) => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TechAvatar id={t.id} name={t.name} size={34} photoUrl={t.photoUrl} />
              <div><b>{t.name}</b><div style={muted}>{t.code} · {t.email}</div></div>
            </div>
          ) },
          { key: "a", head: "Pincodes", render: (t) => t.pincodes.length
            ? <><b>{t.pincodes[0]}</b> <span style={muted}>primary</span><div style={muted}>{t.pincodes.length > 1 ? `+ ${t.pincodes.slice(1).join(", ")}` : ""}</div></>
            : <span style={muted}>Set at first login</span> },
          { key: "d", head: "Dealer", render: (t) => {
            const d = dealers.find((x) => x.id === t.dealerId);
            return d ? <>{d.name}<div style={muted}>{d.code}</div></> : <span style={muted}>—</span>;
          } },
          { key: "sk", head: "Skills", render: (t) => <span style={muted}>{t.skills.join(", ") || "—"}</span> },
          { key: "r", head: "Rating", render: (t) => t.rating ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 700 }}><StarIcon s={12} />{t.rating}</span> : <span style={muted}>New</span> },
          { key: "j", head: "Today", align: "right", render: (t) => `${today(t.id).length} jobs` },
          { key: "st", head: "Status", render: (t) => !t.active ? <Badge tone="grey">Inactive</Badge> : <Badge tone={t.status === "Online" ? "green" : t.status === "On job" ? "blue" : "grey"}>{t.status}</Badge> },
          { key: "k", head: "KYC", render: (t) => <Badge tone={t.kyc === "Verified" ? "green" : "purple"}>{t.kyc}</Badge> },
          { key: "x", head: "", align: "right", render: (t) => (
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              {t.kyc === "Pending" ? (
                <Btn small kind="gold" onClick={() => void onUpdate(t, { kyc: "Verified", active: true })}>Approve KYC</Btn>
              ) : (
                <Btn small kind={t.active ? "danger" : "primary"} onClick={() => {
                  if (!t.active || confirm(`Deactivate ${t.name}? They'll stop getting jobs and won't be shown to customers.`)) void onUpdate(t, { active: !t.active });
                }}>{t.active ? "Deactivate" : "Activate"}</Btn>
              )}
              <Btn small kind="ghost" onClick={() => setResetting(t)}>Reset password</Btn>
            </div>
          ) },
        ]} />
      </Panel>

      {adding && <TechnicianModal dealers={dealers} onClose={() => setAdding(false)} onCreate={onCreate} />}
      {resetting && <ResetPasswordModal who={{ name: resetting.name, email: resetting.email, code: resetting.code }} onClose={() => setResetting(null)} onReset={(p) => onResetPassword(resetting, p)} />}
    </div>
  );
}

function TechnicianModal({ dealers, onClose, onCreate }: { dealers: Dealer[]; onClose: () => void; onCreate: (t: NewTechnician) => Promise<{ code: string } | null> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(makePassword);
  const [dealerId, setDealerId] = useState(dealers.find((d) => d.active)?.id ?? "");
  const [pins, setPins] = useState("");
  const [skills, setSkills] = useState("Installation, Repair, Filter change");
  const [years, setYears] = useState("");
  const [languages, setLanguages] = useState("Hindi");
  const [verified, setVerified] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string } | null>(null);

  const pinList = Array.from(new Set(pins.split(/[\s,]+/).filter(Boolean)));
  const badPin = pinList.find((p) => !isPincode(p));
  const err = name.trim().length < 2 ? "Enter the technician's full name"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ? "Enter their email — it's their login ID"
    : !/^[6-9]\d{9}$/.test(phone) ? "Enter a 10-digit mobile number"
    : password.length < 8 ? "Password must be at least 8 characters"
    : badPin ? `${badPin} isn't a valid pincode`
    : null;

  const submit = async () => {
    setBusy(true);
    const res = await onCreate({
      name: name.trim(), email: email.trim().toLowerCase(), phone, password, dealerId: dealerId || null, pincodes: pinList,
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean), years: Number(years) || 0, languages: languages.trim(), verified,
    });
    setBusy(false);
    if (res) setDone(res);
  };

  if (done) {
    return (
      <Modal title="Technician created" onClose={onClose} footer={<Btn onClick={onClose}>Done</Btn>}>
        <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.6 }}>Share these login details with <b>{name}</b> privately. The password isn&apos;t shown again — use <i>Reset password</i> if it&apos;s lost.</p>
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, fontSize: 13.5, display: "grid", gap: 6 }}>
          <div>Technician ID: <b>{done.code}</b></div>
          <div>App: <b>{typeof window !== "undefined" ? `${window.location.origin}/technician` : "/technician"}</b></div>
          <div>Login email: <b>{email.trim().toLowerCase()}</b></div>
          <div>Password: <b style={{ fontFamily: "ui-monospace, monospace" }}>{password}</b></div>
        </div>
        <Btn kind="ghost" small onClick={() => navigator.clipboard?.writeText(`Zavtoo technician login\nApp: ${window.location.origin}/technician\nEmail: ${email.trim().toLowerCase()}\nPassword: ${password}`)}>Copy login details</Btn>
      </Modal>
    );
  }

  return (
    <Modal title="Add technician" onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!!err || busy} onClick={submit}>{busy ? "Creating…" : "Create login"}</Btn>
    </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Full name</span><input value={name} onChange={(e) => setName(e.target.value)} style={input} /></label>
        <label><span style={fieldLabel}>Login email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" style={input} /></label>
        <label><span style={fieldLabel}>Mobile</span><input value={phone} inputMode="numeric" onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} style={input} /></label>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Password</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...input, fontFamily: "ui-monospace, monospace" }} />
            <Btn kind="ghost" small onClick={() => setPassword(makePassword())}>New</Btn>
          </div>
        </label>
        <label><span style={fieldLabel}>Dealer</span>
          <select value={dealerId} onChange={(e) => setDealerId(e.target.value)} style={input}>
            <option value="">No dealer (Zavtoo)</option>
            {dealers.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.code}</option>)}
          </select>
        </label>
        <label><span style={fieldLabel}>Experience (years)</span><input value={years} inputMode="numeric" onChange={(e) => setYears(e.target.value.replace(/\D/g, "").slice(0, 2))} style={input} /></label>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Pincodes (optional — they can set these at first login)</span>
          <input value={pins} onChange={(e) => setPins(e.target.value)} placeholder="Primary first: 201309, 201301" style={input} /></label>
        <label><span style={fieldLabel}>Skills</span><input value={skills} onChange={(e) => setSkills(e.target.value)} style={input} /></label>
        <label><span style={fieldLabel}>Languages</span><input value={languages} onChange={(e) => setLanguages(e.target.value)} style={input} /></label>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13 }}>
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> KYC documents checked — can take jobs right away
      </label>
      {pinList.length > 0 && !badPin && <p style={{ ...muted, margin: "8px 0 0" }}>{pinList.map((p) => PIN_AREAS[p] ? `${p} (${PIN_AREAS[p]})` : p).join(" · ")}</p>}
      {err && (name || email || phone) ? <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p> : null}
    </Modal>
  );
}

function ResetPasswordModal({ who: tech, onClose, onReset }: { who: { name: string; email: string; code: string }; onClose: () => void; onReset: (p: string) => Promise<boolean> }) {
  const [password, setPassword] = useState(makePassword);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Modal title={`Reset password · ${tech.name}`} onClose={onClose} footer={done ? <Btn onClick={onClose}>Done</Btn> : <>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={password.length < 8 || busy} onClick={async () => { setBusy(true); setDone(await onReset(password)); setBusy(false); }}>{busy ? "Saving…" : "Set new password"}</Btn>
    </>}>
      {done ? (
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, fontSize: 13.5, display: "grid", gap: 6 }}>
          <div>Login email: <b>{tech.email}</b></div>
          <div>New password: <b style={{ fontFamily: "ui-monospace, monospace" }}>{password}</b></div>
          <div style={muted}>Their old password stops working now. Share the new one privately.</div>
        </div>
      ) : (
        <>
          <p style={{ margin: "0 0 10px", fontSize: 13 }}>Login: <b>{tech.email}</b> ({tech.code})</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={password} onChange={(e) => setPassword(e.target.value)} aria-label="New password" style={{ ...input, fontFamily: "ui-monospace, monospace" }} />
            <Btn kind="ghost" small onClick={() => setPassword(makePassword())}>New</Btn>
          </div>
          {password.length < 8 && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--error-text)" }}>At least 8 characters.</p>}
        </>
      )}
    </Modal>
  );
}

/* ───────────────────────── Dealers ───────────────────────── */

export interface NewDealer { name: string; owner: string; phone: string; city: string; pincodes: string[] }

export function DealersSection({ dealers, techs, onToggle, onCreate }: {
  dealers: Dealer[]; techs: AdminTech[]; onToggle: (d: Dealer) => Promise<void>; onCreate: (d: NewDealer) => Promise<{ code: string } | null>;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <Panel title={`Dealers (${dealers.length})`} pad={false} actions={<Btn onClick={() => setAdding(true)}>+ Add dealer</Btn>}>
      <Table rows={dealers} rowKey={(d) => d.id} empty="No dealers yet." cols={[
        { key: "n", head: "Dealer", render: (d) => <><b style={{ color: d.active ? "var(--ink)" : "var(--ink-mute)" }}>{d.name}</b><div style={muted}>{d.code}</div></> },
        { key: "o", head: "Owner", render: (d) => <>{d.owner}<div style={muted}>{d.phone}</div></> },
        { key: "c", head: "City", render: (d) => d.city },
        { key: "p", head: "Pincodes", render: (d) => <span style={muted}>{d.pincodes.join(", ")}</span> },
        { key: "t", head: "Technicians", render: (d) => {
          const mine = techs.filter((t) => t.dealerId === d.id);
          return mine.length ? <>{mine.length}<div style={muted}>{mine.map((t) => t.code).join(", ")}</div></> : <span style={muted}>None yet</span>;
        } },
        { key: "s", head: "Since", render: (d) => <span style={muted}>{d.since}</span> },
        { key: "a", head: "Status", render: (d) => <Badge tone={d.active ? "green" : "grey"}>{d.active ? "Active" : "Paused"}</Badge> },
        { key: "x", head: "", align: "right", render: (d) => (
          <Btn small kind={d.active ? "danger" : "primary"} onClick={() => void onToggle(d)}>{d.active ? "Pause" : "Activate"}</Btn>
        ) },
      ]} />
      {adding && <DealerModal onClose={() => setAdding(false)} onSave={async (d) => { if (await onCreate(d)) setAdding(false); }} />}
    </Panel>
  );
}

function DealerModal({ onClose, onSave }: { onClose: () => void; onSave: (d: NewDealer) => Promise<void> }) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [pins, setPins] = useState("");
  const [busy, setBusy] = useState(false);
  const pinList = pins.split(/[\s,]+/).filter(Boolean);
  const badPin = pinList.find((p) => !isPincode(p));
  const err = name.trim().length < 3 ? "Enter the dealer's business name"
    : owner.trim().length < 2 ? "Enter the owner's name"
    : !/^[6-9]\d{9}$/.test(phone) ? "Enter a 10-digit mobile number"
    : !city.trim() ? "Enter the city"
    : !pinList.length ? "Add at least one pincode"
    : badPin ? `${badPin} isn't a valid pincode`
    : null;

  return (
    <Modal title="Add dealer" onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!!err || busy} onClick={async () => {
        setBusy(true);
        await onSave({ name: name.trim(), owner: owner.trim(), phone: `+91${phone}`, city: city.trim(), pincodes: Array.from(new Set(pinList)) });
        setBusy(false);
      }}>{busy ? "Creating…" : "Create dealer"}</Btn>
    </>}>
      <p style={{ margin: "0 0 12px", fontSize: 13 }}>The dealer gets the next unique <b>DLR-</b> ID automatically.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Business name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="AquaCare Faridabad" style={input} /></label>
        <label><span style={fieldLabel}>Owner</span><input value={owner} onChange={(e) => setOwner(e.target.value)} style={input} /></label>
        <label><span style={fieldLabel}>Mobile</span><input value={phone} inputMode="numeric" onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} style={input} /></label>
        <label><span style={fieldLabel}>City</span><input value={city} onChange={(e) => setCity(e.target.value)} style={input} /></label>
        <label><span style={fieldLabel}>Pincodes covered</span><input value={pins} onChange={(e) => setPins(e.target.value)} placeholder="121001, 121002" style={input} /></label>
      </div>
      {pinList.length > 0 && !badPin && <p style={{ ...muted, margin: "8px 0 0" }}>{pinList.map((p) => PIN_AREAS[p] ? `${p} (${PIN_AREAS[p]})` : p).join(" · ")}</p>}
      {err && (name || owner || phone || city || pins) ? <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p> : null}
    </Modal>
  );
}
