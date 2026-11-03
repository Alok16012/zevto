"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage } from "../components/PhotoPicker";
import { Toggle } from "../components/ui";
import {
  DEFAULT_INVOICE_SETTINGS, invoiceNotSetUp, isInvoiceTableMissing, loadInvoiceSetup,
  type InvoiceSettings, type InvoiceTerms, type TermsPosition,
} from "../lib/invoiceSettings";
import { removeProductImages, uploadProductImage } from "../lib/photos";
import { friendly, supabaseFor } from "../lib/supabase";
import { Btn, Filter, Modal, Panel, Table, fieldLabel, input, muted } from "./kit";
import { printBill } from "./printBill";

/* ───────────────────────── Invoice settings ─────────────────────────
 * Company profile, the look of printed purchase / sale bills, and the terms &
 * conditions templates picked per bill. Tables: invoice_settings, invoice_terms
 * (supabase/invoice-settings-migration.sql). */

type Notify = (msg: string, bad?: boolean) => void;
type Tab = "Company Profile" | "Invoice Setting" | "Terms & Conditions";
const TABS: Tab[] = ["Company Profile", "Invoice Setting", "Terms & Conditions"];

const sb = () => supabaseFor("admin");
const fail = (e: { message: string }, notify: Notify) => { notify(isInvoiceTableMissing(e.message) ? invoiceNotSetUp : friendly(e), true); };

export function InvoiceSettingsSection({ notify }: { notify: Notify }) {
  const [tab, setTab] = useState<Tab>("Company Profile");
  const [setup, setSetup] = useState<{ settings: InvoiceSettings; terms: InvoiceTerms[]; ready: boolean } | null>(null);
  const reload = () => loadInvoiceSetup().then(setSetup);
  useEffect(() => { void reload(); }, []);

  if (!setup) return <p style={muted}>Loading invoice settings…</p>;
  const save = async (patch: Partial<InvoiceSettings>, ok: string) => {
    const { error } = await sb().from("invoice_settings").upsert({ id: 1, ...patch });
    if (error) { fail(error, notify); return false; }
    setSetup({ ...setup, settings: { ...setup.settings, ...patch } });
    notify(ok);
    return true;
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {!setup.ready && <p role="alert" style={{ margin: 0, padding: "10px 14px", borderRadius: 12, background: "var(--warning)", color: "var(--warning-text)", fontSize: 13, fontWeight: 600 }}>{invoiceNotSetUp}</p>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Filter options={TABS} value={tab} onChange={setTab} />
        <Btn small kind="ghost" onClick={() => preview(setup.settings, setup.terms)}>👁 Preview invoice</Btn>
      </div>
      {tab === "Company Profile" && <CompanyProfile settings={setup.settings} onSave={save} />}
      {tab === "Invoice Setting" && <InvoiceLook settings={setup.settings} terms={setup.terms} onSave={save} notify={notify} />}
      {tab === "Terms & Conditions" && <TermsList terms={setup.terms} defaultId={setup.settings.default_terms} notify={notify} onChanged={reload}
        onDefault={(id) => save({ default_terms: id }, id ? "Default terms set" : "No default terms")} />}
    </div>
  );
}

/** A sample sale bill with the settings as they are on screen. */
function preview(settings: InvoiceSettings, terms: InvoiceTerms[]) {
  printBill({
    ref: "SAL-PREVIEW", kind: "Sale", bill_no: "", bill_date: new Date().toISOString().slice(0, 10), status: "Posted", cancel_reason: "", notes: "",
    items: [{ name: "Sediment Filter 5 Micron (Pack of 3)", qty: 2, rate: 299 }, { name: "RO Booster Pump 24V DC Motor", qty: 1, rate: 1299 }],
    subtotal: 1897, tax: 0, total: 1897,
  }, { code: "PTY-SAMPLE", type: "Dealer", name: "Sample Dealer", contact: "", phone: "98765 43210", email: "", gstin: "", address: "Shop 4, Main Market", city: "New Delhi", state: "Delhi" },
  { settings, terms });
}

/* ─────── Company profile ─────── */

const PROFILE_FIELDS: { key: keyof InvoiceSettings; label: string; wide?: boolean; area?: boolean; max?: number; placeholder?: string }[] = [
  { key: "company_name", label: "Company name" },
  { key: "gstin", label: "GSTIN", max: 15, placeholder: "07ABCDE1234F1Z5" },
  { key: "address", label: "Address", wide: true, area: true, max: 300 },
  { key: "state", label: "State" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Mobile 1", max: 20 },
  { key: "phone2", label: "Mobile 2", max: 20 },
  { key: "email", label: "Email", wide: true },
];
const BANK_FIELDS: { key: keyof InvoiceSettings; label: string; max?: number; placeholder?: string }[] = [
  { key: "bank_name", label: "Bank", placeholder: "e.g. HDFC Bank" },
  { key: "account_name", label: "Account name" },
  { key: "account_no", label: "Account number", max: 30 },
  { key: "ifsc", label: "IFSC", max: 11, placeholder: "HDFC0001234" },
  { key: "branch", label: "Branch" },
  { key: "upi_id", label: "UPI ID", placeholder: "name@bank" },
];

function CompanyProfile({ settings, onSave }: { settings: InvoiceSettings; onSave: (p: Partial<InvoiceSettings>, ok: string) => Promise<boolean> }) {
  const keys = [...PROFILE_FIELDS, ...BANK_FIELDS].map((f) => f.key);
  const pick = (s: InvoiceSettings) => Object.fromEntries(keys.map((k) => [k, String(s[k] ?? "")])) as Record<string, string>;
  const [f, setF] = useState(() => pick(settings));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = keys.some((k) => f[k] !== String(settings[k] ?? ""));
  const set = (k: string) => (e: { target: { value: string } }) => { setErr(null); setF({ ...f, [k]: e.target.value }); };

  const submit = async () => {
    const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, k === "gstin" || k === "ifsc" ? v.trim().toUpperCase() : v.trim()]));
    if (clean.company_name.length < 2) return setErr("Enter the company name.");
    if (clean.gstin && !/^[0-9A-Z]{15}$/.test(clean.gstin)) return setErr("GSTIN is 15 letters and numbers.");
    if (clean.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean.ifsc)) return setErr("IFSC looks wrong — it's 11 characters, like HDFC0001234.");
    if (clean.email && !/^\S+@\S+\.\S+$/.test(clean.email)) return setErr("Enter a valid email.");
    setBusy(true);
    if (await onSave(clean, "Company profile saved")) setF(clean);
    setBusy(false);
  };
  const field = (x: (typeof PROFILE_FIELDS)[number]) => (
    <label key={x.key} style={x.wide ? { gridColumn: "1 / -1" } : undefined}><span style={fieldLabel}>{x.label}</span>
      {x.area
        ? <textarea value={f[x.key]} onChange={set(x.key)} maxLength={x.max ?? 120} rows={2} style={{ ...input, resize: "vertical" }} />
        : <input value={f[x.key]} onChange={set(x.key)} maxLength={x.max ?? 120} placeholder={x.placeholder} style={input} />}
    </label>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
      <Panel title="Company details">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>{PROFILE_FIELDS.map(field)}</div>
      </Panel>
      <Panel title="Bank details">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>{BANK_FIELDS.map(field)}</div>
        <p style={{ ...muted, margin: "12px 0 0" }}>Printed on sale invoices when “Bank details” is switched on in Invoice Setting.</p>
      </Panel>
      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
        {err && <p role="alert" style={{ margin: 0, color: "var(--error-text)", fontWeight: 600, fontSize: 13 }}>{err}</p>}
        <Btn disabled={!dirty || busy} onClick={() => void submit()}>{busy ? "Saving…" : "Update"}</Btn>
      </div>
    </div>
  );
}

/* ─────── Invoice look ─────── */

type ImageKey = "logo_url" | "qr_url" | "signature_url" | "header_url" | "footer_url";
const IMAGES: { key: ImageKey; label: string; hint: string; maxSide: number; show?: keyof InvoiceSettings }[] = [
  { key: "logo_url", label: "Invoice logo", hint: "Top left of the invoice · leave empty to use the Zavtoo logo", maxSide: 800, show: "show_logo" },
  { key: "qr_url", label: "Payment QR code", hint: "Your UPI QR · printed on sale invoices", maxSide: 800, show: "show_qr" },
  { key: "signature_url", label: "Stamp & signature", hint: "Above “Authorised signatory” · a photo on a white background works best", maxSide: 800, show: "show_signature" },
  { key: "header_url", label: "Invoice header image", hint: "Full-width banner above the invoice · about 2000 × 300 px", maxSide: 2000, show: "show_header" },
  { key: "footer_url", label: "Invoice footer image", hint: "Full-width banner at the bottom · about 2000 × 300 px", maxSide: 2000, show: "show_footer" },
];
const TOGGLES: { key: keyof InvoiceSettings; label: string }[] = [
  { key: "show_header", label: "Header image" }, { key: "show_footer", label: "Footer image" }, { key: "show_logo", label: "Logo" },
  { key: "show_bank", label: "Bank details" }, { key: "show_qr", label: "Payment QR code" }, { key: "show_signature", label: "Stamp & signature" },
];
const COLOURS = ["#0b5394", "#0f766e", "#1d4ed8", "#7c3aed", "#b91c1c", "#c2410c", "#1c1c1e"];

function InvoiceLook({ settings, terms, onSave, notify }: { settings: InvoiceSettings; terms: InvoiceTerms[]; onSave: (p: Partial<InvoiceSettings>, ok: string) => Promise<boolean>; notify: Notify }) {
  const [colour, setColour] = useState(settings.colour);
  const valid = /^#[0-9a-f]{6}$/i.test(colour);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 16 }}>
        <Panel title="Print design">
          <span style={fieldLabel}>Invoice colour</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {COLOURS.map((c) => (
              <button key={c} onClick={() => setColour(c)} aria-label={`Colour ${c}`} aria-pressed={colour.toLowerCase() === c}
                style={{ width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer", border: colour.toLowerCase() === c ? "3px solid var(--gold)" : "2px solid var(--surface)", boxShadow: "0 0 0 1px var(--line-strong)" }} />
            ))}
            <input type="color" value={valid ? colour : DEFAULT_INVOICE_SETTINGS.colour} onChange={(e) => setColour(e.target.value)} aria-label="Pick any colour" style={{ width: 40, height: 32, border: "none", background: "none", cursor: "pointer" }} />
            <input value={colour} onChange={(e) => setColour(e.target.value.trim())} maxLength={7} aria-label="Colour code" style={{ ...input, width: 100 }} />
            <Btn small disabled={!valid || colour.toLowerCase() === settings.colour.toLowerCase()} onClick={() => void onSave({ colour: colour.toLowerCase() }, "Invoice colour saved")}>Save colour</Btn>
          </div>
          <p style={{ ...muted, margin: "6px 0 14px" }}>Used for the title, headings and lines on the invoice.</p>

          <label><span style={fieldLabel}>Terms position</span>
            <select value={settings.terms_position} onChange={(e) => void onSave({ terms_position: e.target.value as TermsPosition }, "Terms position saved")} style={input}>
              <option value="Same Page">Same page — below the bill</option>
              <option value="Second Page">Second page — terms on their own page</option>
            </select>
          </label>
          <label style={{ display: "block", marginTop: 12 }}><span style={fieldLabel}>Default terms &amp; conditions</span>
            <select value={settings.default_terms ?? ""} onChange={(e) => void onSave({ default_terms: e.target.value || null }, e.target.value ? "Default terms set" : "No default terms")} style={input}>
              <option value="">None</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <p style={{ ...muted, margin: "6px 0 0" }}>Printed on bills that don&apos;t have their own terms picked.</p>
        </Panel>

        <Panel title="Show / hide on the invoice">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            {TOGGLES.map((t) => (
              <span key={t.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13, fontWeight: 600, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 10 }}>
                {t.label}
                <Toggle on={Boolean(settings[t.key])} label={`Show ${t.label.toLowerCase()} on the invoice`}
                  onChange={(on) => void onSave({ [t.key]: on }, `${t.label} ${on ? "shown" : "hidden"} on invoices`)} />
              </span>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Invoice images">
        <div style={{ display: "grid", gap: 14 }}>
          {IMAGES.map((img) => <ImageSlot key={img.key} field={img.key} label={img.label} hint={img.hint} maxSide={img.maxSide} url={settings[img.key]} hidden={img.show ? !settings[img.show] : false} onSave={onSave} notify={notify} />)}
        </div>
      </Panel>
    </div>
  );
}

function ImageSlot({ field, label, hint, maxSide, url, hidden, onSave, notify }: Omit<(typeof IMAGES)[number], "key" | "show"> & {
  field: ImageKey; url: string; hidden: boolean; onSave: (p: Partial<InvoiceSettings>, ok: string) => Promise<boolean>; notify: Notify;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File | undefined) => {
    if (ref.current) ref.current.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const next = await uploadProductImage(`invoice-${field.replace("_url", "")}`, await compressImage(file, maxSide, 0.9));
      if (await onSave({ [field]: next }, `${label} saved`)) { if (url) await removeProductImages([url]).catch(() => undefined); }
      else await removeProductImages([next]).catch(() => undefined);
    } catch (e) { notify(friendly(e), true); }
    setBusy(false);
  };
  const reset = async () => {
    if (!confirm(`Remove the ${label.toLowerCase()}?`)) return;
    setBusy(true);
    if (await onSave({ [field]: "" }, `${label} removed`)) await removeProductImages([url]).catch(() => undefined);
    setBusy(false);
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
      <div style={{ width: 120, height: 72, flexShrink: 0, borderRadius: 10, border: "1px dashed var(--line-strong)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt={label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={muted}>No image</span>}
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <strong style={{ fontSize: 13.5 }}>{label}</strong>{hidden && <span style={{ ...muted, marginLeft: 6 }}>· hidden on invoices</span>}
        <p style={{ ...muted, margin: "2px 0 8px" }}>{hint}</p>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn small disabled={busy} onClick={() => ref.current?.click()}>{busy ? "Saving…" : url ? "Replace" : "Choose file"}</Btn>
          {url && <Btn small kind="danger" disabled={busy} onClick={() => void reset()}>Reset</Btn>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void upload(e.target.files?.[0])} />
    </div>
  );
}

/* ─────── Terms & conditions templates ─────── */

function TermsList({ terms, defaultId, notify, onChanged, onDefault }: {
  terms: InvoiceTerms[]; defaultId: string | null; notify: Notify; onChanged: () => Promise<unknown>; onDefault: (id: string | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<InvoiceTerms | "new" | null>(null);
  const remove = async (t: InvoiceTerms) => {
    if (!confirm(`Delete “${t.name}”? Bills that used it will print without terms.`)) return;
    const { error } = await sb().from("invoice_terms").delete().eq("id", t.id);
    if (error) { fail(error, notify); return; }
    notify(`${t.name} deleted`); void onChanged();
  };

  return (
    <Panel title="Terms and condition list" actions={<Btn small onClick={() => setEditing("new")}>＋ Add terms</Btn>} pad={false}>
      <Table<InvoiceTerms> rows={terms} rowKey={(t) => t.id} empty="No terms yet. Add one, e.g. “AMC 1500 TDS” or “One year full warranty”."
        cols={[
          { key: "name", head: "Name", render: (t) => <strong>{t.name}</strong> },
          { key: "body", head: "Description", render: (t) => <span style={{ ...muted, display: "block", maxWidth: 420, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.body.split("\n")[0] || "—"}</span> },
          { key: "def", head: "Default", align: "center", render: (t) => <Toggle on={t.id === defaultId} label={`Use ${t.name} by default`} onChange={(on) => void onDefault(on ? t.id : null)} /> },
          { key: "act", head: "Action", align: "right", render: (t) => <span style={{ display: "inline-flex", gap: 6 }}><Btn small kind="ghost" onClick={() => setEditing(t)}>Edit</Btn><Btn small kind="danger" onClick={() => void remove(t)}>Delete</Btn></span> },
        ]} />
      {editing && <TermsModal terms={editing === "new" ? null : editing} onClose={() => setEditing(null)} notify={notify}
        onSaved={() => { setEditing(null); void onChanged(); }} />}
    </Panel>
  );
}

function TermsModal({ terms, onClose, onSaved, notify }: { terms: InvoiceTerms | null; onClose: () => void; onSaved: () => void; notify: Notify }) {
  const [name, setName] = useState(terms?.name ?? "");
  const [body, setBody] = useState(terms?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const row = { name: name.trim(), body: body.trim() };
    if (row.name.length < 2) return setErr("Give the terms a name.");
    if (!row.body) return setErr("Write the terms.");
    setBusy(true);
    const { error } = terms ? await sb().from("invoice_terms").update(row).eq("id", terms.id) : await sb().from("invoice_terms").insert(row);
    setBusy(false);
    if (error) { setErr(isInvoiceTableMissing(error.message) ? invoiceNotSetUp : friendly(error)); return; }
    notify(terms ? `${row.name} updated` : `${row.name} added`);
    onSaved();
  };

  return (
    <Modal title={terms ? "Edit terms and condition" : "New terms and condition"} onClose={onClose} wide
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn disabled={busy} onClick={() => void submit()}>{busy ? "Saving…" : terms ? "Update" : "Save"}</Btn></>}>
      <label><span style={fieldLabel}>Name</span><input value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} maxLength={80} placeholder="e.g. AMC 1500 TDS" style={input} autoFocus /></label>
      <label style={{ display: "block", marginTop: 12 }}><span style={fieldLabel}>Description</span>
        <textarea value={body} onChange={(e) => { setBody(e.target.value); setErr(null); }} maxLength={4000} rows={14}
          placeholder={"Upper limit of water TDS is 1500 ppm.\n1. One year warranty of all electronic parts and filters.\n2. Three routine service visits free in the 3rd, 6th & 9th month of AMC.\n…"}
          style={{ ...input, resize: "vertical", lineHeight: 1.55, fontFamily: "inherit" }} />
      </label>
      <p style={{ ...muted, margin: "6px 0 0" }}>Printed exactly as written — one point per line.</p>
      {err && <p role="alert" style={{ margin: "10px 0 0", color: "var(--error-text)", fontWeight: 600, fontSize: 13 }}>{err}</p>}
    </Modal>
  );
}
