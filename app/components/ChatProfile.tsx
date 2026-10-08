"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BackIcon, BagIcon, CardIcon, ChevronRight, ClipIcon, GearIcon, HelpIcon, HistoryIcon, InfoIcon, PinIcon, SendIcon, ShieldIcon, BellIcon, StoreIcon } from "./icons";
import { PageHeader, card, iconBtn } from "./ui";
import { BrandMark } from "./Brand";
import { USER, type ChatMessage } from "../lib/data";

/* ───────────────────────── Chat ───────────────────────── */

const QUICK = ["Share order number", "Filter change", "Water leakage", "AMC renewal"];

export function ChatScreen({ messages, typing, onSend, onBack }: {
  messages: ChatMessage[]; typing: boolean; onSend: (body: string) => void; onBack?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, typing]);

  const send = (text = draft) => {
    const body = text.trim();
    if (!body) return;
    onSend(body);
    setDraft("");
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 12px", background: "var(--app-bg)", borderBottom: "1px solid var(--line)" }}>
        {onBack && <button onClick={onBack} aria-label="Back" className="press" style={iconBtn}><BackIcon c="var(--ink)" /></button>}
        <div style={{ position: "relative" }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-card)" }}><BrandMark size={28} /></div>
          <span style={{ position: "absolute", right: 0, bottom: 1, width: 11, height: 11, borderRadius: "50%", background: "var(--green-500)", border: "2px solid var(--app-bg)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: "var(--ink)" }}>Zavtoo Support</p>
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--success-text)", fontWeight: 500 }}>{typing ? "typing…" : "Online · replies in ~2 min"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="no-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 16px 8px" }}>
        <p style={{ textAlign: "center", margin: "0 0 12px" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", background: "var(--surface)", padding: "4px 12px", borderRadius: 999 }}>Today</span>
        </p>
        {messages.map((m) => {
          const me = m.from === "me";
          return (
            <div key={m.id} className="fade-up" style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{ maxWidth: "78%" }}>
                <div style={{
                  padding: "10px 14px", fontSize: 13.5, lineHeight: 1.5,
                  borderRadius: me ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                  background: me ? "linear-gradient(135deg,var(--blue),var(--blue-dark))" : "var(--surface)",
                  color: me ? "white" : "var(--ink)",
                  boxShadow: me ? "0 4px 12px rgba(11,92,255,0.22)" : "var(--shadow-card)",
                }}>{m.body}</div>
                <p style={{ margin: "3px 6px 0", fontSize: 10.5, color: "var(--ink-mute)", textAlign: me ? "right" : "left" }}>{m.at}{me && " · ✓✓"}</p>
              </div>
            </div>
          );
        })}
        {typing && (
          <div style={{ display: "inline-flex", gap: 4, background: "var(--surface)", padding: "12px 14px", borderRadius: "18px 18px 18px 6px", boxShadow: "var(--shadow-card)" }}>
            {[0, 1, 2].map((i) => <span key={i} className="animate-pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ink-mute)", animationDelay: `${i * 0.2}s` }} />)}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick replies + composer — sits above the floating bottom nav */}
      <div style={{ padding: "6px 16px 0" }}>
        <div className="no-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
          {QUICK.map((q) => (
            <button key={q} onClick={() => send(q === "Share order number" ? "My order number is ZVT1234" : q)} style={{
              flexShrink: 0, border: "1.5px solid var(--blue-ghost)", background: "var(--surface)", color: "var(--blue)",
              borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>{q}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: onBack ? "calc(12px + env(safe-area-inset-bottom))" : 10 }}>
          <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", borderRadius: 999, padding: "10px 14px", boxShadow: "var(--shadow-card)" }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message..."
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)" }} />
            <span aria-label="Attach photo" style={{ display: "flex" }}><ClipIcon s={19} c="var(--ink-mute)" /></span>
          </label>
          <button type="submit" aria-label="Send" className="press" disabled={!draft.trim()} style={{
            width: 46, height: 46, borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
            background: draft.trim() ? "linear-gradient(135deg,var(--blue),var(--blue-dark))" : "var(--line-strong)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: draft.trim() ? "0 6px 14px rgba(11,92,255,0.3)" : "none",
          }}><SendIcon s={19} c="white" w={2} /></button>
        </form>
      </div>
    </div>
  );
}

/* ───────────────────────── Profile ───────────────────────── */

export type ProfileKey = "orders" | "history" | "amc" | "addresses" | "payments" | "notifications" | "help" | "about";

const MENU: { key: ProfileKey; label: string; Icon: (p: { s?: number; c?: string; w?: number }) => React.ReactElement }[] = [
  { key: "orders", label: "My Orders", Icon: BagIcon },
  { key: "history", label: "Service History", Icon: HistoryIcon },
  { key: "amc", label: "AMC Plans", Icon: ShieldIcon },
  { key: "addresses", label: "Addresses", Icon: PinIcon },
  { key: "payments", label: "Payment Methods", Icon: CardIcon },
  { key: "notifications", label: "Notifications", Icon: BellIcon },
  { key: "help", label: "Help & Support", Icon: HelpIcon },
  { key: "about", label: "About Us", Icon: InfoIcon },
];

export function ProfileScreen({ stats, onMenu, onLogout }: {
  stats: { orders: number; services: number; amcDays: number }; onMenu: (k: ProfileKey) => void; onLogout: () => void;
}) {
  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="Your Profile" right={<button aria-label="Settings" className="press" style={iconBtn}><GearIcon s={22} c="var(--text-secondary)" /></button>} />

      {/* Identity card */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ ...card, padding: "18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 58, height: 58, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg,var(--blue),var(--blue-dark))", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 700,
              boxShadow: "0 4px 12px rgba(11,92,255,0.3)",
            }}>{USER.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>{USER.name}</p>
              <p style={{ margin: "1px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{USER.email}</p>
              <p style={{ margin: "1px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>{USER.phone}</p>
            </div>
            <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, letterSpacing: "0.03em", alignSelf: "flex-start" }}>EDIT</button>
          </div>
          <span style={{ display: "inline-block", marginTop: 14, background: "var(--green)", color: "white", fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 6, letterSpacing: "0.02em" }}>AMC ACTIVE</span>
        </div>
      </div>

      {/* Snapshot strip */}
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ ...card, padding: "14px 16px", display: "flex" }}>
          {[[String(stats.orders), "Orders"], [String(stats.services), "Services"], [`${stats.amcDays}d`, "AMC left"]].map(([v, l], i) => (
            <div key={l} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{v}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dealer programme — opens the separate dealer app */}
      <div style={{ padding: "14px 16px 0" }}>
        <Link href="/dealer" className="press" style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 18, textDecoration: "none",
          background: "linear-gradient(135deg,var(--blue-dark),var(--blue))", color: "white", boxShadow: "0 8px 20px rgba(11,92,255,0.25)",
        }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <StoreIcon s={22} c="var(--gold)" />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>Own an RO shop?</span>
            <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.78)" }}>Become a Zavtoo dealer · list &amp; sell locally</span>
          </span>
          <ChevronRight s={16} c="white" />
        </Link>
      </div>

      {/* Menu — flat rows on the canvas, split by hairlines */}
      <div style={{ padding: "18px 16px 0" }}>
        {MENU.map(({ key, label, Icon }, i) => (
          <button key={key} onClick={() => onMenu(key)} className="press" style={{
            width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "16px 2px",
            background: "none", border: "none", borderTop: i === 0 ? "none" : "1px solid var(--line)",
            cursor: "pointer", textAlign: "left",
          }}>
            <Icon s={22} c="var(--text-muted)" w={1.6} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
            <ChevronRight s={16} c="var(--ink-mute)" />
          </button>
        ))}
      </div>

      <div style={{ padding: "22px 16px 12px" }}>
        <button onClick={onLogout} className="press" style={{
          width: "100%", background: "var(--surface)", color: "var(--red)", border: "none", borderRadius: 16,
          padding: 15, fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>Log Out</button>
        <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-disabled)", marginTop: 14 }}>Zavtoo v1.0.0</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Simple info pages from the profile menu ───────────────────────── */

export function InfoPage({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title={title} onBack={onBack} />
      <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}
