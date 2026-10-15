"use client";

import { useState } from "react";
import { inr } from "../lib/data";
import { fmtDateOnly } from "../lib/db";
import type { AdminTech } from "../lib/adminData";
import type { DbTechListing, DbTechPurchase, PurchaseStatus } from "../lib/techShop";
import { Badge, Btn, Filter, Modal, Panel, SearchBox, Table, fieldLabel, input, muted, type Tone } from "./kit";

/* Technicians buy Zavtoo products to keep and sell. Delivering a purchase moves
 * the units from Zavtoo's stock into the technician's shop. */

type PurchaseFilter = "Pending" | "Delivered" | "Rejected" | "All";
const TONE: Record<PurchaseStatus, Tone> = { Pending: "amber", Delivered: "green", Rejected: "red", Cancelled: "grey" };

export function TechShopSection({ purchases, listings, techs, onDecide }: {
  purchases: DbTechPurchase[]; listings: DbTechListing[]; techs: AdminTech[];
  onDecide: (p: DbTechPurchase, status: "Delivered" | "Rejected", note?: string) => Promise<boolean>;
}) {
  const [f, setF] = useState<PurchaseFilter>("Pending");
  const [q, setQ] = useState("");
  const [rejecting, setRejecting] = useState<DbTechPurchase | null>(null);
  const techOf = (id: string) => techs.find((t) => t.id === id);

  const needle = q.trim().toLowerCase();
  const rows = purchases
    .filter((p) => f === "All" || p.status === f)
    .filter((p) => !needle || [p.ref, techOf(p.tech_id)?.name, techOf(p.tech_id)?.code, ...p.items.map((i) => i.name)].some((s) => s?.toLowerCase().includes(needle)));
  const counts = {
    Pending: purchases.filter((p) => p.status === "Pending").length, Delivered: purchases.filter((p) => p.status === "Delivered").length,
    Rejected: purchases.filter((p) => p.status === "Rejected").length, All: purchases.length,
  };
  const holders = new Set(listings.filter((l) => l.stock > 0).map((l) => l.tech_id)).size;
  const units = listings.reduce((n, l) => n + l.stock, 0);

  return (
    <Panel title="Technician purchases" pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search ref, technician, product" />}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Filter<PurchaseFilter> options={["Pending", "Delivered", "Rejected", "All"]} value={f} onChange={setF} counts={counts} />
        <span style={{ ...muted, marginLeft: "auto" }}>{units} units with {holders} technician{holders === 1 ? "" : "s"}</span>
      </div>
      <Table rows={rows} rowKey={(p) => p.id} empty={f === "Pending" ? "No purchases waiting." : "Nothing here."} cols={[
        { key: "r", head: "Ref", render: (p) => <><b>#{p.ref}</b><div style={muted}>{fmtDateOnly(p.created_at)}</div></> },
        { key: "t", head: "Technician", render: (p) => { const t = techOf(p.tech_id); return t ? <>{t.name}<div style={muted}>{t.code} · {t.phone}</div></> : <span style={muted}>—</span>; } },
        { key: "i", head: "Items", render: (p) => <div style={{ maxWidth: 340 }}>{p.items.map((it) => <div key={it.id}>{it.name} <span style={muted}>× {it.qty}</span></div>)}</div> },
        { key: "a", head: "Amount", align: "right", render: (p) => <b>{inr(p.amount)}</b> },
        { key: "s", head: "Status", render: (p) => <><Badge tone={TONE[p.status]}>{p.status}</Badge>{p.note && <div style={muted}>{p.note}</div>}</> },
        { key: "x", head: "", align: "right", render: (p) => p.status === "Pending" ? (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <Btn small onClick={() => void onDecide(p, "Delivered")}>Mark delivered</Btn>
            <Btn small kind="danger" onClick={() => setRejecting(p)}>Reject</Btn>
          </div>
        ) : null },
      ]} />
      {rejecting && <RejectModal purchase={rejecting} onClose={() => setRejecting(null)}
        onReject={async (note) => { if (await onDecide(rejecting, "Rejected", note)) setRejecting(null); }} />}
    </Panel>
  );
}

function RejectModal({ purchase, onClose, onReject }: { purchase: DbTechPurchase; onClose: () => void; onReject: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Reject · #${purchase.ref}`} onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn kind="danger" disabled={busy} onClick={async () => { setBusy(true); await onReject(note.trim()); setBusy(false); }}>{busy ? "Saving…" : "Reject purchase"}</Btn>
    </>}>
      <label>
        <span style={fieldLabel}>Reason (the technician sees this)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} rows={3} placeholder="e.g. Out of stock this week" style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
      </label>
    </Modal>
  );
}
