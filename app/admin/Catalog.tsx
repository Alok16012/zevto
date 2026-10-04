"use client";

import { useRef, useState } from "react";
import { Toggle } from "../components/ui";
import ProductImage from "../components/ProductImage";
import { PhotoViewer, compressImage } from "../components/PhotoPicker";
import { removeProductImages, uploadProductImage } from "../lib/photos";
import { friendly } from "../lib/supabase";
import { inr, productById, techById, type Coupon } from "../lib/data";
import { AUDIENCES, type AdminCoupon, type AdminProduct, type AdminReview, type Broadcast } from "../lib/adminData";
import { isoDay } from "./Operations";
import { Badge, Btn, Filter, Modal, Panel, Table, fieldLabel, input, muted } from "./kit";

/* ───────────────────────── Products & stock ───────────────────────── */

export type ProductDraft = Pick<AdminProduct, "name" | "category" | "spec" | "price" | "mrp" | "stock" | "stages" | "warranty" | "description" | "art">;

export function ProductsSection({ products, onUpdate, onCreate, onDelete }: {
  products: AdminProduct[]; onUpdate: (p: AdminProduct, patch: Partial<AdminProduct>) => Promise<boolean>;
  onCreate: (d: ProductDraft) => Promise<string | null>; onDelete: (p: AdminProduct) => Promise<boolean>;
}) {
  const [edit, setEdit] = useState<AdminProduct | "new" | null>(null);
  const [photosFor, setPhotosFor] = useState<string | null>(null);
  const photoProduct = products.find((p) => p.id === photosFor);
  return (
    <Panel title={`Products & stock (${products.length})`} pad={false} actions={<Btn onClick={() => setEdit("new")}>+ Add product</Btn>}>
      <Table rows={products} rowKey={(p) => p.id} empty="No products yet. Add your first product." cols={[
        { key: "img", head: "Photo", width: 72, render: (p) => (
          <button onClick={() => setPhotosFor(p.id)} aria-label={`Manage photos of ${p.name}`} title={p.images.length ? `${p.images.length} photo${p.images.length > 1 ? "s" : ""}` : "Add photos"} style={{
            position: "relative", width: 52, height: 52, padding: 0, borderRadius: 10, cursor: "pointer", background: "var(--bg-secondary)",
            border: p.images.length ? "1px solid var(--line)" : "1.5px dashed var(--line-strong)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            {p.images.length ? <ProductImage product={{ name: p.name, art: "classic", images: p.images }} size={50} radius={8} /> : <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--blue)", lineHeight: 1.2 }}>+ Add<br />photo</span>}
            {p.images.length > 1 && <span style={{ position: "absolute", right: 2, bottom: 2, background: "var(--ink)", color: "white", fontSize: 9.5, fontWeight: 700, borderRadius: 6, padding: "0 4px" }}>{p.images.length}</span>}
          </button>
        ) },
        { key: "n", head: "Product", render: (p) => <><b style={{ color: p.active ? "var(--ink)" : "var(--ink-mute)" }}>{p.name}</b><div style={{ ...muted, textTransform: "capitalize" }}>{p.category}{p.spec ? ` · ${p.spec}` : ""}</div></> },
        { key: "p", head: "Price", align: "right", render: (p) => <><b>{inr(p.price)}</b><div style={{ ...muted, textDecoration: "line-through" }}>{inr(p.mrp)}</div></> },
        { key: "d", head: "Discount", align: "right", render: (p) => `${Math.round((1 - p.price / p.mrp) * 100)}%` },
        { key: "s", head: "Stock", align: "right", render: (p) => p.stock == null ? <span style={muted}>Not tracked</span> : <span style={{ fontWeight: 700, color: p.stock === 0 ? "var(--error-text)" : p.stock <= 5 ? "var(--warning-text)" : "var(--ink)" }}>{p.stock}</span> },
        { key: "st", head: "Status", render: (p) => p.stock == null ? <Badge tone="green">Available</Badge> : p.stock === 0 ? <Badge tone="red">Out of stock</Badge> : p.stock <= 5 ? <Badge tone="amber">Low stock</Badge> : <Badge tone="green">In stock</Badge> },
        { key: "a", head: "Listed", render: (p) => <Toggle on={p.active} label={`List ${p.name}`} onChange={(v) => void onUpdate(p, { active: v })} /> },
        { key: "x", head: "", align: "right", render: (p) => (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <Btn small kind="ghost" onClick={() => setPhotosFor(p.id)}>Photos</Btn>
            <Btn small kind="ghost" onClick={() => setEdit(p)}>Edit</Btn>
            <Btn small kind="danger" onClick={() => {
              if (confirm(`Delete "${p.name}" permanently?\n\nIts photos and customer reviews are deleted too. Past orders keep their details.\nTip: switch "Listed" off instead to hide it from the shop.`)) void onDelete(p);
            }}>Delete</Btn>
          </div>
        ) },
      ]} />
      {edit && <ProductForm p={edit === "new" ? null : edit} onClose={() => setEdit(null)}
        onSave={async (d) => {
          if (edit === "new") {
            const id = await onCreate(d);
            if (id) { setEdit(null); setPhotosFor(id); } // straight on to adding photos
          } else if (await onUpdate(edit, d)) setEdit(null);
        }} />}
      {photoProduct && <ProductPhotosModal p={photoProduct} onClose={() => setPhotosFor(null)} onSave={(images) => onUpdate(photoProduct, { images })} />}
    </Panel>
  );
}

const CATEGORIES = [["domestic", "Home purifier"], ["commercial", "Commercial RO"], ["spare", "Spare part / filter"]] as const;
const ARTS = [["classic", "Purifier — classic"], ["pro", "Purifier — pro"], ["premium", "Purifier — premium"], ["commercial", "Commercial plant"], ["spare", "Spare parts"], ["cartridge", "Filter cartridge"]] as const;

/** Add a new product or edit every detail of an existing one. */
function ProductForm({ p, onClose, onSave }: { p: AdminProduct | null; onClose: () => void; onSave: (d: ProductDraft) => Promise<void> }) {
  const [f, setF] = useState({
    name: p?.name ?? "", category: p?.category ?? "spare", spec: p?.spec ?? "", price: p ? String(p.price) : "", mrp: p ? String(p.mrp) : "",
    stock: p?.stock == null ? "" : String(p.stock), stages: p?.stages ?? "", warranty: p?.warranty ?? "", description: p?.description ?? "",
    art: p?.art ?? "cartridge",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, digits = false) => (e: { target: { value: string } }) => setF({ ...f, [k]: digits ? e.target.value.replace(/\D/g, "").slice(0, 7) : e.target.value });
  const pr = Number(f.price), m = Number(f.mrp), st = f.stock === "" ? null : Number(f.stock);
  const err = f.name.trim().length < 3 ? "Enter the product name"
    : !pr ? "Enter the selling price" : !m ? "Enter the MRP" : pr > m ? "Selling price can't be higher than MRP"
    : f.description.trim().length < 10 ? "Add a short description (at least 10 characters)" : null;

  const save = async () => {
    if (err) return;
    setBusy(true);
    await onSave({
      name: f.name.trim(), category: f.category, spec: f.spec.trim(), price: pr, mrp: m, stock: st,
      stages: f.stages.trim(), warranty: f.warranty.trim(), description: f.description.trim(), art: f.art,
    });
    setBusy(false);
  };

  const field = (label: string, el: React.ReactNode, span = false) => <label style={span ? { gridColumn: "1 / -1" } : undefined}><span style={fieldLabel}>{label}</span>{el}</label>;
  return (
    <Modal title={p ? `Edit ${p.name}` : "Add product"} onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!!err || busy} onClick={() => void save()}>{busy ? "Saving…" : p ? "Save changes" : "Add product"}</Btn>
    </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {field("Product name", <input value={f.name} onChange={set("name")} maxLength={80} placeholder="e.g. RO Membrane Housing (White)" style={input} />, true)}
        {field("Category", <select value={f.category} onChange={set("category")} style={input}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>)}
        {field("Short spec line", <input value={f.spec} onChange={set("spec")} maxLength={60} placeholder="e.g. Universal fit · 12 inch" style={input} />)}
        {field("Selling price (₹)", <input value={f.price} onChange={set("price", true)} inputMode="numeric" style={input} />)}
        {field("MRP (₹)", <input value={f.mrp} onChange={set("mrp", true)} inputMode="numeric" style={input} />)}
        {field("Stock (blank = not tracked)", <input value={f.stock} onChange={set("stock", true)} inputMode="numeric" style={input} />)}
        {field("Warranty", <input value={f.warranty} onChange={set("warranty")} maxLength={40} placeholder="e.g. 6 Months" style={input} />)}
        {field("Stages / size / capacity", <input value={f.stages} onChange={set("stages")} maxLength={40} placeholder="e.g. 7 Stage · 75 GPD · Pack of 3" style={input} />)}
        {field("Picture until photos are added", <select value={f.art} onChange={set("art")} style={input}>{ARTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>)}
        {field("Description", <textarea value={f.description} onChange={set("description")} rows={4} maxLength={600} placeholder="What it does, what it fits, what's included…" style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />, true)}
      </div>
      {err && (f.name || f.price || f.mrp) ? <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>
        : pr && m && pr <= m ? <p style={{ ...muted, margin: "10px 0 0" }}>Customers will see {Math.round((1 - pr / m) * 100)}% off.{!p && " Next you can add photos."}</p> : null}
    </Modal>
  );
}

/* ───────────────────────── Product photos ───────────────────────── */

const MAX_PRODUCT_PHOTOS = 6;

/** Add, replace, reorder and delete a product's photos. Every change saves straight away;
 * the first photo is the cover shown in the shop and app. */
function ProductPhotosModal({ p, onClose, onSave }: { p: AdminProduct; onClose: () => void; onSave: (images: string[]) => Promise<boolean> }) {
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replacing = useRef<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  // Kept here so back-to-back changes build on the last saved list, not a stale reload.
  const [images, setImages] = useState(p.images);
  const left = MAX_PRODUCT_PHOTOS - images.length;

  /** Saves the new list, then deletes files that are no longer used. */
  const commit = async (next: string[], label: string) => {
    setBusy(label); setErr(null);
    const ok = await onSave(next);
    if (ok) setImages(next);
    if (ok) await removeProductImages(images.filter((u) => !next.includes(u))).catch(() => undefined);
    setBusy(null);
    return ok;
  };
  const upload = async (files: File[]) => Promise.all(files.map(async (f) => uploadProductImage(p.id, await compressImage(f, 1200, 0.85))));

  const add = async (list: FileList | null) => {
    const files = Array.from(list ?? []).slice(0, left);
    if (addRef.current) addRef.current.value = "";
    if (!files.length) return;
    setBusy("Uploading…"); setErr(null);
    try {
      const urls = await upload(files);
      if (!(await commit([...images, ...urls], "Saving…"))) await removeProductImages(urls).catch(() => undefined);
      if ((list?.length ?? 0) > files.length) setErr(`Up to ${MAX_PRODUCT_PHOTOS} photos per product — extra ones were skipped.`);
    } catch (e) { setErr(friendly(e)); setBusy(null); }
  };
  const replace = async (list: FileList | null) => {
    const i = replacing.current;
    const file = list?.[0];
    if (replaceRef.current) replaceRef.current.value = "";
    if (i == null || !file) return;
    setBusy("Uploading…"); setErr(null);
    try {
      const [url] = await upload([file]);
      if (!(await commit(images.map((u, j) => (j === i ? url : u)), "Saving…"))) await removeProductImages([url]).catch(() => undefined);
    } catch (e) { setErr(friendly(e)); setBusy(null); }
  };
  const move = (i: number, to: number) => {
    const next = [...images];
    const [img] = next.splice(i, 1);
    next.splice(to, 0, img);
    void commit(next, "Saving…");
  };
  const remove = (i: number) => {
    if (confirm(`Delete photo ${i + 1} of ${p.name}? This can't be undone.`)) void commit(images.filter((_, j) => j !== i), "Deleting…");
  };

  return (
    <Modal title={`Photos · ${p.name}`} onClose={onClose} footer={<Btn onClick={onClose}>Done</Btn>}>
      <p style={{ ...muted, margin: "0 0 12px", lineHeight: 1.5 }}>
        The first photo is the cover customers see in the shop and the app. Changes save immediately. Without photos, the product shows its illustration.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
        {images.map((src, i) => (
          <div key={src} style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", background: "var(--surface)" }}>
            <button onClick={() => setView(src)} aria-label={`View photo ${i + 1}`} style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", padding: 0, border: "none", background: "var(--bg-secondary)", cursor: "zoom-in", display: "block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${p.name} photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              {i === 0 && <span style={{ position: "absolute", top: 6, left: 6 }}><Badge tone="blue">Cover</Badge></span>}
            </button>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 6, justifyContent: "center" }}>
              {i > 0 && <Btn small kind="ghost" disabled={!!busy} onClick={() => move(i, 0)}>Make cover</Btn>}
              {i > 0 && <Btn small kind="ghost" disabled={!!busy} onClick={() => move(i, i - 1)}>←</Btn>}
              {i < images.length - 1 && <Btn small kind="ghost" disabled={!!busy} onClick={() => move(i, i + 1)}>→</Btn>}
              <Btn small kind="ghost" disabled={!!busy} onClick={() => { replacing.current = i; replaceRef.current?.click(); }}>Replace</Btn>
              <Btn small kind="danger" disabled={!!busy} onClick={() => remove(i)}>Delete</Btn>
            </div>
          </div>
        ))}
        {left > 0 && (
          <button onClick={() => addRef.current?.click()} disabled={!!busy} style={{
            minHeight: 130, borderRadius: 12, border: "1.5px dashed var(--blue)", background: "var(--blue-tint)", color: "var(--blue)",
            cursor: busy ? "wait" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 700, fontSize: 13,
          }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{busy ? "⏳" : "＋"}</span>
            {busy ?? (images.length ? "Add more photos" : "Upload photos")}
          </button>
        )}
      </div>
      <input ref={addRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void add(e.target.files)} />
      <input ref={replaceRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void replace(e.target.files)} />
      <p style={{ ...muted, margin: "10px 0 0", color: err ? "var(--error-text)" : undefined, fontWeight: err ? 600 : 400 }}>
        {err ?? (busy && images.length >= MAX_PRODUCT_PHOTOS ? busy : `${images.length}/${MAX_PRODUCT_PHOTOS} photos · JPG, PNG or WebP · large photos are resized automatically`)}
      </p>
      {view && <PhotoViewer src={view} onClose={() => setView(null)} />}
    </Modal>
  );
}

/* ───────────────────────── Coupons ───────────────────────── */

export function CouponsSection({ coupons, onUpdate, onCreate }: {
  coupons: AdminCoupon[]; onUpdate: (c: AdminCoupon, patch: { active: boolean }) => Promise<boolean>; onCreate: (c: AdminCoupon) => Promise<boolean>;
}) {
  const [creating, setCreating] = useState(false);
  return (
    <Panel title="Offers & coupons" pad={false} actions={<Btn onClick={() => setCreating(true)}>+ New coupon</Btn>}>
      <Table rows={coupons} rowKey={(c) => c.code} cols={[
        { key: "c", head: "Code", render: (c) => <><b style={{ letterSpacing: "0.04em" }}>{c.code}</b><div style={muted}>{c.title}</div></> },
        { key: "v", head: "Discount", render: (c) => c.kind === "flat" ? inr(c.value) : `${c.value}%${c.maxOff ? ` (max ${inr(c.maxOff)})` : ""}` },
        { key: "m", head: "Min order", align: "right", render: (c) => inr(c.minOrder) },
        { key: "on", head: "Applies to", render: (c) => <Badge tone={c.appliesTo === "product" ? "blue" : c.appliesTo === "service" ? "purple" : "green"}>{c.appliesTo === "all" ? "Everything" : c.appliesTo === "product" ? "Products" : "Services"}</Badge> },
        { key: "u", head: "Used", align: "right", render: (c) => c.used },
        { key: "e", head: "Expires", render: (c) => <span style={muted}>{c.expires}</span> },
        { key: "a", head: "Active", render: (c) => <Toggle on={c.active} label={`Activate ${c.code}`} onChange={(v) => void onUpdate(c, { active: v })} /> },
      ]} />
      {creating && <CouponModal existing={coupons.map((c) => c.code)} onClose={() => setCreating(false)} onSave={async (c) => { if (await onCreate(c)) setCreating(false); }} />}
    </Panel>
  );
}

function CouponModal({ existing, onClose, onSave }: { existing: string[]; onClose: () => void; onSave: (c: AdminCoupon) => void }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Coupon["kind"]>("flat");
  const [value, setValue] = useState("");
  const [maxOff, setMaxOff] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [appliesTo, setAppliesTo] = useState<Coupon["appliesTo"]>("all");
  const [expires, setExpires] = useState(isoDay(90));

  const v = Number(value);
  const err = !/^[A-Z0-9]{4,12}$/.test(code) ? "Code: 4–12 letters or digits"
    : existing.includes(code) ? "That code already exists"
    : !title.trim() ? "Add a short title"
    : !v ? "Enter the discount"
    : kind === "percent" && v > 50 ? "Percent discount can't exceed 50%"
    : null;

  const save = () => {
    const d = new Date(`${expires}T00:00`);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    onSave({
      code, title: title.trim(), kind, value: v, maxOff: kind === "percent" && maxOff ? Number(maxOff) : undefined,
      minOrder: Number(minOrder) || 0, appliesTo, active: true, used: 0,
      desc: `${kind === "flat" ? inr(v) : `${v}%`} off${Number(minOrder) ? ` on orders above ${inr(Number(minOrder))}` : ""}.`,
      expires: `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`, expiresIso: expires,
    });
  };

  return (
    <Modal title="New coupon" onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!!err} onClick={save}>Create coupon</Btn>
    </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label><span style={fieldLabel}>Code</span><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="DIWALI500" style={input} /></label>
        <label><span style={fieldLabel}>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Diwali offer" style={input} /></label>
        <label><span style={fieldLabel}>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as Coupon["kind"])} style={input}><option value="flat">Flat ₹ off</option><option value="percent">% off</option></select>
        </label>
        <label><span style={fieldLabel}>{kind === "flat" ? "Amount (₹)" : "Percent"}</span><input value={value} inputMode="numeric" onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} style={input} /></label>
        {kind === "percent" && <label><span style={fieldLabel}>Max discount (₹)</span><input value={maxOff} inputMode="numeric" onChange={(e) => setMaxOff(e.target.value.replace(/\D/g, ""))} style={input} /></label>}
        <label><span style={fieldLabel}>Min order (₹)</span><input value={minOrder} inputMode="numeric" onChange={(e) => setMinOrder(e.target.value.replace(/\D/g, ""))} style={input} /></label>
        <label><span style={fieldLabel}>Applies to</span>
          <select value={appliesTo} onChange={(e) => setAppliesTo(e.target.value as Coupon["appliesTo"])} style={input}><option value="all">Everything</option><option value="product">Products</option><option value="service">Services</option></select>
        </label>
        <label><span style={fieldLabel}>Expires</span><input type="date" value={expires} min={isoDay()} onChange={(e) => setExpires(e.target.value)} style={input} /></label>
      </div>
      {err && (code || title || value) ? <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p> : null}
    </Modal>
  );
}

/* ───────────────────────── Review moderation ───────────────────────── */

type ReviewFilter = "All" | "Flagged" | "Published" | "Hidden";

export function ReviewsSection({ reviews, onStatus, onDelete }: {
  reviews: AdminReview[]; onStatus: (r: AdminReview, status: AdminReview["status"]) => Promise<void>; onDelete: (r: AdminReview) => Promise<void>;
}) {
  const [f, setF] = useState<ReviewFilter>("All");
  const rows = reviews.filter((r) => f === "All" || r.status === f);
  const counts = { All: reviews.length, Flagged: reviews.filter((r) => r.status === "Flagged").length, Published: reviews.filter((r) => r.status === "Published").length, Hidden: reviews.filter((r) => r.status === "Hidden").length };

  return (
    <Panel title="Ratings & reviews" pad={false}>
      <div style={{ padding: "12px 16px" }}><Filter<ReviewFilter> options={["All", "Flagged", "Published", "Hidden"]} value={f} onChange={setF} counts={counts} /></div>
      <Table rows={rows} rowKey={(r) => r.id} empty="No reviews here." cols={[
        { key: "a", head: "Review", render: (r) => (
          <div style={{ maxWidth: 420 }}>
            <span style={{ color: "var(--gold-dark)", fontWeight: 700 }}>{"★".repeat(r.stars)}</span><span style={{ color: "var(--line-strong)" }}>{"★".repeat(5 - r.stars)}</span>
            <span style={{ ...muted, marginLeft: 8 }}>{r.author} · {r.date}</span>
            <div style={{ marginTop: 3, lineHeight: 1.5, color: r.status === "Hidden" ? "var(--ink-mute)" : "var(--ink)" }}>{r.body}</div>
          </div>
        ) },
        { key: "on", head: "About", render: (r) => r.productId ? <>{productById(r.productId)?.name}<div style={muted}>Product</div></> : <>{techById(r.techId ?? "")?.name ?? "—"}<div style={muted}>Technician</div></> },
        { key: "s", head: "Status", render: (r) => <Badge tone={r.status === "Published" ? "green" : r.status === "Flagged" ? "red" : "grey"}>{r.status}</Badge> },
        { key: "x", head: "", align: "right", render: (r) => (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            {r.status !== "Published" && <Btn small kind="ghost" onClick={() => void onStatus(r, "Published")}>Publish</Btn>}
            {r.status !== "Hidden" && <Btn small kind="ghost" onClick={() => void onStatus(r, "Hidden")}>Hide</Btn>}
            <Btn small kind="danger" onClick={() => { if (confirm("Delete this review permanently?")) void onDelete(r); }}>Delete</Btn>
          </div>
        ) },
      ]} />
    </Panel>
  );
}

/* ───────────────────────── Broadcast notifications ───────────────────────── */

export function BroadcastSection({ history, onSend }: {
  history: Broadcast[]; onSend: (b: { title: string; body: string; audience: string }) => Promise<number | null>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<string>(AUDIENCES[0]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const ok = title.trim().length >= 3 && body.trim().length >= 5;

  const send = async () => {
    setBusy(true);
    const reach = await onSend({ title: title.trim(), body: body.trim(), audience });
    setBusy(false);
    if (reach != null) { setTitle(""); setBody(""); setConfirm(false); }
  };

  return (
    <div className="admin-grid-2">
      <Panel title="Send an in-app notification">
        <label><span style={fieldLabel}>Title</span><input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Diwali sale is live" style={input} /></label>
        <label style={{ display: "block", marginTop: 12 }}><span style={fieldLabel}>Message</span>
          <textarea value={body} maxLength={180} rows={3} onChange={(e) => setBody(e.target.value)} placeholder="Save up to ₹3,000 on RO purifiers till 3 Nov." style={{ ...input, resize: "vertical" }} />
          <span style={{ ...muted, float: "right" }}>{body.length}/180</span>
        </label>
        <label style={{ display: "block", marginTop: 12, clear: "both" }}><span style={fieldLabel}>Audience</span>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} style={input}>
            {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <p style={{ ...muted, margin: "8px 0 0" }}>Appears in each person&apos;s notification centre in the app. Customers who turned off offers won&apos;t get it. SMS and WhatsApp need a messaging provider first.</p>

        <div style={{ marginTop: 16, padding: 12, borderRadius: 14, background: "var(--bg-secondary)" }}>
          <p style={{ ...muted, margin: "0 0 6px", fontWeight: 700 }}>PREVIEW</p>
          <div style={{ background: "var(--surface)", borderRadius: 12, padding: "10px 12px", boxShadow: "var(--shadow-card)" }}>
            <p style={{ margin: 0, fontSize: 11, color: "var(--ink-mute)" }}>ZAVTOO · now</p>
            <p style={{ margin: "2px 0 0", fontSize: 13.5, fontWeight: 700 }}>{title || "Notification title"}</p>
            <p style={{ margin: "1px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>{body || "Your message appears here."}</p>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <Btn disabled={!ok} onClick={() => setConfirm(true)}>Review &amp; send</Btn>
        </div>
      </Panel>

      <Panel title="Sent" pad={false}>
        {history.map((b, i) => (
          <div key={b.id} style={{ padding: "12px 16px", borderTop: i ? "1px solid var(--line)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 13.5 }}>{b.title}</b><span style={muted}>{b.reach.toLocaleString("en-IN")} reached</span></div>
            <p style={{ margin: "2px 0 4px", fontSize: 12.5, color: "var(--ink-soft)" }}>{b.body}</p>
            <span style={muted}>{b.audience} · {b.sentAt}</span>
          </div>
        ))}
        {history.length === 0 && <p style={{ ...muted, padding: 16, margin: 0 }}>Nothing sent yet.</p>}
      </Panel>

      {confirm && (
        <Modal title="Send notification?" onClose={() => setConfirm(false)} footer={<>
          <Btn kind="ghost" onClick={() => setConfirm(false)}>Back</Btn>
          <Btn disabled={busy} onClick={send}>{busy ? "Sending…" : "Send now"}</Btn>
        </>}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>&ldquo;{title}&rdquo; goes to <b>{audience}</b> right away. It can&apos;t be unsent.</p>
        </Modal>
      )}
    </div>
  );
}
