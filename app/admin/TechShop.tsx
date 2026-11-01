"use client";

import { useState } from "react";
import { inr } from "../lib/data";
import { fmtDateOnly } from "../lib/db";
import type { AdminProduct, AdminTech, Dealer, StockRequest } from "../lib/adminData";
import { partById } from "../lib/techData";
import type { DbGalleryPart, GalleryStatus } from "../lib/partsGallery";
import type { DbDealerPurchase, DbTechListing, DbTechPurchase, PurchaseStatus } from "../lib/techShop";
import { CatalogTable, type ProductDraft } from "./Catalog";
import { SparePartsSection } from "./SpareParts";
import { Badge, Btn, Filter, Modal, Panel, SearchBox, Table, fieldLabel, input, muted, type Tone } from "./kit";

/* One place for everything technicians and dealers buy from Zavtoo: the items on
 * offer, their purchase orders, and the spare parts technicians list. Delivering a
 * purchase moves the units from Zavtoo's stock into the partner's shop. */

type ShopTab = "Shop items" | "Technician orders" | "Dealer orders" | "Technician parts";

export function PartnerShopSection({ products, purchases, dealerPurchases, listings, parts, stockRequests, techs, dealers, onUpdate, onCreate, onDelete, onDecide, onDecideDealer, onReviewPart, onStockRequest }: {
  products: AdminProduct[]; purchases: DbTechPurchase[]; dealerPurchases: DbDealerPurchase[]; listings: DbTechListing[];
  parts: DbGalleryPart[]; stockRequests: StockRequest[]; techs: AdminTech[]; dealers: Dealer[];
  onStockRequest: (r: StockRequest, approve: boolean) => Promise<boolean>;
  onUpdate: (p: AdminProduct, patch: Partial<AdminProduct>) => Promise<boolean>;
  onCreate: (d: ProductDraft) => Promise<string | null>; onDelete: (p: AdminProduct) => Promise<boolean>;
  onDecide: (p: DbTechPurchase, status: "Delivered" | "Rejected", note?: string) => Promise<boolean>;
  onDecideDealer: (p: DbDealerPurchase, status: "Delivered" | "Rejected", note?: string) => Promise<boolean>;
  onReviewPart: (p: DbGalleryPart, status: Exclude<GalleryStatus, "Pending">, reason?: string) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<ShopTab>("Shop items");
  const offered = products.filter((p) => p.shopOnly || p.forTech || p.forDealer);
  const counts: Partial<Record<ShopTab, number>> = {
    "Shop items": offered.length,
    "Technician orders": purchases.filter((p) => p.status === "Pending").length + stockRequests.filter((r) => r.status === "Pending").length,
    "Dealer orders": dealerPurchases.filter((p) => p.status === "Pending").length,
    "Technician parts": parts.filter((p) => p.status === "Pending").length,
  };
  const techOwner = (p: DbTechPurchase) => { const t = techs.find((x) => x.id === p.tech_id); return t && { name: t.name, sub: `${t.code} · ${t.phone}` }; };
  const dealerOwner = (p: DbDealerPurchase) => { const d = dealers.find((x) => x.id === p.dealer_id); return d && { name: d.name, sub: `${d.code} · ${d.phone}` }; };
  const holders = new Set(listings.filter((l) => l.stock > 0).map((l) => l.tech_id)).size;
  const units = listings.reduce((n, l) => n + l.stock, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Filter<ShopTab> options={["Shop items", "Technician orders", "Dealer orders", "Technician parts"]} value={tab} onChange={setTab} counts={counts} />
      {tab === "Shop items" && (
        <Panel title={`Items technicians & dealers can buy (${offered.length})`} pad={false}>
          <p style={{ ...muted, margin: 0, padding: "12px 16px" }}>Add partner-only items (spares, POP material like banners and standees) here. Customer products can also be offered — tick “Technicians / Dealers can buy” when you edit them.</p>
          <CatalogTable products={offered} kind="shop" onUpdate={onUpdate} onCreate={onCreate} onDelete={onDelete} />
        </Panel>
      )}
      {tab === "Technician orders" && <>
        <PurchasesPanel title="Technician purchases" who="technician" purchases={purchases} ownerOf={techOwner} onDecide={onDecide}
          summary={`${units} units with ${holders} technician${holders === 1 ? "" : "s"}`} />
        <Panel title="Van stock requests" pad={false}>
          <Table rows={stockRequests} rowKey={(r) => r.id} empty="No van stock requests." cols={[
            { key: "d", head: "Asked", render: (r) => <span style={muted}>{r.at}</span> },
            { key: "t", head: "Technician", render: (r) => { const t = techs.find((x) => x.id === r.techId); return t ? <>{t.name}<div style={muted}>{t.code}</div></> : "—"; } },
            { key: "i", head: "Parts", render: (r) => <span>{Object.entries(r.items).map(([id, n]) => `${partById(id)?.name ?? id} × ${n}`).join(", ")}</span> },
            { key: "s", head: "Status", render: (r) => <Badge tone={r.status === "Approved" ? "green" : r.status === "Rejected" ? "red" : "amber"}>{r.status}</Badge> },
            { key: "x", head: "", align: "right", render: (r) => r.status === "Pending" ? (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <Btn small onClick={() => void onStockRequest(r, true)}>Approve</Btn>
                <Btn small kind="danger" onClick={() => void onStockRequest(r, false)}>Reject</Btn>
              </div>
            ) : null },
          ]} />
        </Panel>
      </>}
      {tab === "Dealer orders" && <PurchasesPanel title="Dealer purchases" who="dealer" purchases={dealerPurchases} ownerOf={dealerOwner} onDecide={onDecideDealer}
        summary="Delivered spares go into the dealer's listings, paused, ready to price" />}
      {tab === "Technician parts" && <SparePartsSection parts={parts} techs={techs} onReview={onReviewPart} />}
    </div>
  );
}

type PurchaseFilter = "Pending" | "Delivered" | "Rejected" | "All";
const TONE: Record<PurchaseStatus, Tone> = { Pending: "amber", Delivered: "green", Rejected: "red", Cancelled: "grey" };

type AnyPurchase = DbTechPurchase | DbDealerPurchase;

function PurchasesPanel<P extends AnyPurchase>({ title, who, purchases, ownerOf, onDecide, summary }: {
  title: string; who: "technician" | "dealer"; purchases: P[]; summary: string;
  ownerOf: (p: P) => { name: string; sub: string } | undefined;
  onDecide: (p: P, status: "Delivered" | "Rejected", note?: string) => Promise<boolean>;
}) {
  const [f, setF] = useState<PurchaseFilter>("Pending");
  const [q, setQ] = useState("");
  const [rejecting, setRejecting] = useState<P | null>(null);

  const needle = q.trim().toLowerCase();
  const rows = purchases
    .filter((p) => f === "All" || p.status === f)
    .filter((p) => !needle || [p.ref, ownerOf(p)?.name, ownerOf(p)?.sub, ...p.items.map((i) => i.name)].some((s) => s?.toLowerCase().includes(needle)));
  const counts = {
    Pending: purchases.filter((p) => p.status === "Pending").length, Delivered: purchases.filter((p) => p.status === "Delivered").length,
    Rejected: purchases.filter((p) => p.status === "Rejected").length, All: purchases.length,
  };

  return (
    <Panel title={title} pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder={`Search ref, ${who}, product`} />}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Filter<PurchaseFilter> options={["Pending", "Delivered", "Rejected", "All"]} value={f} onChange={setF} counts={counts} />
        <span style={{ ...muted, marginLeft: "auto" }}>{summary}</span>
      </div>
      <Table rows={rows} rowKey={(p) => p.id} empty={f === "Pending" ? "No purchases waiting." : "Nothing here."} cols={[
        { key: "r", head: "Ref", render: (p) => <><b>#{p.ref}</b><div style={muted}>{fmtDateOnly(p.created_at)}</div></> },
        { key: "t", head: who === "dealer" ? "Dealer" : "Technician", render: (p) => { const o = ownerOf(p); return o ? <>{o.name}<div style={muted}>{o.sub}</div></> : <span style={muted}>—</span>; } },
        { key: "i", head: "Items", render: (p) => <div style={{ maxWidth: 340 }}>{p.items.map((it) => <div key={it.id}>{it.name} <span style={muted}>× {it.qty} · {inr(it.price)}</span>{it.pop && <> <Badge tone="purple">POP</Badge></>}</div>)}</div> },
        { key: "a", head: "Amount", align: "right", render: (p) => <b>{inr(p.amount)}</b> },
        { key: "s", head: "Status", render: (p) => <>{"self" in p && p.self ? <Badge tone="blue">Self purchase</Badge> : <Badge tone={TONE[p.status]}>{p.status}</Badge>}{p.note && !("self" in p && p.self) && <div style={muted}>{p.note}</div>}</> },
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

function RejectModal({ purchase, onClose, onReject }: { purchase: AnyPurchase; onClose: () => void; onReject: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Reject · #${purchase.ref}`} onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn kind="danger" disabled={busy} onClick={async () => { setBusy(true); await onReject(note.trim()); setBusy(false); }}>{busy ? "Saving…" : "Reject purchase"}</Btn>
    </>}>
      <label>
        <span style={fieldLabel}>Reason (they see this)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} rows={3} placeholder="e.g. Out of stock this week" style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
      </label>
    </Modal>
  );
}
