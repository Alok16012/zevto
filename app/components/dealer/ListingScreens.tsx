"use client";

import { useMemo, useState } from "react";
import { MinusIcon, PlusIcon, SearchIcon, TrashIcon } from "../icons";
import ProductImage from "../ProductImage";
import { Footer, PageHeader, PrimaryButton, Tabs, card, iconBtn } from "../ui";
import { Badge, Chips, Empty, Field, Select, Switch, inputStyle } from "./kit";
import { PRODUCTS, inr, type ArtKind, type Category } from "../../lib/data";
import { LOW_STOCK, isLive, type DbListing } from "../../lib/dealerData";

const ART_FOR: Record<Category, ArtKind> = { domestic: "classic", commercial: "commercial", spare: "spare" };

/** The fields a dealer edits; the database fills in the rest. */
export type ListingDraft = Pick<DbListing, "name" | "spec" | "category" | "art" | "price" | "mrp" | "stock" | "active" | "warranty" | "stages" | "description" | "images">;

/* ───────────────────────── My listings ───────────────────────── */

type ListFilter = "all" | "live" | "paused" | "out";

export function ListingsScreen({ listings, verified, onAdd, onEdit, onToggle, onStock }: {
  listings: DbListing[]; verified: boolean; onAdd: () => void; onEdit: (id: string) => void;
  onToggle: (l: DbListing, active: boolean) => void; onStock: (l: DbListing, stock: number) => void;
}) {
  const [filter, setFilter] = useState<ListFilter>("all");
  const [q, setQ] = useState("");

  const counts = {
    all: listings.length,
    live: listings.filter(isLive).length,
    paused: listings.filter((l) => !l.active).length,
    out: listings.filter((l) => l.stock === 0).length,
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return listings.filter((l) =>
      (filter === "all" || (filter === "live" && isLive(l)) || (filter === "paused" && !l.active) || (filter === "out" && l.stock === 0)) &&
      (!needle || `${l.name} ${l.spec}`.toLowerCase().includes(needle)));
  }, [listings, filter, q]);

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="My Listings" right={
        <button onClick={onAdd} className="press" style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "var(--blue)", color: "white", borderRadius: 999, padding: "7px 13px 7px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          <PlusIcon s={15} c="white" /> Add
        </button>
      } />

      <div style={{ padding: "0 16px", flex: 1 }}>
        {!verified && listings.length > 0 && (
          <p style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: 12, background: "var(--warning)", color: "var(--warning-text)", fontSize: 12.5, fontWeight: 600 }}>
            Customers will see these once Zavtoo verifies your shop.
          </p>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderRadius: 16, padding: "11px 14px", boxShadow: "var(--shadow-card)" }}>
          <SearchIcon s={19} c="var(--ink-mute)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your listings..." aria-label="Search listings"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)" }} />
        </label>
        <div style={{ marginTop: 12 }}>
          <Chips<ListFilter> value={filter} onChange={setFilter} items={[
            { id: "all", label: "All", count: counts.all }, { id: "live", label: "Live", count: counts.live },
            { id: "paused", label: "Paused", count: counts.paused }, { id: "out", label: "Out of stock", count: counts.out },
          ]} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 0 24px" }}>
          {listings.length === 0 && (
            <Empty title="List your first product" body="Add the purifiers and spares you stock. Customers in your pincodes can buy them from the Zavtoo app and website."
              action={<PrimaryButton onClick={onAdd} style={{ maxWidth: 220, margin: "0 auto" }}>Add listing</PrimaryButton>} />
          )}
          {listings.length > 0 && rows.length === 0 && <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, padding: "30px 0" }}>Nothing here.</p>}
          {rows.map((l) => (
            <div key={l.id} role="button" tabIndex={0} aria-label={`Edit ${l.name}`} onClick={() => onEdit(l.id)} onKeyDown={(e) => e.key === "Enter" && onEdit(l.id)}
              className="press" style={{ ...card, padding: 12, cursor: "pointer", opacity: l.active ? 1 : 0.72 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 76, height: 76, flexShrink: 0, borderRadius: 14, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ProductImage product={l} size={68} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <p style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{l.name}</p>
                    <Switch on={l.active} onChange={(v) => onToggle(l, v)} label={l.active ? "Pause listing" : "Make listing live"} />
                  </div>
                  <p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>{l.spec}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{inr(l.price)}</span>
                    {l.mrp > l.price && <span style={{ fontSize: 11.5, color: "var(--ink-mute)", textDecoration: "line-through" }}>{inr(l.mrp)}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                {!l.active ? <Badge tone="grey">Paused</Badge>
                  : l.stock === 0 ? <Badge tone="red">Out of stock</Badge>
                  : l.stock <= LOW_STOCK ? <Badge tone="amber">Low stock</Badge>
                  : <Badge tone="green">Live</Badge>}
                {l.reviews_count > 0 && <Badge tone="blue">★ {Number(l.rating).toFixed(1)} · {l.reviews_count}</Badge>}
                <div style={{ flex: 1 }} />
                <StockStepper value={l.stock} onChange={(n) => onStock(l, n)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StockStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const b: React.CSSProperties = { width: 28, height: 28, border: "none", borderRadius: 9, cursor: "pointer", background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>Stock</span>
      <button aria-label="Decrease stock" onClick={() => onChange(Math.max(0, value - 1))} style={b}><MinusIcon s={14} c="var(--blue)" /></button>
      <span style={{ minWidth: 20, textAlign: "center", fontSize: 14, fontWeight: 700 }}>{value}</span>
      <button aria-label="Increase stock" onClick={() => onChange(Math.min(9999, value + 1))} style={b}><PlusIcon s={14} c="var(--blue)" /></button>
    </div>
  );
}

/* ───────────────────────── Add / edit listing ───────────────────────── */

export function ListingFormPage({ initial, onBack, onSave, onDelete }: {
  initial?: DbListing; onBack: () => void; onSave: (l: ListingDraft) => Promise<boolean>; onDelete?: () => void;
}) {
  // Zavtoo products only — the dealer's own listings are also in PRODUCTS once the catalogue loads.
  const zavtoo = PRODUCTS.filter((p) => !p.dealerId);
  const [baseId, setBaseId] = useState("");
  const [name, setName] = useState(initial?.name ?? "");
  const [spec, setSpec] = useState(initial?.spec ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "domestic");
  const [art, setArt] = useState<ArtKind>(initial?.art ?? "classic");
  const [stages, setStages] = useState(initial?.stages ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [mrp, setMrp] = useState(initial ? String(initial.mrp) : "");
  const [stock, setStock] = useState(initial ? String(initial.stock) : "1");
  const [warranty, setWarranty] = useState(initial?.warranty ?? "1 Year");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /** Picking a Zavtoo product fills the form with its catalogue details and photos. */
  const pickBase = (id: string) => {
    setBaseId(id);
    const p = zavtoo.find((x) => x.id === id);
    if (!p) { setImages([]); return; }
    setName(p.name); setSpec(p.spec); setCategory(p.category); setArt(p.art); setStages(p.stages); setWarranty(p.warranty);
    setImages(p.images ?? []); setMrp(String(p.mrp)); setPrice(String(p.price));
    if (!description) setDescription(p.description);
  };
  const pickCategory = (c: Category) => { setCategory(c); if (!baseId) setArt(ART_FOR[c]); };

  const nPrice = Number(price), nMrp = Number(mrp || price), nStock = Number(stock);
  const errors = {
    name: name.trim().length < 3 ? "Give the product a name" : "",
    price: !(nPrice > 0) ? "Enter your selling price" : "",
    mrp: mrp && nMrp < nPrice ? "MRP can't be lower than the selling price" : "",
    stock: stock === "" || !Number.isInteger(nStock) || nStock < 0 ? "Stock must be 0 or more" : "",
  };
  const ok = !Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : "");

  const save = async () => {
    setTouched(true);
    if (!ok || busy) return;
    setBusy(true);
    const done = await onSave({
      name: name.trim(), spec: spec.trim() || (category === "spare" ? "Spare part" : "RO purifier"),
      category, art, stages: stages.trim(), images,
      price: nPrice, mrp: Math.max(nMrp, nPrice), stock: nStock, active,
      warranty: warranty.trim(), description: description.trim(),
    });
    if (!done) setBusy(false);
  };

  const off = nMrp > nPrice && nPrice > 0 ? Math.round((1 - nPrice / nMrp) * 100) : 0;

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title={initial ? "Edit Listing" : "New Listing"} onBack={onBack} right={initial && onDelete && (
        <button aria-label="Delete listing" onClick={() => setConfirmDelete(true)} className="press" style={iconBtn}><TrashIcon s={21} c="var(--red)" /></button>
      )} />

      <div style={{ padding: "0 16px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {confirmDelete && (
          <div className="fade-up" style={{ ...card, padding: 14, border: "1.5px solid #fecaca" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Delete “{initial?.name}”?</p>
            <p style={{ margin: "3px 0 12px", fontSize: 12.5, color: "var(--ink-soft)" }}>Customers won&apos;t see it any more. Past orders are kept. To hide it for a while, pause it instead.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, border: "1.5px solid var(--line-strong)", background: "var(--surface)", borderRadius: 12, padding: 10, fontWeight: 600, cursor: "pointer" }}>Keep</button>
              <button onClick={onDelete} style={{ flex: 1, border: "none", background: "var(--red)", color: "white", borderRadius: 12, padding: 10, fontWeight: 700, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        )}

        {/* How customers will see it */}
        <div style={{ ...card, padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ProductImage product={{ name, art, images }} size={58} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", letterSpacing: "0.04em" }}>CUSTOMER PREVIEW</p>
            <p style={{ margin: "1px 0 0", fontSize: 14, fontWeight: 600, color: name ? "var(--ink)" : "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "Product name"}</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
              {nPrice > 0 ? inr(nPrice) : "₹—"}
              {off > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--success-text)" }}>{off}% off</span>}
            </p>
          </div>
        </div>

        {!initial && (
          <Field id="lf-base" label="Zavtoo product (optional)" hint="Reselling a Zavtoo model? Pick it to fill in the details and photos.">
            <Select id="lf-base" value={baseId} onChange={pickBase}>
              <option value="">My own product</option>
              {zavtoo.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
        )}

        <div>
          <span style={{ display: "block", margin: "0 0 8px", fontSize: 13.5, fontWeight: 600 }}>Category</span>
          <Tabs<Category> value={category} onChange={pickCategory} tabs={[
            { id: "domestic", label: "Domestic" }, { id: "commercial", label: "Commercial" }, { id: "spare", label: "Spare" },
          ]} />
        </div>

        <Field id="lf-name" label="Product name" error={show("name")}>
          <input id="lf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AquaPure RO Classic" maxLength={80} style={inputStyle(!!show("name"))} />
        </Field>
        <Field id="lf-spec" label="Short highlight">
          <input id="lf-spec" value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="e.g. 7 Stage · 10 L tank" maxLength={60} style={inputStyle()} />
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field id="lf-price" label="Selling price ₹" error={show("price")}>
              <input id="lf-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 7))} placeholder="12499" style={inputStyle(!!show("price"))} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field id="lf-mrp" label="MRP ₹" error={show("mrp")}>
              <input id="lf-mrp" inputMode="numeric" value={mrp} onChange={(e) => setMrp(e.target.value.replace(/\D/g, "").slice(0, 7))} placeholder="15999" style={inputStyle(!!show("mrp"))} />
            </Field>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field id="lf-stock" label="Units in stock" error={show("stock")}>
              <input id="lf-stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, "").slice(0, 4))} style={inputStyle(!!show("stock"))} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field id="lf-warranty" label="Warranty">
              <input id="lf-warranty" value={warranty} onChange={(e) => setWarranty(e.target.value)} maxLength={30} style={inputStyle()} />
            </Field>
          </div>
        </div>

        <Field id="lf-desc" label="Description">
          <textarea id="lf-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={800}
            placeholder="What's included, installation, delivery time..." style={{ ...inputStyle(), resize: "vertical", lineHeight: 1.5 }} />
        </Field>

        <div style={{ ...card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Show to customers</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>{active ? "Live in your pincodes while in stock" : "Saved as paused"}</p>
          </div>
          <Switch on={active} onChange={setActive} label="Show to customers" />
        </div>
      </div>

      <Footer>
        <PrimaryButton onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Publish listing"}</PrimaryButton>
      </Footer>
    </div>
  );
}
