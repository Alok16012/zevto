"use client";

import { useMemo, useState } from "react";
import { MinusIcon, PlusIcon, SearchIcon } from "../components/icons";
import ProductImage from "../components/ProductImage";
import { Footer, PageHeader, PrimaryButton, Tabs, card } from "../components/ui";
import { Badge, Empty, Switch, sectionH } from "../components/dealer/kit";
import { PRODUCTS, inr, type Category, type Product } from "../lib/data";
import { fmtStamp } from "../lib/db";
import { onSale, type DbTechListing, type DbTechPurchase, type PurchaseStatus } from "../lib/techShop";

/* Technician's shop: buy Zavtoo products from ops, keep them in your own list
 * and sell them to customers in your pincodes through the Zavtoo app. */

const small: React.CSSProperties = { margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 };

const PURCHASE_TONE: Record<PurchaseStatus, "amber" | "green" | "red" | "grey"> = { Pending: "amber", Delivered: "green", Rejected: "red", Cancelled: "grey" };
const PURCHASE_LABEL: Record<PurchaseStatus, string> = { Pending: "With Zavtoo", Delivered: "Delivered", Rejected: "Rejected", Cancelled: "Cancelled" };

/** Zavtoo's own catalogue (not dealer or technician copies). */
const zavtooProducts = () => PRODUCTS.filter((p) => !p.dealerId && !p.techId && p.active !== false);

export function TechShopScreen({ listings, purchases, ordersBar, onBuy, onGallery, onPrice, onStock, onSelling, onCancelPurchase }: {
  listings: DbTechListing[];
  purchases: DbTechPurchase[];
  /** Customers' orders summary. */
  ordersBar: React.ReactNode;
  onBuy: () => void;
  onGallery: () => void;
  onPrice: (l: DbTechListing, price: number) => Promise<boolean>;
  onStock: (l: DbTechListing, stock: number) => void;
  onSelling: (l: DbTechListing, selling: boolean) => void;
  onCancelPurchase: (p: DbTechPurchase) => void;
}) {
  const pending = purchases.filter((p) => p.status === "Pending");
  const units = listings.reduce((n, l) => n + l.stock, 0);

  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="My Shop" right={
        <button onClick={onBuy} className="press" style={{ border: "none", borderRadius: 999, background: "var(--blue)", color: "white", fontSize: 13, fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>+ Buy stock</button>
      } />
      <div style={{ padding: "0 16px" }}>
        <div style={{ ...card, padding: "14px 16px", display: "flex" }}>
          {([["On sale", listings.filter(onSale).length], ["Units in hand", units], ["Coming", pending.length]] as const).map(([l, v], i) => (
            <div key={l} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{v}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>{l}</p>
            </div>
          ))}
        </div>
        <p style={{ ...small, fontSize: 12, margin: "10px 4px 14px" }}>
          Buy filters, membranes and spares from Zavtoo. Once delivered they show here, and customers in your pincodes can buy them from you in the Zavtoo app — you deliver and collect.
        </p>
        {ordersBar}

        <h3 style={sectionH}>My products</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {listings.length === 0 && (
            <Empty title="Nothing in your shop yet" body="Buy stock from Zavtoo. When ops deliver it, it shows here ready to sell."
              action={<PrimaryButton onClick={onBuy} style={{ maxWidth: 220, margin: "0 auto" }}>Buy from Zavtoo</PrimaryButton>} />
          )}
          {listings.map((l) => <ListingCard key={l.id} listing={l} onPrice={onPrice} onStock={onStock} onSelling={onSelling} />)}
        </div>

        {purchases.length > 0 && (
          <>
            <h3 style={sectionH}>Bought from Zavtoo</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {purchases.slice(0, 15).map((p) => (
                <div key={p.id} style={{ ...card, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ margin: 0, flex: 1, fontSize: 13.5, fontWeight: 700 }}>#{p.ref} · {inr(p.amount)}</p>
                    <Badge tone={PURCHASE_TONE[p.status]}>{PURCHASE_LABEL[p.status]}</Badge>
                  </div>
                  <p style={small}>{p.items.map((it) => `${it.name} × ${it.qty}`).join(", ")}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ink-mute)" }}>{fmtStamp(p.created_at)}{p.note ? ` · ${p.note}` : ""}</p>
                  {p.status === "Pending" && (
                    <button onClick={() => onCancelPurchase(p)} style={{ marginTop: 8, background: "none", border: "none", padding: 0, color: "var(--red)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Cancel request</button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={onGallery} className="press" style={{ ...card, width: "100%", marginTop: 18, padding: "12px 14px", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🧰</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Parts gallery</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--ink-soft)" }}>Photos of other parts you can supply, to share with customers</span>
          </span>
          <span aria-hidden style={{ color: "var(--ink-mute)", fontSize: 18 }}>›</span>
        </button>
      </div>
    </div>
  );
}

function ListingCard({ listing: l, onPrice, onStock, onSelling }: {
  listing: DbTechListing; onPrice: (l: DbTechListing, price: number) => Promise<boolean>;
  onStock: (l: DbTechListing, stock: number) => void; onSelling: (l: DbTechListing, selling: boolean) => void;
}) {
  const p = PRODUCTS.find((x) => x.id === l.product_id);
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(l.price));
  const [busy, setBusy] = useState(false);
  const mrp = p?.mrp ?? l.price;
  const n = Number(price);
  const bad = !(n > 0) ? "Enter a price" : n > mrp ? `Max ${inr(mrp)} (MRP)` : null;

  const save = async () => {
    if (bad || busy) return;
    setBusy(true);
    if (await onPrice(l, n)) setEditing(false);
    setBusy(false);
  };

  return (
    <div style={{ ...card, padding: 12, opacity: l.selling ? 1 : 0.75 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 68, height: 68, flexShrink: 0, borderRadius: 12, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {p && <ProductImage product={p} size={60} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <p style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{p?.name ?? "Zavtoo product"}</p>
            <Switch on={l.selling} onChange={(v) => onSelling(l, v)} label={l.selling ? "Stop selling" : "Sell in the app"} />
          </div>
          {editing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>₹</span>
              <input value={price} inputMode="numeric" autoFocus aria-label="Your selling price" onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && void save()}
                style={{ width: 84, border: "1.5px solid var(--line-strong)", borderRadius: 10, padding: "6px 8px", fontSize: 14, fontWeight: 700 }} />
              <button onClick={() => void save()} disabled={!!bad || busy} style={{ border: "none", borderRadius: 10, background: "var(--blue)", color: "white", fontSize: 12.5, fontWeight: 700, padding: "7px 10px", cursor: "pointer", opacity: bad ? 0.5 : 1 }}>Save</button>
              <button onClick={() => { setEditing(false); setPrice(String(l.price)); }} style={{ border: "none", background: "none", color: "var(--ink-soft)", fontSize: 12.5, cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4, padding: 0, border: "none", background: "none", cursor: "pointer" }} aria-label="Change your price">
              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--blue)" }}>{inr(l.price)}</span>
              {mrp > l.price && <span style={{ fontSize: 11.5, color: "var(--ink-mute)", textDecoration: "line-through" }}>{inr(mrp)}</span>}
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--blue)" }}>Edit price</span>
            </button>
          )}
          {editing && bad && price !== "" && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--error-text)", fontWeight: 600 }}>{bad}</p>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>In hand <b style={{ color: "var(--ink)", fontSize: 14 }}>{l.stock}</b></span>
        {l.stock > 0 && (
          <button onClick={() => { if (confirm(`Mark 1 × ${p?.name ?? "this product"} as used or given away outside the app?`)) onStock(l, l.stock - 1); }}
            style={{ border: "none", borderRadius: 9, background: "var(--blue-tint)", color: "var(--blue)", fontSize: 11.5, fontWeight: 700, padding: "5px 9px", cursor: "pointer" }}>
            −1 used
          </button>
        )}
        <div style={{ flex: 1 }} />
        {!l.selling ? <Badge tone="grey">Hidden</Badge> : l.stock === 0 ? <Badge tone="red">Out of stock</Badge> : <Badge tone="green">On sale</Badge>}
      </div>
    </div>
  );
}

/* ───────────────────────── Buy from Zavtoo ───────────────────────── */

export function BuyStockPage({ onBack, onSubmit }: { onBack: () => void; onSubmit: (items: { id: string; qty: number }[]) => Promise<boolean> }) {
  const [cat, setCat] = useState<Category>("spare");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const all = zavtooProducts();
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((p) => p.category === cat && (!needle || `${p.name} ${p.spec}`.toLowerCase().includes(needle)));
  }, [all, cat, q]);
  const lines = Object.entries(cart).filter(([, n]) => n > 0);
  const total = lines.reduce((s, [id, n]) => s + (all.find((p) => p.id === id)?.price ?? 0) * n, 0);
  const units = lines.reduce((s, [, n]) => s + n, 0);

  const setQty = (p: Product, n: number) => {
    const max = p.stock == null ? 99 : Math.min(99, p.stock);
    setCart((c) => ({ ...c, [p.id]: Math.max(0, Math.min(max, n)) }));
  };
  const submit = async () => {
    if (!lines.length || busy) return;
    setBusy(true);
    const ok = await onSubmit(lines.map(([id, qty]) => ({ id, qty })));
    setBusy(false);
    if (ok) setCart({});
  };

  const step: React.CSSProperties = { width: 30, height: 30, border: "none", borderRadius: 9, cursor: "pointer", background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Buy from Zavtoo" onBack={onBack} />
      <div style={{ padding: "0 16px 16px", flex: 1 }}>
        <p style={{ ...small, margin: "0 2px 12px" }}>Pick what you want to keep in stock. Zavtoo ops confirm and deliver it; pay as agreed with ops. Delivered units go straight into your shop.</p>
        <Tabs<Category> value={cat} onChange={setCat} tabs={[{ id: "spare", label: "Spares" }, { id: "domestic", label: "Purifiers" }, { id: "commercial", label: "Commercial" }]} />
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, background: "var(--surface)", borderRadius: 16, padding: "11px 14px", boxShadow: "var(--shadow-card)" }}>
          <SearchIcon s={19} c="var(--ink-mute)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Zavtoo products..." aria-label="Search Zavtoo products"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)" }} />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {rows.length === 0 && <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, padding: "30px 0" }}>Nothing here.</p>}
          {rows.map((p) => {
            const n = cart[p.id] ?? 0;
            const out = p.stock === 0;
            return (
              <div key={p.id} style={{ ...card, padding: 12, display: "flex", gap: 12, alignItems: "center", opacity: out ? 0.6 : 1 }}>
                <div style={{ width: 60, height: 60, flexShrink: 0, borderRadius: 12, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ProductImage product={p} size={54} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{p.name}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>
                    <b style={{ color: "var(--ink)" }}>{inr(p.price)}</b> · MRP {inr(p.mrp)}{out ? " · out of stock" : ""}
                  </p>
                </div>
                {!out && (n === 0 ? (
                  <button onClick={() => setQty(p, 1)} className="press" style={{ border: "1.5px solid var(--blue)", borderRadius: 10, background: "var(--surface)", color: "var(--blue)", fontSize: 12.5, fontWeight: 700, padding: "6px 14px", cursor: "pointer" }}>Add</button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button aria-label={`Fewer ${p.name}`} onClick={() => setQty(p, n - 1)} style={step}><MinusIcon s={14} c="var(--blue)" /></button>
                    <span style={{ minWidth: 18, textAlign: "center", fontSize: 14, fontWeight: 700 }}>{n}</span>
                    <button aria-label={`More ${p.name}`} onClick={() => setQty(p, n + 1)} style={step}><PlusIcon s={14} c="var(--blue)" /></button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {lines.length > 0 && (
        <Footer>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>{units} unit{units > 1 ? "s" : ""}</p>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{inr(total)}</p>
            </div>
            <PrimaryButton disabled={busy} onClick={() => void submit()} style={{ flex: 2 }}>{busy ? "Sending…" : "Order from Zavtoo"}</PrimaryButton>
          </div>
        </Footer>
      )}
    </div>
  );
}

