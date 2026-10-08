"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, EditIcon, HelpIcon, PinIcon, ShieldIcon, StoreIcon, UsersIcon } from "../icons";
import { BrandMark, Wordmark } from "../Brand";
import { Footer, PageHeader, PrimaryButton, card, iconBtn } from "../ui";
import { Badge, Empty, Field, inputStyle, sectionH } from "./kit";
import { Avatar } from "./WorkScreens";
import { PIN_AREAS, isPincode } from "../../lib/data";
import type { DbTechnician } from "../../lib/catalog";
import type { DbDealer, DealerData } from "../../lib/dealerData";
import { helpline } from "../../storefront/content";

const PHONE = /^[6-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const pinsOf = (s: string) => Array.from(new Set(s.split(/[\s,]+/).filter(Boolean)));
const digits10 = (v: string) => v.replace(/\D/g, "").slice(-10);
const DEALER_HELP = helpline("Account help");

/* ───────────────────────── Login / sign-up ───────────────────────── */

export interface DealerSignup {
  shopName: string; owner: string; phone: string; email: string; password: string;
  gstin: string; address: string; city: string; pincodes: string[];
}

export function DealerAuthScreen({ onLogin, onSignup }: {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onSignup: (d: DealerSignup) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [f, setF] = useState({ shopName: "", owner: "", phone: "", email: "", password: "", gstin: "", address: "", city: "", pincode: "", areas: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const set = (k: keyof typeof f, clean: (v: string) => string = (v) => v) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const v = clean(e.target.value); setF((p) => ({ ...p, [k]: v })); setErr(null); };

  const pins = pinsOf(`${f.pincode},${f.areas}`);
  const badPin = pins.find((p) => !isPincode(p));
  const problem = !signup ? (!f.email || !f.password ? "Enter your email and password" : null)
    : f.shopName.trim().length < 3 ? "Enter your shop name"
    : f.owner.trim().length < 2 ? "Enter the owner's name"
    : !PHONE.test(f.phone) ? "Enter a 10-digit mobile number"
    : !EMAIL.test(f.email.trim()) ? "Enter a valid email — it's your login ID"
    : f.password.length < 8 ? "Password must be at least 8 characters"
    : f.gstin && !GSTIN.test(f.gstin) ? "That GSTIN doesn't look right (e.g. 09ABCPS1234F1Z5)"
    : f.address.trim().length < 8 ? "Enter the full shop address"
    : f.city.trim().length < 2 ? "Enter the city"
    : !isPincode(f.pincode) ? "Enter your shop's 6-digit pincode"
    : badPin ? `${badPin} isn't a valid pincode`
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr(null);
    const error = signup
      ? await onSignup({
        shopName: f.shopName.trim(), owner: f.owner.trim(), phone: f.phone, email: f.email.trim().toLowerCase(), password: f.password,
        gstin: f.gstin, address: f.address.trim(), city: f.city.trim(), pincodes: pins,
      })
      : await onLogin(f.email.trim().toLowerCase(), f.password);
    setBusy(false);
    if (error) setErr(error);
  };

  const switchMode = () => { setMode(signup ? "login" : "signup"); setErr(null); };
  const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--blue)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 };

  return (
    <form onSubmit={submit} className="fade-up no-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: "0 20px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><BrandMark size={44} /><Wordmark /></div>
        <span style={{ alignSelf: "flex-start", marginTop: 18, background: "var(--gold)", color: "var(--blue-dark)", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8, letterSpacing: "0.05em" }}>DEALER APP</span>
        <h1 style={{ margin: "12px 0 4px", fontSize: 25, fontWeight: 800, lineHeight: 1.2 }}>{signup ? "Grow your RO business with Zavtoo" : "Dealer login"}</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          {signup
            ? "List the purifiers and spares you stock, get orders from customers in your pincodes, and send your technicians on Zavtoo service jobs."
            : "Log in with the email and password you registered your shop with."}
        </p>

        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {signup && (
            <>
              <Field id="d-shop" label="Shop / business name"><input id="d-shop" value={f.shopName} onChange={set("shopName")} maxLength={80} placeholder="e.g. Sharma RO Point" style={inputStyle()} /></Field>
              <Field id="d-owner" label="Owner name"><input id="d-owner" autoComplete="name" value={f.owner} onChange={set("owner")} maxLength={60} style={inputStyle()} /></Field>
              <Field id="d-phone" label="Mobile number">
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ ...inputStyle(), width: "auto", color: "var(--ink-soft)" }}>+91</span>
                  <input id="d-phone" inputMode="numeric" autoComplete="tel-national" value={f.phone} onChange={set("phone", (v) => v.replace(/\D/g, "").slice(0, 10))} style={inputStyle()} />
                </div>
              </Field>
            </>
          )}
          <Field id="d-email" label="Email"><input id="d-email" type="email" autoComplete="username" value={f.email} onChange={set("email")} style={inputStyle()} /></Field>
          <Field id="d-pass" label={signup ? "Create a password" : "Password"}>
            <input id="d-pass" type="password" autoComplete={signup ? "new-password" : "current-password"} value={f.password} onChange={set("password")}
              placeholder={signup ? "At least 8 characters" : undefined} style={inputStyle()} />
          </Field>
          {signup && (
            <>
              <h3 style={{ ...sectionH, margin: "6px 2px -4px" }}>Shop location</h3>
              <Field id="d-addr" label="Shop address">
                <textarea id="d-addr" rows={2} value={f.address} onChange={set("address")} maxLength={200} style={{ ...inputStyle(), resize: "vertical", lineHeight: 1.5 }} />
              </Field>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1.3 }}><Field id="d-city" label="City"><input id="d-city" value={f.city} onChange={set("city")} maxLength={40} style={inputStyle()} /></Field></div>
                <div style={{ flex: 1 }}><Field id="d-pin" label="Pincode"><input id="d-pin" inputMode="numeric" value={f.pincode} onChange={set("pincode", (v) => v.replace(/\D/g, "").slice(0, 6))} style={inputStyle()} /></Field></div>
              </div>
              <Field id="d-areas" label="Other pincodes you serve (optional)" hint="Customers in these pincodes can buy from you, and you'll see service jobs there.">
                <input id="d-areas" inputMode="numeric" value={f.areas} onChange={set("areas")} placeholder="201303, 201309" style={inputStyle()} />
              </Field>
              <Field id="d-gst" label="GSTIN (optional)">
                <input id="d-gst" value={f.gstin} onChange={set("gstin", (v) => v.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15))} style={inputStyle()} />
              </Field>
            </>
          )}
          {err && <p role="alert" style={{ margin: "0 2px", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
        </div>
      </div>
      <div style={{ padding: "16px 0 calc(24px + env(safe-area-inset-bottom))" }}>
        <PrimaryButton disabled={busy}>{busy ? (signup ? "Registering…" : "Logging in…") : signup ? "Register my shop" : "Log In"}</PrimaryButton>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-soft)", margin: "14px 0 0" }}>
          {signup ? "Already registered? " : "Own an RO shop? "}
          <button type="button" onClick={switchMode} style={linkBtn}>{signup ? "Log in" : "Register as a dealer"}</button>
        </p>
        {!signup && <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)", margin: "10px 0 0" }}>Forgot your password? Call <a href={DEALER_HELP.href} style={{ color: "var(--blue)", fontWeight: 600 }}>{DEALER_HELP.number}</a></p>}
      </div>
    </form>
  );
}

/* ───────────────────────── Edit shop ───────────────────────── */

export type ShopEdit = Pick<DbDealer, "name" | "owner" | "phone" | "gstin" | "address" | "city" | "pincodes">;

export function ShopForm({ dealer, onBack, onSave }: { dealer: DbDealer; onBack: () => void; onSave: (d: ShopEdit) => Promise<boolean> }) {
  const [f, setF] = useState({
    name: dealer.name, owner: dealer.owner, phone: digits10(dealer.phone), gstin: dealer.gstin ?? "",
    address: dealer.address ?? "", city: dealer.city, pins: dealer.pincodes.join(", "),
  });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, clean: (v: string) => string = (v) => v) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const v = clean(e.target.value); setF((p) => ({ ...p, [k]: v })); };

  const pins = pinsOf(f.pins);
  const badPin = pins.find((p) => !isPincode(p));
  const errors = {
    name: f.name.trim().length < 3 ? "Enter your shop name" : "",
    owner: f.owner.trim().length < 2 ? "Enter the owner's name" : "",
    phone: !PHONE.test(f.phone) ? "Enter a 10-digit mobile number" : "",
    gstin: f.gstin && !GSTIN.test(f.gstin) ? "That GSTIN doesn't look right" : "",
    address: f.address.trim().length < 8 ? "Enter the full shop address" : "",
    city: f.city.trim().length < 2 ? "Enter the city" : "",
    pins: !pins.length ? "Add at least one pincode" : badPin ? `${badPin} isn't a valid pincode` : pins.length > 30 ? "Up to 30 pincodes" : "",
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : "");

  const submit = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean) || busy) return;
    setBusy(true);
    const ok = await onSave({
      name: f.name.trim(), owner: f.owner.trim(), phone: `+91${f.phone}`, gstin: f.gstin,
      address: f.address.trim(), city: f.city.trim(), pincodes: pins,
    });
    if (!ok) setBusy(false);
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Shop details" onBack={onBack} />
      <div style={{ padding: "0 16px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <Field id="sf-shop" label="Shop / business name" error={show("name")}>
          <input id="sf-shop" value={f.name} onChange={set("name")} maxLength={80} style={inputStyle(!!show("name"))} />
        </Field>
        <Field id="sf-owner" label="Owner name" error={show("owner")}>
          <input id="sf-owner" value={f.owner} onChange={set("owner")} maxLength={60} style={inputStyle(!!show("owner"))} />
        </Field>
        <Field id="sf-phone" label="Mobile number" error={show("phone")}>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ ...inputStyle(), width: "auto", color: "var(--ink-soft)" }}>+91</span>
            <input id="sf-phone" inputMode="numeric" value={f.phone} onChange={set("phone", (v) => v.replace(/\D/g, "").slice(0, 10))} style={inputStyle(!!show("phone"))} />
          </div>
        </Field>
        <Field id="sf-gst" label="GSTIN (optional)" error={show("gstin")}>
          <input id="sf-gst" value={f.gstin} onChange={set("gstin", (v) => v.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15))} style={inputStyle(!!show("gstin"))} />
        </Field>
        <Field id="sf-addr" label="Shop address" error={show("address")}>
          <textarea id="sf-addr" rows={2} value={f.address} onChange={set("address")} maxLength={200} style={{ ...inputStyle(!!show("address")), resize: "vertical", lineHeight: 1.5 }} />
        </Field>
        <Field id="sf-city" label="City" error={show("city")}>
          <input id="sf-city" value={f.city} onChange={set("city")} maxLength={40} style={inputStyle(!!show("city"))} />
        </Field>
        <Field id="sf-pins" label="Pincodes you serve" error={show("pins")} hint="Customers here can buy your listings, and you see open service jobs here.">
          <input id="sf-pins" inputMode="numeric" value={f.pins} onChange={set("pins")} placeholder="201301, 201303" style={inputStyle(!!show("pins"))} />
        </Field>
        {pins.length > 0 && !badPin && (
          <p style={{ margin: "-8px 2px 0", fontSize: 12, color: "var(--ink-soft)" }}>{pins.map((p) => (PIN_AREAS[p] ? `${p} (${PIN_AREAS[p]})` : p)).join(" · ")}</p>
        )}
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-mute)" }}>Login email: {dealer.email ?? "—"}. To change it, call dealer help.</p>
      </div>
      <Footer>
        <PrimaryButton onClick={() => void submit()} disabled={busy}>{busy ? "Saving…" : "Save shop details"}</PrimaryButton>
      </Footer>
    </div>
  );
}

/* ───────────────────────── Profile tab ───────────────────────── */

export type DealerPage = "edit" | "team" | "help";

export function DealerProfileScreen({ data, onOpen, onLogout }: { data: DealerData; onOpen: (p: DealerPage) => void; onLogout: () => void }) {
  const { dealer: d } = data;
  const delivered = data.orders.filter((o) => o.status === "Delivered").length;
  const menu: { key: DealerPage; label: string; sub: string; Icon: (x: { s?: number; c?: string; w?: number }) => React.ReactElement }[] = [
    { key: "edit", label: "Shop details", sub: "Address, pincodes, GST, phone", Icon: StoreIcon },
    { key: "team", label: "My technicians", sub: `${data.team.length} on your team`, Icon: UsersIcon },
    { key: "help", label: "Dealer help", sub: "How orders, jobs and listings work", Icon: HelpIcon },
  ];

  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="Shop Profile" />

      <div style={{ padding: "0 16px" }}>
        <div style={{ ...card, padding: "18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 58, height: 58, borderRadius: 16, flexShrink: 0, background: "linear-gradient(135deg,var(--blue),var(--blue-dark))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(11,92,255,0.3)" }}>
              <StoreIcon s={28} c="white" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{d.name}</p>
              <p style={{ margin: "1px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{d.owner} · <span style={{ whiteSpace: "nowrap" }}>{d.phone}</span></p>
              <p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Dealer ID {d.code}</p>
            </div>
            <button onClick={() => onOpen("edit")} aria-label="Edit shop details" className="press" style={{ ...iconBtn, alignSelf: "flex-start" }}><EditIcon s={20} c="var(--blue)" /></button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Badge tone={d.kyc === "Verified" ? "green" : "amber"}>{d.kyc === "Verified" ? "KYC verified" : "KYC under review"}</Badge>
            {!d.active && <Badge tone="grey">Paused by Zavtoo</Badge>}
            {d.gstin && <Badge tone="grey">GST {d.gstin}</Badge>}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ ...card, padding: "14px 16px", display: "flex" }}>
          {[[String(data.listings.length), "Listings"], [String(delivered), "Delivered"], [String(data.team.length), "Technicians"]].map(([v, l], i) => (
            <div key={l} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{v}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ ...card, padding: 14 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", letterSpacing: "0.04em" }}>SERVICE AREA</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-soft)", display: "flex", gap: 6, lineHeight: 1.5 }}>
            <PinIcon s={16} c="var(--ink-mute)" />{[d.address, d.city].filter(Boolean).join(", ")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {d.pincodes.map((a) => <span key={a} style={{ background: "var(--blue-tint)", color: "var(--blue-dark)", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8 }}>{a}</span>)}
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 16px 0" }}>
        {menu.map(({ key, label, sub, Icon }, i) => (
          <button key={key} onClick={() => onOpen(key)} className="press" style={{
            width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "14px 2px",
            background: "none", border: "none", borderTop: i === 0 ? "none" : "1px solid var(--line)", cursor: "pointer", textAlign: "left",
          }}>
            <Icon s={22} c="var(--text-muted)" w={1.6} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--ink-mute)" }}>{sub}</span>
            </span>
            <ChevronRight s={16} c="var(--ink-mute)" />
          </button>
        ))}
      </div>

      <div style={{ padding: "18px 16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <Link href="/" className="press" style={{ display: "block", textAlign: "center", background: "var(--surface)", color: "var(--blue)", borderRadius: 16, padding: 15, fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
          See your listings on zavtoo.in
        </Link>
        <button onClick={onLogout} className="press" style={{ width: "100%", background: "var(--surface)", color: "var(--red)", border: "none", borderRadius: 16, padding: 15, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Log Out</button>
      </div>
    </div>
  );
}

/* ───────────────────────── Team ───────────────────────── */

export interface NewTeamMember { name: string; phone: string; email: string; password: string; pincodes: string[] }

export function TeamPage({ team, jobs, shopPins, onBack, onAdd }: {
  team: DbTechnician[]; jobs: DealerData["jobs"]; shopPins: string[]; onBack: () => void; onAdd: (t: NewTeamMember) => Promise<string | null>;
}) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "", pins: shopPins.join(", ") });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string } | null>(null);
  const set = (k: keyof typeof f, clean: (v: string) => string = (v) => v) =>
    (e: React.ChangeEvent<HTMLInputElement>) => { const v = clean(e.target.value); setF((p) => ({ ...p, [k]: v })); setErr(null); };

  const pins = pinsOf(f.pins);
  const problem = f.name.trim().length < 2 ? "Enter the technician's full name"
    : !PHONE.test(f.phone) ? "Enter a 10-digit mobile number"
    : !EMAIL.test(f.email.trim()) ? "Enter an email — it's their login ID"
    : f.password.length < 8 ? "Password must be at least 8 characters"
    : pins.some((p) => !isPincode(p)) ? "One of the pincodes isn't valid"
    : null;
  const openJobs = (id: string) => jobs.filter((j) => j.tech_id === id && !["Completed", "Cancelled"].includes(j.status)).length;

  const add = async () => {
    if (problem) { setErr(problem); return; }
    setBusy(true);
    const error = await onAdd({ name: f.name.trim(), phone: f.phone, email: f.email.trim().toLowerCase(), password: f.password, pincodes: pins });
    setBusy(false);
    if (error) { setErr(error); return; }
    setCreated({ name: f.name.trim(), email: f.email.trim().toLowerCase() });
    setF({ name: "", phone: "", email: "", password: "", pins: shopPins.join(", ") });
    setAdding(false);
  };

  return (
    <div>
      <PageHeader title="My Technicians" onBack={onBack} right={!adding && (
        <button onClick={() => { setAdding(true); setCreated(null); }} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
      )} />
      <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {created && (
          <div className="fade-up" style={{ ...card, padding: 14, background: "var(--success)", border: "1.5px solid var(--success-border)", fontSize: 13, lineHeight: 1.55 }}>
            <b>{created.name} is on your team.</b> They log in to the Zavtoo Partner app at <b>zavtoo.in/technician</b> with {created.email} and the password you set. Zavtoo verifies their KYC before they can take jobs.
          </div>
        )}
        {adding && (
          <div className="fade-up" style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <Field id="tm-name" label="Full name"><input id="tm-name" value={f.name} onChange={set("name")} maxLength={60} style={inputStyle()} /></Field>
            <Field id="tm-phone" label="Mobile number">
              <input id="tm-phone" inputMode="numeric" value={f.phone} onChange={set("phone", (v) => v.replace(/\D/g, "").slice(0, 10))} style={inputStyle()} />
            </Field>
            <Field id="tm-email" label="Email (their login ID)"><input id="tm-email" type="email" autoComplete="off" value={f.email} onChange={set("email")} style={inputStyle()} /></Field>
            <Field id="tm-pass" label="Password for them" hint="At least 8 characters. Share it with them yourself.">
              <input id="tm-pass" type="text" autoComplete="new-password" value={f.password} onChange={set("password")} style={inputStyle()} />
            </Field>
            <Field id="tm-pins" label="Pincodes they cover"><input id="tm-pins" inputMode="numeric" value={f.pins} onChange={set("pins")} style={inputStyle()} /></Field>
            {err && <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setAdding(false); setErr(null); }} style={{ flex: 1, border: "1.5px solid var(--line-strong)", background: "var(--surface)", borderRadius: 12, padding: 11, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <PrimaryButton onClick={() => void add()} disabled={busy} style={{ flex: 2, padding: 11, borderRadius: 12, fontSize: 14 }}>{busy ? "Adding…" : "Add technician"}</PrimaryButton>
            </div>
          </div>
        )}
        {team.length === 0 && !adding && (
          <Empty title="No technicians yet" body="Add the people who do installations and repairs for you. They get their own login to the Zavtoo Partner app."
            action={<PrimaryButton onClick={() => setAdding(true)} style={{ maxWidth: 220, margin: "0 auto" }}>Add technician</PrimaryButton>} />
        )}
        {team.map((t) => (
          <div key={t.id} style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={t.name} photo={t.photo_url} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>{t.code} · {t.phone}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-mute)" }}>{openJobs(t.id)} open job{openJobs(t.id) === 1 ? "" : "s"} · {t.jobs_done} done{t.rating ? ` · ★ ${Number(t.rating).toFixed(1)}` : ""}</p>
            </div>
            {t.kyc !== "Verified" ? <Badge tone="amber">KYC pending</Badge>
              : !t.active ? <Badge tone="grey">Paused</Badge>
              : <Badge tone={t.status === "Offline" ? "grey" : "green"}>{t.status}</Badge>}
          </div>
        ))}
        {team.length > 0 && <p style={{ margin: "4px 4px 0", fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.5 }}>Technicians switch themselves online or offline in the Partner app. To remove someone, call dealer help.</p>}
      </div>
    </div>
  );
}

/* ───────────────────────── Help ───────────────────────── */

export function DealerHelpPage({ onBack }: { onBack: () => void }) {
  const faqs: [string, string][] = [
    ["Who sees my listings?", "Customers on the Zavtoo app and zavtoo.in, once your shop is verified. They can only order if their delivery pincode is one of yours. Paused or out-of-stock listings are hidden automatically."],
    ["What happens when someone orders?", "It lands in Orders as New. Accept it, mark it dispatched and then delivered — the customer is told at every step. Stock comes off your listing as soon as the order is placed."],
    ["What if I can't fulfil an order?", "Reject it from the order screen with a reason. The units go back into your stock and the customer is told straight away."],
    ["How do service jobs work?", "Jobs in your pincodes that no technician has taken show under Jobs → Open. Assign one to a verified technician on your team; they run it from the Zavtoo Partner app."],
    ["Can I sell non-Zavtoo products?", "Yes — spares and other purifiers are fine. Pick a Zavtoo model when you list one to reuse its official photos and details."],
  ];
  return (
    <div>
      <PageHeader title="Dealer Help" onBack={onBack} />
      <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {faqs.map(([q, a]) => (
          <div key={q} style={{ ...card, padding: 14 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{q}</p>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>{a}</p>
          </div>
        ))}
        <a href={DEALER_HELP.href} style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--ink)" }}>
          <ShieldIcon s={22} c="var(--blue)" /><span style={{ fontSize: 14, fontWeight: 600 }}>Dealer help · {DEALER_HELP.number}</span>
        </a>
      </div>
    </div>
  );
}
