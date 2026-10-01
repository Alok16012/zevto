"use client";

import { useState } from "react";
import { BellIcon, CheckIcon, CopyIcon, GiftIcon, PinIcon, PlusIcon, ShareIcon, TagIcon, TrashIcon, WalletIcon, WrenchIcon, BagIcon } from "./icons";
import { Avatar, BottomSheet, Footer, PageHeader, PrimaryButton, Tabs, Toggle, card, field, label, sectionTitle } from "./ui";
import {
  REFERRAL_REWARD, initialsOf, inr,
  type Address, type AppNotification, type NotifKind, type NotifPrefs, type Referral, type UserProfile, type WalletTxn,
} from "../lib/data";

const small: React.CSSProperties = { margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 };

/* ───────────────────────── Edit profile ───────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditProfilePage({ user, onBack, onSave }: { user: UserProfile; onBack: () => void; onSave: (u: UserProfile) => void }) {
  const [f, setF] = useState(user);
  const [touched, setTouched] = useState(false);
  const errs = {
    name: f.name.trim().length < 2 ? "Enter your full name" : null,
    email: !EMAIL_RE.test(f.email.trim()) ? "Enter a valid email" : null,
  };
  const ok = !errs.name && !errs.email;
  const set = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    setTouched(true);
    if (ok) onSave({ ...f, name: f.name.trim(), email: f.email.trim() });
  };

  const errStyle = (e: string | null) => (touched && e ? { border: "1.5px solid var(--error-text)" } : {});

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Edit Profile" onBack={onBack} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "4px 0 18px" }}>
          <Avatar initials={initialsOf(f.name)} size={78} />
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-mute)" }}>Your initials are used as your avatar</p>
        </div>

        <label style={label} htmlFor="pf-name">Full name</label>
        <input id="pf-name" value={f.name} onChange={(e) => set("name", e.target.value)} style={{ ...field, ...errStyle(errs.name) }} autoComplete="name" />
        {touched && errs.name && <p style={errText}>{errs.name}</p>}

        <label style={{ ...label, marginTop: 16 }} htmlFor="pf-email">Email</label>
        <input id="pf-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} style={{ ...field, ...errStyle(errs.email) }} autoComplete="email" />
        {touched && errs.email && <p style={errText}>{errs.email}</p>}

        <label style={{ ...label, marginTop: 16 }} htmlFor="pf-phone">Mobile number</label>
        <input id="pf-phone" value={f.phone} disabled style={{ ...field, background: "var(--surface-dim)", color: "var(--ink-soft)" }} />
        <p style={{ ...small, fontSize: 11.5 }}>Your login number can't be changed here. Contact support to update it.</p>

        <span style={{ ...label, marginTop: 16 }}>Gender</span>
        <div style={{ display: "flex", gap: 8 }}>
          {(["Male", "Female", "Other"] as const).map((g) => {
            const on = f.gender === g;
            return (
              <button key={g} onClick={() => set("gender", on ? "" : g)} aria-pressed={on} style={{
                flex: 1, padding: "11px 0", borderRadius: 12, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
                background: on ? "var(--blue-tint)" : "var(--surface)", color: on ? "var(--blue)" : "var(--text-secondary)",
                border: on ? "1.5px solid var(--blue)" : "1.5px solid var(--line)",
              }}>{g}</button>
            );
          })}
        </div>

        <label style={{ ...label, marginTop: 16 }} htmlFor="pf-dob">Date of birth <span style={{ fontWeight: 400, color: "var(--ink-mute)" }}>(optional)</span></label>
        <input id="pf-dob" type="date" max={new Date().toISOString().slice(0, 10)} value={f.dob} onChange={(e) => set("dob", e.target.value)}
          style={{ ...field, color: f.dob ? "var(--ink)" : "var(--ink-mute)", marginBottom: 16 }} />
      </div>
      <Footer><PrimaryButton onClick={save}>Save Changes</PrimaryButton></Footer>
    </div>
  );
}

const errText: React.CSSProperties = { margin: "5px 2px 0", fontSize: 12, color: "var(--error-text)", fontWeight: 500 };

/* ───────────────────────── Addresses ───────────────────────── */

export function AddressesPage({ addresses, onBack, onChange }: { addresses: Address[]; onBack: () => void; onChange: (a: Address[]) => void }) {
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  const makeDefault = (id: string) => onChange(addresses.map((a) => ({ ...a, isDefault: a.id === id })));
  const remove = (id: string) => {
    const rest = addresses.filter((a) => a.id !== id);
    // Someone always has to be the default.
    if (rest.length && !rest.some((a) => a.isDefault)) rest[0] = { ...rest[0], isDefault: true };
    onChange(rest);
  };
  const save = (a: Address) => {
    const exists = addresses.some((x) => x.id === a.id);
    let next = exists ? addresses.map((x) => (x.id === a.id ? a : x)) : [...addresses, { ...a, isDefault: addresses.length === 0 }];
    if (a.isDefault) next = next.map((x) => ({ ...x, isDefault: x.id === a.id }));
    onChange(next);
    setEditing(null);
  };

  return (
    <div>
      <PageHeader title="Saved Addresses" onBack={onBack} />
      <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {addresses.map((a) => (
          <div key={a.id} style={{ ...card, padding: 14, border: a.isDefault ? "1.5px solid var(--blue)" : "1.5px solid transparent" }}>
            <div style={{ display: "flex", gap: 12 }}>
              <PinIcon s={22} c="var(--blue)" />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{a.label}</p>
                  {a.isDefault && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--blue)", background: "var(--blue-tint)", padding: "2px 8px", borderRadius: 999 }}>DEFAULT</span>}
                </div>
                <p style={small}>{a.line} {a.pincode}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 10, paddingLeft: 34 }}>
              <button onClick={() => setEditing(a)} style={textBtn("var(--blue)")}>Edit</button>
              {!a.isDefault && <button onClick={() => makeDefault(a.id)} style={textBtn("var(--blue)")}>Set as default</button>}
              <button onClick={() => remove(a.id)} style={{ ...textBtn("var(--red)"), display: "flex", alignItems: "center", gap: 4 }}><TrashIcon s={14} c="var(--red)" /> Delete</button>
            </div>
          </div>
        ))}
        {addresses.length === 0 && <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 14, padding: "30px 0" }}>No saved addresses yet.</p>}
        <button onClick={() => setEditing("new")} className="press" style={{
          ...card, border: "1.5px dashed var(--blue)", background: "transparent", boxShadow: "none", padding: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--blue)", fontSize: 14, fontWeight: 600,
        }}><PlusIcon s={17} c="var(--blue)" /> Add new address</button>
      </div>

      {editing && (
        <AddressSheet initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

const textBtn = (c: string): React.CSSProperties => ({ background: "none", border: "none", padding: 0, cursor: "pointer", color: c, fontSize: 12.5, fontWeight: 600 });

export function AddressSheet({ initial, onClose, onSave }: { initial: Address | null; onClose: () => void; onSave: (a: Address) => void }) {
  const [lbl, setLbl] = useState<Address["label"]>(initial?.label ?? "Home");
  const [line, setLine] = useState(initial?.line ?? "");
  const [pin, setPin] = useState(initial?.pincode ?? "");
  const [def, setDef] = useState(initial?.isDefault ?? false);
  const [touched, setTouched] = useState(false);
  const ok = line.trim().length >= 8 && /^\d{6}$/.test(pin);

  const submit = () => {
    setTouched(true);
    if (!ok) return;
    onSave({ id: initial?.id ?? `a${Date.now()}`, label: lbl, line: line.trim(), pincode: pin, isDefault: def });
  };

  return (
    <BottomSheet title={initial ? "Edit address" : "Add address"} onClose={onClose}>
      <span style={label}>Save as</span>
      <div style={{ display: "flex", gap: 8 }}>
        {(["Home", "Office", "Other"] as const).map((l) => (
          <button key={l} onClick={() => setLbl(l)} aria-pressed={lbl === l} style={{
            flex: 1, padding: "10px 0", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: lbl === l ? "var(--blue-tint)" : "var(--surface)", color: lbl === l ? "var(--blue)" : "var(--text-secondary)",
            border: lbl === l ? "1.5px solid var(--blue)" : "1.5px solid var(--line)",
          }}>{l}</button>
        ))}
      </div>
      <label style={{ ...label, marginTop: 14 }} htmlFor="ad-line">House no., street, area, city</label>
      <textarea id="ad-line" rows={2} value={line} onChange={(e) => setLine(e.target.value)} style={{ ...field, resize: "none", ...(touched && line.trim().length < 8 ? { border: "1.5px solid var(--error-text)" } : {}) }} />
      <label style={{ ...label, marginTop: 14 }} htmlFor="ad-pin">Pincode</label>
      <input id="ad-pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        style={{ ...field, ...(touched && !/^\d{6}$/.test(pin) ? { border: "1.5px solid var(--error-text)" } : {}) }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 2px 16px" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Make this my default address</span>
        <Toggle on={def} onChange={setDef} label="Default address" />
      </div>
      {touched && !ok && <p style={{ ...errText, margin: "0 2px 10px" }}>Enter a full address and a 6-digit pincode.</p>}
      <PrimaryButton onClick={submit}>Save Address</PrimaryButton>
    </BottomSheet>
  );
}

/* ───────────────────────── Wallet ───────────────────────── */

export function WalletPage({ balance, txns, onBack, onAddMoney, onRefer }: {
  balance: number; txns: WalletTxn[]; onBack: () => void; onAddMoney: (n: number) => void; onRefer: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [amt, setAmt] = useState("500");
  const n = Number(amt);
  const valid = Number.isInteger(n) && n >= 100 && n <= 10000;

  return (
    <div>
      <PageHeader title="Zavtoo Wallet" onBack={onBack} />
      <div style={{ padding: "0 16px 24px" }}>
        <div style={{
          borderRadius: 22, padding: "18px 18px 16px", color: "white", position: "relative", overflow: "hidden",
          background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", boxShadow: "0 10px 28px rgba(11,92,255,0.28)",
        }}>
          <div style={{ position: "absolute", right: -40, top: -60, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,0.3), transparent 70%)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
            <WalletIcon s={20} c="var(--gold)" /><span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Available balance</span>
          </div>
          <p style={{ margin: "6px 0 14px", fontSize: 32, fontWeight: 800, position: "relative" }}>{inr(balance)}</p>
          <button onClick={() => setAdding(true)} className="press" style={{
            position: "relative", background: "linear-gradient(135deg,var(--gold),var(--gold-dark))", color: "var(--blue-dark)",
            border: "none", borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}><PlusIcon s={15} c="var(--blue-dark)" /> Add Money</button>
        </div>

        <p style={{ ...small, fontSize: 12, margin: "10px 4px 0" }}>Wallet balance is applied automatically at checkout when you turn it on. It can&apos;t be withdrawn to your bank.</p>

        <button onClick={onRefer} className="press" style={{ ...card, width: "100%", border: "none", marginTop: 14, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--gold-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}><GiftIcon s={22} c="var(--gold-dark)" /></div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>Earn {inr(REFERRAL_REWARD)} per friend</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>Refer friends to Zavtoo</p>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--blue)" }}>Invite →</span>
        </button>

        <h3 style={sectionTitle}>Transactions</h3>
        <div style={{ ...card, padding: "4px 14px" }}>
          {txns.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: t.amount > 0 ? "var(--success)" : "var(--error)", color: t.amount > 0 ? "var(--success-text)" : "var(--error-text)", fontWeight: 800, fontSize: 16 }}>
                {t.amount > 0 ? "+" : "−"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{t.title}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>{t.at}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: t.amount > 0 ? "var(--success-text)" : "var(--ink)" }}>{t.amount > 0 ? "+" : "−"}{inr(Math.abs(t.amount))}</span>
            </div>
          ))}
          {txns.length === 0 && <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13, padding: "20px 0" }}>No transactions yet.</p>}
        </div>
      </div>

      {adding && (
        <BottomSheet title="Add money" onClose={() => setAdding(false)}>
          <label style={label} htmlFor="w-amt">Amount</label>
          <input id="w-amt" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} style={{ ...field, fontSize: 20, fontWeight: 700 }} />
          <div style={{ display: "flex", gap: 8, margin: "10px 0 6px" }}>
            {[500, 1000, 2000].map((v) => (
              <button key={v} onClick={() => setAmt(String(v))} style={{ flex: 1, border: "1.5px solid var(--blue-ghost)", background: "var(--surface)", color: "var(--blue)", borderRadius: 999, padding: "7px 0", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>+{inr(v)}</button>
            ))}
          </div>
          <p style={{ ...small, fontSize: 11.5, margin: "4px 2px 14px", color: valid || !amt ? "var(--ink-mute)" : "var(--error-text)" }}>Between ₹100 and ₹10,000. Demo: money is added instantly without a real payment.</p>
          <PrimaryButton disabled={!valid} onClick={() => { onAddMoney(n); setAdding(false); }}>Add {valid ? inr(n) : ""}</PrimaryButton>
        </BottomSheet>
      )}
    </div>
  );
}

/* ───────────────────────── Referral ───────────────────────── */

export function ReferralPage({ code, referrals, onBack, onSimulate }: {
  code: string; referrals: Referral[]; onBack: () => void; onSimulate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const earned = referrals.filter((r) => r.status === "Purchased").length * REFERRAL_REWARD;
  const message = `Get pure water at home with Zavtoo! Use my code ${code} to get ₹250 off your first purifier. Download: https://zavtoo.in/app?ref=${code}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Zavtoo", text: message });
      else { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    } catch { /* share sheet dismissed */ }
  };

  return (
    <div>
      <PageHeader title="Refer & Earn" onBack={onBack} />
      <div style={{ padding: "0 16px 24px" }}>
        <div style={{ ...card, padding: "22px 18px", textAlign: "center", background: "linear-gradient(170deg,var(--gold-tint),var(--surface) 60%)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto", background: "linear-gradient(135deg,var(--gold),var(--gold-dark))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(245,166,35,0.35)" }}>
            <GiftIcon s={32} c="white" w={1.9} />
          </div>
          <p style={{ margin: "14px 0 4px", fontSize: 20, fontWeight: 800 }}>Give ₹250, get {inr(REFERRAL_REWARD)}</p>
          <p style={{ ...small, margin: "0 auto", maxWidth: 280 }}>Your friend saves ₹250 on their first purifier. You get {inr(REFERRAL_REWARD)} in your wallet once it&apos;s delivered.</p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 12px", padding: "10px 10px 10px 16px", borderRadius: 14, border: "1.5px dashed var(--gold-dark)", background: "var(--surface)" }}>
            <span style={{ flex: 1, textAlign: "left", fontSize: 18, fontWeight: 800, letterSpacing: "0.08em", color: "var(--blue-dark)" }}>{code}</span>
            <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, background: copied ? "var(--success)" : "var(--blue-tint)", color: copied ? "var(--success-text)" : "var(--blue)" }}>
              {copied ? <><CheckIcon s={13} c="var(--success-text)" /> Copied</> : <><CopyIcon s={14} c="var(--blue)" /> Copy</>}
            </button>
          </div>
          <PrimaryButton onClick={share}><ShareIcon s={18} c="white" /> Share invite link</PrimaryButton>
        </div>

        <div style={{ ...card, padding: "14px 16px", display: "flex", marginTop: 12 }}>
          {[[String(referrals.length), "Friends invited"], [String(referrals.filter((r) => r.status === "Purchased").length), "Purchased"], [inr(earned), "Earned"]].map(([v, l], i) => (
            <div key={l} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{v}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>{l}</p>
            </div>
          ))}
        </div>

        <h3 style={sectionTitle}>How it works</h3>
        <div style={{ ...card, padding: "6px 14px" }}>
          {["Share your code with friends and family", "They sign up and order a Zavtoo purifier", `You get ${inr(REFERRAL_REWARD)} in your wallet after delivery`].map((t, i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--blue-tint)", color: "var(--blue)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>{t}</span>
            </div>
          ))}
        </div>

        <h3 style={sectionTitle}>Your referrals</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {referrals.map((r) => (
            <div key={r.name + r.at} style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar initials={initialsOf(r.name)} size={38} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{r.name}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>{r.at}</p>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999,
                ...(r.status === "Purchased"
                  ? { background: "var(--success)", color: "var(--success-text)", border: "1px solid var(--success-border)" }
                  : { background: "var(--warning)", color: "var(--warning-text)", border: "1px solid var(--warning-border)" }),
              }}>{r.status === "Purchased" ? `+${inr(REFERRAL_REWARD)}` : "Joined · pending"}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={onSimulate} style={{ background: "none", border: "1px dashed var(--line-strong)", borderRadius: 10, padding: "6px 12px", fontSize: 11.5, color: "var(--ink-mute)", cursor: "pointer" }}>
            Demo: a friend buys a purifier
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Notifications ───────────────────────── */

type NotifTab = "all" | NotifKind;

const KIND_ICON: Record<NotifKind, { Icon: (p: { s?: number; c?: string }) => React.ReactElement; bg: string; fg: string }> = {
  order: { Icon: BagIcon, bg: "var(--blue-tint)", fg: "var(--blue)" },
  service: { Icon: WrenchIcon, bg: "var(--teal-bg)", fg: "var(--teal-text)" },
  offer: { Icon: TagIcon, bg: "var(--gold-tint)", fg: "var(--gold-dark)" },
  wallet: { Icon: WalletIcon, bg: "var(--success)", fg: "var(--success-text)" },
};

export function NotificationsPage({ items, prefs, onBack, onOpen, onReadAll, onClear, onPrefs }: {
  items: AppNotification[]; prefs: NotifPrefs; onBack: () => void; onOpen: (n: AppNotification) => void;
  onReadAll: () => void; onClear: () => void; onPrefs: (p: NotifPrefs) => void;
}) {
  const [tab, setTab] = useState<NotifTab>("all");
  const [showPrefs, setShowPrefs] = useState(false);
  const rows = items.filter((n) => tab === "all" || n.kind === tab || (tab === "order" && n.kind === "wallet"));
  const unread = items.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader title="Notifications" onBack={onBack} right={
        <button onClick={() => setShowPrefs(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue)", fontSize: 12.5, fontWeight: 600 }}>Settings</button>
      } />
      <div style={{ padding: "0 16px 24px" }}>
        <Tabs<NotifTab> value={tab} onChange={setTab} tabs={[{ id: "all", label: "All" }, { id: "order", label: "Orders" }, { id: "service", label: "Service" }, { id: "offer", label: "Offers" }]} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 2px 10px" }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{unread ? `${unread} unread` : "You're all caught up"}</span>
          <div style={{ display: "flex", gap: 14 }}>
            {unread > 0 && <button onClick={onReadAll} style={textBtn("var(--blue)")}>Mark all read</button>}
            {items.length > 0 && <button onClick={onClear} style={textBtn("var(--ink-mute)")}>Clear all</button>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((n) => {
            const k = KIND_ICON[n.kind];
            return (
              <button key={n.id} onClick={() => onOpen(n)} className="press" style={{
                ...card, border: "none", padding: 14, display: "flex", gap: 12, textAlign: "left", cursor: "pointer",
                background: n.read ? "var(--surface)" : "linear-gradient(90deg,var(--blue-tint),var(--surface) 70%)",
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><k.Icon s={20} c={k.fg} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: n.read ? 600 : 700, color: "var(--ink)", flex: 1 }}>{n.title}</p>
                    {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />}
                  </div>
                  <p style={small}>{n.body}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--ink-mute)" }}>{n.at}</p>
                </div>
              </button>
            );
          })}
          {rows.length === 0 && (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--blue-tint)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}><BellIcon s={36} c="var(--blue)" w={1.5} /></div>
              <p style={{ margin: "14px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>No notifications here.</p>
            </div>
          )}
        </div>
      </div>

      {showPrefs && (
        <BottomSheet title="Notification settings" onClose={() => setShowPrefs(false)}>
          <div style={{ ...card, padding: "4px 14px" }}>
            {([
              ["push", "Push notifications", "Order, service and payment updates in the app"],
              ["sms", "SMS", "Booking confirmations and technician details"],
              ["whatsapp", "WhatsApp", "Invoices and service reports"],
              ["offers", "Offers & promotions", "Coupons, sales and new products"],
            ] as const).map(([k, t, d], i) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t}</p>
                  <p style={{ ...small, fontSize: 11.5 }}>{d}</p>
                </div>
                <Toggle on={prefs[k]} onChange={(v) => onPrefs({ ...prefs, [k]: v })} label={t} />
              </div>
            ))}
          </div>
          <p style={{ ...small, fontSize: 11.5, margin: "10px 4px 0" }}>Critical alerts like technician arrival are always sent by SMS.</p>
        </BottomSheet>
      )}
    </div>
  );
}
