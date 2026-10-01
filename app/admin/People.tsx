"use client";

import { useState } from "react";
import { StarIcon } from "../components/icons";
import TechAvatar from "../components/TechAvatar";
import { useBridge } from "../lib/bridge";
import { PIN_AREAS, inr, isPincode, makeId, servicePincodes } from "../lib/data";
import { TODAY, type Dealer, type AdminCustomer, type AdminJob, type AdminOrder, type AdminTech } from "../lib/adminData";
import { Badge, Btn, Filter, Initials, Modal, Panel, SearchBox, Table, fieldLabel, input, muted } from "./kit";
import { JOB_TONE, ORDER_TONE } from "./Operations";

/* ───────────────────────── Customers ───────────────────────── */

type AmcFilter = "All" | "AMC active" | "AMC expiring" | "No AMC" | "Blocked";

export function CustomersSection({ customers, orders, jobs, onUpdate, notify }: {
  customers: AdminCustomer[]; orders: AdminOrder[]; jobs: AdminJob[];
  onUpdate: (id: string, patch: Partial<AdminCustomer>) => void; notify: (m: string) => void;
}) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<AmcFilter>("All");
  const [open, setOpen] = useState<string | null>(null);

  const match = (c: AdminCustomer) =>
    f === "All" ? true : f === "Blocked" ? c.blocked : f === "AMC active" ? c.amc === "Active" : f === "AMC expiring" ? c.amc === "Expiring" : c.amc === "None";
  const rows = customers.filter((c) => match(c) && (!q.trim() || `${c.id} ${c.name} ${c.email} ${c.phone} ${c.city}`.toLowerCase().includes(q.trim().toLowerCase())));
  const cur = customers.find((c) => c.id === open);

  return (
    <Panel title={`Customers (${customers.length})`} pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search name, email, phone" />}>
      <div style={{ padding: "12px 16px" }}>
        <Filter<AmcFilter> options={["All", "AMC active", "AMC expiring", "No AMC", "Blocked"]} value={f} onChange={setF} />
      </div>
      <Table rows={rows} rowKey={(c) => c.id} empty="No customers match." cols={[
        { key: "n", head: "Customer", render: (c) => (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Initials name={c.name} />
            <div><b style={{ color: c.blocked ? "var(--ink-mute)" : "var(--ink)" }}>{c.name}</b><div style={muted}>{c.id} · {c.email}</div></div>
          </div>
        ) },
        { key: "p", head: "Phone", render: (c) => <span style={muted}>{c.phone}</span> },
        { key: "city", head: "City", render: (c) => c.city },
        { key: "o", head: "Orders", align: "right", render: (c) => c.orders },
        { key: "s", head: "Spent", align: "right", render: (c) => inr(c.spent) },
        { key: "amc", head: "AMC", render: (c) => c.blocked ? <Badge tone="red">Blocked</Badge> : <Badge tone={c.amc === "Active" ? "green" : c.amc === "Expiring" ? "amber" : "grey"}>{c.amc}</Badge> },
        { key: "x", head: "", align: "right", render: (c) => <Btn small kind="ghost" onClick={() => setOpen(c.id)}>View</Btn> },
      ]} />

      {cur && <CustomerModal c={cur} orders={orders.filter((o) => o.customerId === cur.id)} jobs={jobs.filter((j) => j.customerId === cur.id)}
        onClose={() => setOpen(null)} onUpdate={(p) => onUpdate(cur.id, p)} notify={notify} />}
    </Panel>
  );
}

function CustomerModal({ c, orders, jobs, onClose, onUpdate, notify }: {
  c: AdminCustomer; orders: AdminOrder[]; jobs: AdminJob[]; onClose: () => void; onUpdate: (p: Partial<AdminCustomer>) => void; notify: (m: string) => void;
}) {
  const [credit, setCredit] = useState("");
  const [reason, setReason] = useState("Goodwill credit");
  const n = Number(credit);
  const ok = Number.isInteger(n) && n > 0 && n <= 5000;

  return (
    <Modal title={c.name} onClose={onClose} footer={<>
      <Btn kind={c.blocked ? "primary" : "danger"} onClick={() => { onUpdate({ blocked: !c.blocked }); notify(c.blocked ? `${c.name} unblocked` : `${c.name} blocked — can't log in or order`); }}>
        {c.blocked ? "Unblock customer" : "Block customer"}
      </Btn>
      <Btn kind="ghost" onClick={onClose}>Close</Btn>
    </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
        {[["Customer ID", c.id], ["Joined", c.joined], ["Phone", c.phone], ["City", c.city], ["Lifetime spend", inr(c.spent)], ["Wallet", inr(c.wallet)]].map(([k, v]) => (
          <div key={k}><div style={muted}>{k}</div><b>{v}</b></div>
        ))}
      </div>

      <p style={{ ...fieldLabel, marginTop: 16 }}>Orders</p>
      {orders.length ? orders.map((o) => (
        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
          <span>#{o.id} · {o.items}</span><span style={{ display: "flex", gap: 8, alignItems: "center" }}>{inr(o.amount)} <Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge></span>
        </div>
      )) : <p style={muted}>No orders.</p>}

      <p style={{ ...fieldLabel, marginTop: 16 }}>Service jobs</p>
      {jobs.length ? jobs.map((j) => (
        <div key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
          <span>#{j.id} · {j.type} · {j.date === TODAY ? "Today" : j.date}</span><Badge tone={JOB_TONE[j.status]}>{j.status}</Badge>
        </div>
      )) : <p style={muted}>No service jobs.</p>}

      <p style={{ ...fieldLabel, marginTop: 16 }}>Add wallet credit</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={credit} onChange={(e) => setCredit(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="₹ amount" aria-label="Credit amount" style={{ ...input, width: 110 }} />
        <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Credit reason" style={{ ...input, flex: 1 }}>
          {["Goodwill credit", "Late technician", "Refund adjustment", "Referral correction"].map((r) => <option key={r}>{r}</option>)}
        </select>
        <Btn disabled={!ok} onClick={() => { onUpdate({ wallet: c.wallet + n }); notify(`${inr(n)} credited to ${c.name} · ${reason}`); setCredit(""); }}>Credit</Btn>
      </div>
      <p style={{ ...muted, margin: "6px 0 0" }}>Max ₹5,000 per credit. The customer gets a notification.</p>
    </Modal>
  );
}

/* ───────────────────────── Technicians ───────────────────────── */

export function TechniciansSection({ techs, jobs, dealers, onUpdate, notify }: {
  dealers: Dealer[];
  techs: AdminTech[]; jobs: AdminJob[]; onUpdate: (id: string, patch: Partial<AdminTech>) => void; notify: (m: string) => void;
}) {
  const areas = useBridge().techAreas;
  const [q, setQ] = useState("");
  const rows = techs.filter((t) => !q.trim() || `${t.name} ${t.area} ${t.skills.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase()));
  const today = (id: string) => jobs.filter((j) => j.techId === id && j.date === TODAY && j.status !== "Cancelled");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="admin-grid-4">
        {[["Online now", techs.filter((t) => t.status === "Online").length, "green"], ["On a job", techs.filter((t) => t.status === "On job").length, "blue"], ["Offline", techs.filter((t) => t.status === "Offline").length, "grey"], ["KYC pending", techs.filter((t) => t.kyc === "Pending").length, "purple"]].map(([l, v, tone]) => (
          <div key={l as string} style={{ background: "var(--surface)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{l}</span><Badge tone={tone as "green"}>{v}</Badge>
          </div>
        ))}
      </div>

      <Panel title="Technicians" pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search name, area, skill" />}>
        <Table rows={rows} rowKey={(t) => t.id} cols={[
          { key: "n", head: "Technician", render: (t) => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TechAvatar id={t.id} name={t.name} size={34} />
              <div><b>{t.name}</b><div style={muted}>{t.code}</div></div>
            </div>
          ) },
          { key: "a", head: "Pincodes", render: (t) => {
            const pins = servicePincodes(t, areas);
            return <><b>{pins[0]}</b> <span style={muted}>primary</span><div style={muted}>{pins.length > 1 ? `+ ${pins.slice(1).join(", ")}` : t.area}</div></>;
          } },
          { key: "d", head: "Dealer", render: (t) => {
            const d = dealers.find((x) => x.id === t.dealerId);
            return d ? <>{d.name}<div style={muted}>{d.id}</div></> : <span style={muted}>—</span>;
          } },
          { key: "sk", head: "Skills", render: (t) => <span style={muted}>{t.skills.join(", ")}</span> },
          { key: "r", head: "Rating", render: (t) => t.rating ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 700 }}><StarIcon s={12} />{t.rating}</span> : <span style={muted}>New</span> },
          { key: "j", head: "Today", align: "right", render: (t) => `${today(t.id).length} jobs` },
          { key: "st", head: "Status", render: (t) => !t.active ? <Badge tone="grey">Inactive</Badge> : <Badge tone={t.status === "Online" ? "green" : t.status === "On job" ? "blue" : "grey"}>{t.status}</Badge> },
          { key: "k", head: "KYC", render: (t) => <Badge tone={t.kyc === "Verified" ? "green" : "purple"}>{t.kyc}</Badge> },
          { key: "x", head: "", align: "right", render: (t) => (
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              {t.kyc === "Pending" ? (
                <Btn small kind="gold" onClick={() => { onUpdate(t.id, { kyc: "Verified", active: true }); notify(`${t.name} approved — can now receive jobs`); }}>Approve KYC</Btn>
              ) : (
                <Btn small kind={t.active ? "danger" : "primary"} onClick={() => { onUpdate(t.id, { active: !t.active, status: t.active ? "Offline" : t.status }); notify(t.active ? `${t.name} deactivated` : `${t.name} reactivated`); }}>
                  {t.active ? "Deactivate" : "Activate"}
                </Btn>
              )}
            </div>
          ) },
        ]} />
      </Panel>
    </div>
  );
}

/* ───────────────────────── Dealers ───────────────────────── */

export function DealersSection({ dealers, techs, onUpdate, onCreate, notify }: {
  dealers: Dealer[]; techs: AdminTech[]; onUpdate: (id: string, patch: Partial<Dealer>) => void; onCreate: (d: Dealer) => void; notify: (m: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <Panel title={`Dealers (${dealers.length})`} pad={false} actions={<Btn onClick={() => setAdding(true)}>+ Add dealer</Btn>}>
      <Table rows={dealers} rowKey={(d) => d.id} cols={[
        { key: "n", head: "Dealer", render: (d) => <><b style={{ color: d.active ? "var(--ink)" : "var(--ink-mute)" }}>{d.name}</b><div style={muted}>{d.id}</div></> },
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
          <Btn small kind={d.active ? "danger" : "primary"} onClick={() => { onUpdate(d.id, { active: !d.active }); notify(d.active ? `${d.name} paused` : `${d.name} reactivated`); }}>
            {d.active ? "Pause" : "Activate"}
          </Btn>
        ) },
      ]} />
      {adding && (
        <DealerModal nextId={makeId("dealer", dealers.length + 1)} onClose={() => setAdding(false)}
          onSave={(d) => { onCreate(d); notify(`${d.name} added · ${d.id}`); setAdding(false); }} />
      )}
    </Panel>
  );
}

function DealerModal({ nextId, onClose, onSave }: { nextId: string; onClose: () => void; onSave: (d: Dealer) => void }) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [pins, setPins] = useState("");
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
      <Btn disabled={!!err} onClick={() => onSave({
        id: nextId, name: name.trim(), owner: owner.trim(), phone: `+91 ${phone.slice(0, 2)}XXX XX${phone.slice(-3)}`, city: city.trim(),
        pincodes: Array.from(new Set(pinList)), since: "Oct 2026", active: true,
      })}>Create dealer</Btn>
    </>}>
      <p style={{ margin: "0 0 12px", fontSize: 13 }}>Unique dealer ID: <b style={{ letterSpacing: "0.03em" }}>{nextId}</b></p>
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
