"use client";

import { useState } from "react";
import Link from "next/link";
import { CardIcon, ChevronRight, EditIcon, HelpIcon, PinIcon, ShieldIcon, StoreIcon, TrashIcon, UsersIcon, WalletIcon } from "../icons";
import { BrandMark, Wordmark } from "../Brand";
import { Footer, PageHeader, PrimaryButton, card, iconBtn } from "../ui";
import { Badge, Empty, Field, Row, Switch, inputStyle, sectionH } from "./kit";
import { Avatar } from "./WorkScreens";
import { inr } from "../../lib/data";
import { PLATFORM_FEE, net, type DealerProfile, type DealerState, type Technician } from "../../lib/dealer";

/* ───────────────────────── Register / edit shop ───────────────────────── */

export type ShopDetails = Pick<DealerProfile, "shopName" | "ownerName" | "phone" | "email" | "gstin" | "address" | "city" | "pincode" | "serviceAreas">;
export type BankDetails = NonNullable<DealerProfile["bank"]>;

const PHONE = /^[6-9]\d{9}$/;
const PIN = /^\d{6}$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** One form for both first-time registration and later edits. */
export function ShopForm({ initial, initialBank, mode, onBack, onSubmit, onDemo }: {
  initial?: ShopDetails; initialBank?: DealerProfile["bank"]; mode: "register" | "edit"; onBack?: () => void;
  onSubmit: (d: ShopDetails, bank: BankDetails | null) => void; onDemo?: () => void;
}) {
  const [f, setF] = useState({
    shopName: initial?.shopName ?? "", ownerName: initial?.ownerName ?? "", phone: initial?.phone ?? "",
    email: initial?.email ?? "", gstin: initial?.gstin ?? "", address: initial?.address ?? "",
    city: initial?.city ?? "", pincode: initial?.pincode ?? "", areas: initial?.serviceAreas.join(", ") ?? "",
    holder: initialBank?.holder ?? "", account: "", ifsc: initialBank?.ifsc ?? "",
  });
  const [touched, setTouched] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const v = e.target.value; setF((p) => ({ ...p, [k]: v })); };

  const areas = f.areas.split(/[\s,]+/).filter(Boolean);
  const wantsBank = mode === "edit" && (f.account !== "" || (f.holder !== (initialBank?.holder ?? "")) || (f.ifsc !== (initialBank?.ifsc ?? "")));
  const errors = {
    shopName: !f.shopName.trim() ? "Enter your shop name" : "",
    ownerName: !f.ownerName.trim() ? "Enter the owner's name" : "",
    phone: !PHONE.test(f.phone) ? "Enter a 10-digit mobile number" : "",
    email: f.email && !EMAIL.test(f.email) ? "That email doesn't look right" : "",
    gstin: f.gstin && !GSTIN.test(f.gstin.toUpperCase()) ? "GSTIN should be 15 characters, e.g. 09ABCPS1234F1Z5" : "",
    address: !f.address.trim() ? "Enter the shop address" : "",
    city: !f.city.trim() ? "Enter the city" : "",
    pincode: !PIN.test(f.pincode) ? "6-digit pincode" : "",
    areas: areas.some((a) => !PIN.test(a)) ? "Use 6-digit pincodes separated by commas" : "",
    holder: wantsBank && !f.holder.trim() ? "Account holder name" : "",
    // A saved account can be kept by leaving the number blank.
    account: wantsBank && (f.account || !initialBank) && !/^\d{9,18}$/.test(f.account) ? "9–18 digit account number" : "",
    ifsc: wantsBank && !IFSC.test(f.ifsc.toUpperCase()) ? "IFSC like HDFC0001234" : "",
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : "");

  const submit = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    const serviceAreas = Array.from(new Set([f.pincode, ...areas]));
    const bank = !wantsBank ? (initialBank ?? null) : {
      holder: f.holder.trim(), ifsc: f.ifsc.toUpperCase(),
      account: f.account ? "XXXXXX" + f.account.slice(-4) : initialBank!.account,
    };
    onSubmit({
      shopName: f.shopName.trim(), ownerName: f.ownerName.trim(), phone: f.phone, email: f.email.trim(),
      gstin: f.gstin.toUpperCase(), address: f.address.trim(), city: f.city.trim(), pincode: f.pincode, serviceAreas,
    }, bank);
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {mode === "register" ? (
        <div style={{ padding: "26px 20px 6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><BrandMark size={38} /><Wordmark /></div>
          <h1 style={{ margin: "22px 0 4px", fontSize: 24, fontWeight: 800, color: "var(--ink)", lineHeight: 1.2 }}>Grow your RO business with Zavtoo</h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
            List the purifiers and spares you stock, get orders and service jobs from customers in your area, and get paid every week.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {["Free to join", `${Math.round(PLATFORM_FEE * 100)}% fee only on sales`, "Weekly payouts"].map((t) => <Badge key={t} tone="blue">{t}</Badge>)}
          </div>
        </div>
      ) : (
        <PageHeader title="Edit Shop Profile" onBack={onBack} />
      )}

      <div style={{ padding: mode === "register" ? "18px 16px 8px" : "0 16px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {mode === "register" && <h3 style={{ ...sectionH, margin: "0 2px -4px" }}>Shop details</h3>}
        <Field id="sf-shop" label="Shop / business name" error={show("shopName")}>
          <input id="sf-shop" value={f.shopName} onChange={set("shopName")} placeholder="e.g. Sharma RO Point" style={inputStyle(!!show("shopName"))} />
        </Field>
        <Field id="sf-owner" label="Owner name" error={show("ownerName")}>
          <input id="sf-owner" value={f.ownerName} onChange={set("ownerName")} autoComplete="name" style={inputStyle(!!show("ownerName"))} />
        </Field>
        <Field id="sf-phone" label="Mobile number" error={show("phone")}>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ ...inputStyle(), width: "auto", color: "var(--ink-soft)" }}>+91</span>
            <input id="sf-phone" inputMode="numeric" autoComplete="tel-national" value={f.phone} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setF((p) => ({ ...p, phone: v })); }} style={inputStyle(!!show("phone"))} />
          </div>
        </Field>
        <Field id="sf-email" label="Email (optional)" error={show("email")}>
          <input id="sf-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} style={inputStyle(!!show("email"))} />
        </Field>
        <Field id="sf-gst" label="GSTIN (optional)" error={show("gstin")} hint="Needed for B2B invoices to offices and clinics.">
          <input id="sf-gst" value={f.gstin} onChange={(e) => { const v = e.target.value.toUpperCase().slice(0, 15); setF((p) => ({ ...p, gstin: v })); }} style={inputStyle(!!show("gstin"))} />
        </Field>

        {mode === "register" && <h3 style={{ ...sectionH, margin: "4px 2px -4px" }}>Location &amp; service area</h3>}
        <Field id="sf-addr" label="Shop address" error={show("address")}>
          <textarea id="sf-addr" rows={2} value={f.address} onChange={set("address")} style={{ ...inputStyle(!!show("address")), resize: "vertical", lineHeight: 1.5 }} />
        </Field>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1.3 }}>
            <Field id="sf-city" label="City" error={show("city")}>
              <input id="sf-city" value={f.city} onChange={set("city")} style={inputStyle(!!show("city"))} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field id="sf-pin" label="Pincode" error={show("pincode")}>
              <input id="sf-pin" inputMode="numeric" value={f.pincode} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setF((p) => ({ ...p, pincode: v })); }} style={inputStyle(!!show("pincode"))} />
            </Field>
          </div>
        </div>
        <Field id="sf-areas" label="Other pincodes you serve" error={show("areas")} hint="Customers in these pincodes see your listings and can book you for service.">
          <input id="sf-areas" inputMode="numeric" value={f.areas} onChange={set("areas")} placeholder="201303, 201309" style={inputStyle(!!show("areas"))} />
        </Field>

        {mode === "edit" && (
          <>
            <h3 style={{ ...sectionH, margin: "4px 2px -4px" }}>Payout bank account</h3>
            <Field id="sf-holder" label="Account holder" error={show("holder")}>
              <input id="sf-holder" value={f.holder} onChange={set("holder")} style={inputStyle(!!show("holder"))} />
            </Field>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1.2 }}>
                <Field id="sf-acct" label="Account number" error={show("account")} hint={initialBank ? `Saved: ${initialBank.account}` : undefined}>
                  <input id="sf-acct" inputMode="numeric" autoComplete="off" value={f.account} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 18); setF((p) => ({ ...p, account: v })); }} placeholder={initialBank ? "Leave blank to keep" : ""} style={inputStyle(!!show("account"))} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field id="sf-ifsc" label="IFSC" error={show("ifsc")}>
                  <input id="sf-ifsc" value={f.ifsc} onChange={(e) => { const v = e.target.value.toUpperCase().slice(0, 11); setF((p) => ({ ...p, ifsc: v })); }} style={inputStyle(!!show("ifsc"))} />
                </Field>
              </div>
            </div>
          </>
        )}
      </div>

      <Footer>
        <PrimaryButton onClick={submit}>{mode === "register" ? "Register my shop" : "Save profile"}</PrimaryButton>
        {onDemo && (
          <button onClick={onDemo} style={{ width: "100%", marginTop: 6, background: "none", border: "none", color: "var(--blue)", fontSize: 13.5, fontWeight: 600, padding: 10, cursor: "pointer" }}>
            Explore with a demo shop instead
          </button>
        )}
      </Footer>
    </div>
  );
}

/* ───────────────────────── Profile tab ───────────────────────── */

export type DealerPage = "edit" | "team" | "payouts" | "help";

export function DealerProfileScreen({ state, onOpen, onLogout }: { state: DealerState; onOpen: (p: DealerPage) => void; onLogout: () => void }) {
  const { profile: p } = state;
  const delivered = state.orders.filter((o) => o.status === "Delivered").length;
  const menu: { key: DealerPage; label: string; sub: string; Icon: (x: { s?: number; c?: string; w?: number }) => React.ReactElement }[] = [
    { key: "edit", label: "Shop details", sub: "Address, service pincodes, GST, bank", Icon: StoreIcon },
    { key: "team", label: "My technicians", sub: `${state.team.length} on your team`, Icon: UsersIcon },
    { key: "payouts", label: "Payouts", sub: p.bank ? `To ${p.bank.account}` : "Add a bank account", Icon: WalletIcon },
    { key: "help", label: "Dealer help", sub: "Fees, payouts, policies", Icon: HelpIcon },
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
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{p.shopName}</p>
              <p style={{ margin: "1px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{p.ownerName} · <span style={{ whiteSpace: "nowrap" }}>+91 {p.phone}</span></p>
              <p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Dealer ID {p.id} · since {p.since}</p>
            </div>
            <button onClick={() => onOpen("edit")} aria-label="Edit shop details" className="press" style={{ ...iconBtn, alignSelf: "flex-start" }}><EditIcon s={20} c="var(--blue)" /></button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Badge tone={p.kyc === "Verified" ? "green" : "amber"}>{p.kyc === "Verified" ? "KYC verified" : "KYC under review"}</Badge>
            <Badge tone="amber">{p.tier} dealer</Badge>
            {p.gstin && <Badge tone="grey">GST registered</Badge>}
          </div>
        </div>
      </div>

      {p.kyc === "Pending" && (
        <div style={{ padding: "14px 16px 0" }}>
          <div style={{ ...card, padding: "12px 14px", background: "var(--warning)", border: "1.5px solid var(--warning-border)", fontSize: 12.5, color: "var(--ink)", lineHeight: 1.55 }}>
            <b>Verification in progress.</b> Our team will call you within 24 hours to check your shop and documents. Add your bank account from Shop details so payouts aren&apos;t held up.
          </div>
        </div>
      )}

      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ ...card, padding: "14px 16px", display: "flex" }}>
          {[[String(state.listings.length), "Listings"], [String(delivered), "Delivered"], [p.rating ? p.rating.toFixed(1) + " ★" : "New", "Rating"]].map(([v, l], i) => (
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
            <PinIcon s={16} c="var(--ink-mute)" />{p.address}, {p.city} {p.pincode}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {p.serviceAreas.map((a) => <span key={a} style={{ background: "var(--blue-tint)", color: "var(--blue-dark)", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8 }}>{a}</span>)}
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
          Open customer app
        </Link>
        <button onClick={onLogout} className="press" style={{ width: "100%", background: "var(--surface)", color: "var(--red)", border: "none", borderRadius: 16, padding: 15, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Log Out</button>
        <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-disabled)", margin: "4px 0 0" }}>Zavtoo Dealer v1.0.0</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Team ───────────────────────── */

export function TeamPage({ team, load, onBack, onAdd, onToggle, onRemove }: {
  team: Technician[]; load: Record<string, number>; onBack: () => void;
  onAdd: (name: string, phone: string) => void; onToggle: (id: string, available: boolean) => void; onRemove: (id: string) => void;
}) {
  const [adding, setAdding] = useState(team.length === 0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const bad = { name: !name.trim(), phone: !PHONE.test(phone) };

  const add = () => {
    setTouched(true);
    if (bad.name || bad.phone) return;
    onAdd(name.trim(), phone);
    setName(""); setPhone(""); setTouched(false); setAdding(false);
  };

  return (
    <div>
      <PageHeader title="My Technicians" onBack={onBack} right={!adding && (
        <button onClick={() => setAdding(true)} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
      )} />
      <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {adding && (
          <div className="fade-up" style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <Field id="tm-name" label="Name" error={touched && bad.name ? "Enter a name" : ""}>
              <input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(touched && bad.name)} />
            </Field>
            <Field id="tm-phone" label="Mobile number" error={touched && bad.phone ? "10-digit mobile number" : ""}>
              <input id="tm-phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} style={inputStyle(touched && bad.phone)} />
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              {team.length > 0 && <button onClick={() => { setAdding(false); setTouched(false); }} style={{ flex: 1, border: "1.5px solid var(--line-strong)", background: "var(--surface)", borderRadius: 12, padding: 11, fontWeight: 600, cursor: "pointer" }}>Cancel</button>}
              <PrimaryButton onClick={add} style={{ flex: 2, padding: 11, borderRadius: 12, fontSize: 14 }}>Add technician</PrimaryButton>
            </div>
          </div>
        )}
        {team.map((t) => (
          <div key={t.id} style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={t.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>+91 {t.phone} · {load[t.id] ?? 0} open job{(load[t.id] ?? 0) === 1 ? "" : "s"}</p>
            </div>
            <Switch on={t.available} onChange={(v) => onToggle(t.id, v)} label={`${t.name} available`} />
            <button aria-label={`Remove ${t.name}`} disabled={(load[t.id] ?? 0) > 0} title={(load[t.id] ?? 0) > 0 ? "Reassign their open jobs first" : undefined}
              onClick={() => onRemove(t.id)} style={{ ...iconBtn, opacity: (load[t.id] ?? 0) > 0 ? 0.3 : 1, cursor: (load[t.id] ?? 0) > 0 ? "not-allowed" : "pointer" }}>
              <TrashIcon s={18} c="var(--ink-mute)" />
            </button>
          </div>
        ))}
        {team.length > 0 && <p style={{ margin: "4px 4px 0", fontSize: 12, color: "var(--ink-mute)" }}>Switch someone off when they&apos;re on leave — they won&apos;t show up when you assign jobs.</p>}
      </div>
    </div>
  );
}

/* ───────────────────────── Payouts ───────────────────────── */

export function PayoutsPage({ state, onBack, onAddBank }: { state: DealerState; onBack: () => void; onAddBank: () => void }) {
  const gross = state.orders.filter((o) => o.status === "Delivered").reduce((s, o) => s + o.amount, 0)
    + state.jobs.filter((j) => j.status === "Completed").reduce((s, j) => s + j.amount, 0);
  const earned = net(gross);
  const paid = state.payouts.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  const due = Math.max(0, earned - paid);
  const bank = state.profile.bank;

  return (
    <div>
      <PageHeader title="Payouts" onBack={onBack} />
      <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ borderRadius: 20, padding: 18, background: "linear-gradient(150deg,var(--green-dark),var(--green))", color: "white" }}>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Next payout · every Monday</p>
          <p style={{ margin: "2px 0 0", fontSize: 28, fontWeight: 800 }}>{inr(due)}</p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{bank ? `To ${bank.holder} · ${bank.account}` : "Add a bank account to receive payouts"}</p>
        </div>
        {!bank && <PrimaryButton onClick={onAddBank}><CardIcon s={18} c="white" /> Add bank account</PrimaryButton>}

        <div style={{ ...card, padding: "6px 14px" }}>
          <Row k="Delivered orders + completed jobs" v={inr(gross)} />
          <Row k={`Zavtoo fee (${Math.round(PLATFORM_FEE * 100)}%)`} v={"− " + inr(gross - earned)} />
          <Row k="Already paid out" v={"− " + inr(Math.min(paid, earned))} />
          <div style={{ borderTop: "1px dashed var(--line-strong)" }}><Row k="Due to you" v={inr(due)} strong /></div>
        </div>

        <h3 style={{ ...sectionH, margin: "8px 2px 0" }}>History</h3>
        {state.payouts.length === 0 && <Empty title="No payouts yet" body="Your first payout goes out on the Monday after your first delivered order." />}
        {state.payouts.map((p) => (
          <div key={p.id} style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}><WalletIcon s={19} c="var(--success-text)" /></span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{inr(p.amount)}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>#{p.id} · {p.date}</p>
            </div>
            <Badge tone={p.status === "Paid" ? "green" : "amber"}>{p.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Help ───────────────────────── */

export function DealerHelpPage({ onBack }: { onBack: () => void }) {
  const faqs: [string, string][] = [
    ["What does Zavtoo charge?", `Joining is free. Zavtoo keeps ${Math.round(PLATFORM_FEE * 100)}% of each delivered order and each paid service job — nothing on cancelled or rejected orders.`],
    ["Who sees my listings?", "Customers whose delivery pincode is in your service area. Paused or out-of-stock listings are hidden automatically."],
    ["When do I get paid?", "Every Monday, for everything delivered or completed up to the previous Sunday, straight to your bank account."],
    ["Can I sell non-Zavtoo products?", "Yes — spares and other purifiers are fine. Zavtoo models you resell get a “Zavtoo genuine” badge."],
    ["What if I can't fulfil an order?", "Reject it from the order screen as soon as possible. The customer is refunded and the order is offered to another dealer nearby."],
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
        <a href="tel:+911800000000" style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--ink)" }}>
          <ShieldIcon s={22} c="var(--blue)" /><span style={{ fontSize: 14, fontWeight: 600 }}>Dealer helpline 1800-000-000</span>
        </a>
      </div>
    </div>
  );
}
