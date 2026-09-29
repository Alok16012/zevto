"use client";

import { useState } from "react";
import { Toggle } from "../components/ui";
import { inr, productById, techById, type Coupon } from "../lib/data";
import { AUDIENCES, TODAY, type AdminCoupon, type AdminProduct, type AdminReview, type Broadcast } from "../lib/adminData";
import { Badge, Btn, Filter, Modal, Panel, Table, fieldLabel, input, muted } from "./kit";

/* ───────────────────────── Products & stock ───────────────────────── */

export function ProductsSection({ products, onUpdate, notify }: {
  products: AdminProduct[]; onUpdate: (id: string, patch: Partial<AdminProduct>) => void; notify: (m: string) => void;
}) {
  const [edit, setEdit] = useState<AdminProduct | null>(null);
  return (
    <Panel title="Products & stock" pad={false}>
      <Table rows={products} rowKey={(p) => p.id} cols={[
        { key: "n", head: "Product", render: (p) => <><b style={{ color: p.active ? "var(--ink)" : "var(--ink-mute)" }}>{p.name}</b><div style={{ ...muted, textTransform: "capitalize" }}>{p.category}</div></> },
        { key: "p", head: "Price", align: "right", render: (p) => <><b>{inr(p.price)}</b><div style={{ ...muted, textDecoration: "line-through" }}>{inr(p.mrp)}</div></> },
        { key: "d", head: "Discount", align: "right", render: (p) => `${Math.round((1 - p.price / p.mrp) * 100)}%` },
        { key: "s", head: "Stock", align: "right", render: (p) => <span style={{ fontWeight: 700, color: p.stock === 0 ? "var(--error-text)" : p.stock <= 5 ? "var(--warning-text)" : "var(--ink)" }}>{p.stock}</span> },
        { key: "st", head: "Status", render: (p) => p.stock === 0 ? <Badge tone="red">Out of stock</Badge> : p.stock <= 5 ? <Badge tone="amber">Low stock</Badge> : <Badge tone="green">In stock</Badge> },
        { key: "a", head: "Listed", render: (p) => <Toggle on={p.active} label={`List ${p.name}`} onChange={(v) => { onUpdate(p.id, { active: v }); notify(v ? `${p.name} is live in the app` : `${p.name} hidden from the app`); }} /> },
        { key: "x", head: "", align: "right", render: (p) => <Btn small kind="ghost" onClick={() => setEdit(p)}>Edit</Btn> },
      ]} />
      {edit && <ProductModal p={edit} onClose={() => setEdit(null)} onSave={(patch) => { onUpdate(edit.id, patch); notify(`${edit.name} updated`); setEdit(null); }} />}
    </Panel>
  );
}

function ProductModal({ p, onClose, onSave }: { p: AdminProduct; onClose: () => void; onSave: (patch: Partial<AdminProduct>) => void }) {
  const [price, setPrice] = useState(String(p.price));
  const [mrp, setMrp] = useState(String(p.mrp));
  const [stock, setStock] = useState(String(p.stock));
  const pr = Number(price), m = Number(mrp), s = Number(stock);
  const err = !pr || !m ? "Price and MRP are required" : pr > m ? "Price can't be higher than MRP" : s < 0 ? "Stock can't be negative" : null;

  return (
    <Modal title={`Edit ${p.name}`} onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!!err} onClick={() => onSave({ price: pr, mrp: m, stock: s })}>Save</Btn>
    </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {([["Selling price", price, setPrice], ["MRP", mrp, setMrp], ["Stock", stock, setStock]] as const).map(([l, v, set]) => (
          <label key={l}><span style={fieldLabel}>{l}</span><input value={v} inputMode="numeric" onChange={(e) => set(e.target.value.replace(/\D/g, ""))} style={input} /></label>
        ))}
      </div>
      {err ? <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>
        : <p style={{ ...muted, margin: "10px 0 0" }}>Customers will see {Math.round((1 - pr / m) * 100)}% off.</p>}
    </Modal>
  );
}

/* ───────────────────────── Coupons ───────────────────────── */

export function CouponsSection({ coupons, onUpdate, onCreate, notify }: {
  coupons: AdminCoupon[]; onUpdate: (code: string, patch: Partial<AdminCoupon>) => void; onCreate: (c: AdminCoupon) => void; notify: (m: string) => void;
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
        { key: "a", head: "Active", render: (c) => <Toggle on={c.active} label={`Activate ${c.code}`} onChange={(v) => { onUpdate(c.code, { active: v }); notify(v ? `${c.code} is live` : `${c.code} paused`); }} /> },
      ]} />
      {creating && <CouponModal existing={coupons.map((c) => c.code)} onClose={() => setCreating(false)} onSave={(c) => { onCreate(c); notify(`${c.code} created`); setCreating(false); }} />}
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
  const [expires, setExpires] = useState("2026-12-31");

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
      expires: `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`,
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
        <label><span style={fieldLabel}>Expires</span><input type="date" value={expires} min="2026-09-29" onChange={(e) => setExpires(e.target.value)} style={input} /></label>
      </div>
      {err && (code || title || value) ? <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p> : null}
    </Modal>
  );
}

/* ───────────────────────── Review moderation ───────────────────────── */

type ReviewFilter = "All" | "Flagged" | "Published" | "Hidden";

export function ReviewsSection({ reviews, onUpdate, onDelete, notify }: {
  reviews: AdminReview[]; onUpdate: (id: string, patch: Partial<AdminReview>) => void; onDelete: (id: string) => void; notify: (m: string) => void;
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
            {r.status !== "Published" && <Btn small kind="ghost" onClick={() => { onUpdate(r.id, { status: "Published" }); notify("Review published"); }}>Publish</Btn>}
            {r.status !== "Hidden" && <Btn small kind="ghost" onClick={() => { onUpdate(r.id, { status: "Hidden" }); notify("Review hidden from the app"); }}>Hide</Btn>}
            {r.status === "Flagged" && <Btn small kind="danger" onClick={() => { onDelete(r.id); notify("Spam review removed"); }}>Remove</Btn>}
          </div>
        ) },
      ]} />
    </Panel>
  );
}

/* ───────────────────────── Broadcast notifications ───────────────────────── */

export function BroadcastSection({ history, onSend }: { history: Broadcast[]; onSend: (b: Broadcast) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("All customers");
  const [channels, setChannels] = useState<string[]>(["Push"]);
  const [confirm, setConfirm] = useState(false);
  const ok = title.trim().length >= 3 && body.trim().length >= 5 && channels.length > 0;
  const toggle = (c: string) => setChannels((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));

  const send = () => {
    onSend({ id: `b${Date.now()}`, title: title.trim(), body: body.trim(), audience, channels, sentAt: `${TODAY}, ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()}`, reach: AUDIENCES[audience] });
    setTitle(""); setBody(""); setConfirm(false);
  };

  return (
    <div className="admin-grid-2">
      <Panel title="Send a notification">
        <label><span style={fieldLabel}>Title</span><input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Diwali sale is live 🪔" style={input} /></label>
        <label style={{ display: "block", marginTop: 12 }}><span style={fieldLabel}>Message</span>
          <textarea value={body} maxLength={180} rows={3} onChange={(e) => setBody(e.target.value)} placeholder="Save up to ₹3,000 on RO purifiers till 3 Nov." style={{ ...input, resize: "vertical" }} />
          <span style={{ ...muted, float: "right" }}>{body.length}/180</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12, clear: "both" }}>
          <label><span style={fieldLabel}>Audience</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} style={input}>
              {Object.entries(AUDIENCES).map(([a, n]) => <option key={a} value={a}>{a} ({n.toLocaleString("en-IN")})</option>)}
            </select>
          </label>
          <div><span style={fieldLabel}>Channels</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Push", "SMS", "WhatsApp"].map((c) => (
                <button key={c} onClick={() => toggle(c)} aria-pressed={channels.includes(c)} style={{ padding: "7px 11px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: channels.includes(c) ? "1.5px solid var(--blue)" : "1.5px solid var(--line-strong)", background: channels.includes(c) ? "var(--blue-tint)" : "var(--surface)", color: channels.includes(c) ? "var(--blue)" : "var(--text-secondary)" }}>{c}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Phone-style preview */}
        <div style={{ marginTop: 16, padding: 12, borderRadius: 14, background: "var(--bg-secondary)" }}>
          <p style={{ ...muted, margin: "0 0 6px", fontWeight: 700 }}>PREVIEW</p>
          <div style={{ background: "var(--surface)", borderRadius: 12, padding: "10px 12px", boxShadow: "var(--shadow-card)" }}>
            <p style={{ margin: 0, fontSize: 11, color: "var(--ink-mute)" }}>ZAVTOO · now</p>
            <p style={{ margin: "2px 0 0", fontSize: 13.5, fontWeight: 700 }}>{title || "Notification title"}</p>
            <p style={{ margin: "1px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>{body || "Your message appears here."}</p>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <Btn disabled={!ok} onClick={() => setConfirm(true)}>Review & send</Btn>
        </div>
      </Panel>

      <Panel title="Sent" pad={false}>
        {history.map((b, i) => (
          <div key={b.id} style={{ padding: "12px 16px", borderTop: i ? "1px solid var(--line)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 13.5 }}>{b.title}</b><span style={muted}>{b.reach.toLocaleString("en-IN")} reached</span></div>
            <p style={{ margin: "2px 0 4px", fontSize: 12.5, color: "var(--ink-soft)" }}>{b.body}</p>
            <span style={muted}>{b.audience} · {b.channels.join(", ")} · {b.sentAt}</span>
          </div>
        ))}
      </Panel>

      {confirm && (
        <Modal title="Send notification?" onClose={() => setConfirm(false)} footer={<>
          <Btn kind="ghost" onClick={() => setConfirm(false)}>Back</Btn>
          <Btn onClick={send}>Send to {AUDIENCES[audience].toLocaleString("en-IN")} people</Btn>
        </>}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>&ldquo;{title}&rdquo; goes to <b>{audience}</b> via {channels.join(", ")}. This can&apos;t be unsent. (Demo: nothing is actually delivered.)</p>
        </Modal>
      )}
    </div>
  );
}
