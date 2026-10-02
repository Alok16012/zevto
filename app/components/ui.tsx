"use client";

import { BackIcon, ChevronRight } from "./icons";
import type { OrderStatus } from "../lib/data";

/** Detail-page header: back arrow + title on the canvas, optional actions right. */
export function PageHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "18px 16px 12px",
      position: "sticky", top: 0, zIndex: 20, background: "var(--app-bg)",
    }}>
      {onBack && (
        <button onClick={onBack} aria-label="Back" className="press" style={iconBtn}>
          <BackIcon c="var(--ink)" />
        </button>
      )}
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{title}</h2>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 18 }}>{right}</div>}
    </div>
  );
}

export const iconBtn: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  display: "flex", alignItems: "center", position: "relative",
};

/** Segmented pill tabs — white track, blue active pill. */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div style={{
      display: "flex", background: "var(--surface)", borderRadius: 999, padding: 4,
      boxShadow: "var(--shadow-card)",
    }}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} aria-pressed={on} style={{
            flex: 1, border: "none", cursor: "pointer", borderRadius: 999,
            padding: "9px 6px", fontSize: 13.5, fontWeight: on ? 600 : 500,
            background: on ? "var(--blue)" : "transparent",
            color: on ? "white" : "var(--ink-soft)",
            transition: "background 0.2s, color 0.2s",
          }}>{t.label}</button>
        );
      })}
    </div>
  );
}

const TONES: Record<OrderStatus, { bg: string; fg: string; bd: string }> = {
  Cancelled: { bg: "var(--error)", fg: "var(--error-text)", bd: "var(--error-border)" },
  Rescheduled: { bg: "var(--warning)", fg: "var(--warning-text)", bd: "var(--warning-border)" },
  Delivered:     { bg: "var(--success)", fg: "var(--success-text)", bd: "var(--success-border)" },
  Completed:     { bg: "var(--success)", fg: "var(--success-text)", bd: "var(--success-border)" },
  Shipped:       { bg: "var(--warning)", fg: "var(--warning-text)", bd: "var(--warning-border)" },
  "In Progress": { bg: "var(--info-bg)", fg: "var(--info-text)", bd: "var(--info-border)" },
  Placed:        { bg: "var(--info-bg)", fg: "var(--info-text)", bd: "var(--info-border)" },
  Requested:     { bg: "var(--purple-tint)", fg: "var(--purple)", bd: "#e9e3ff" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = TONES[status];
  return (
    <span style={{
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
    }}>{status}</span>
  );
}

export function PrimaryButton({ children, onClick, disabled, tone = "blue", style }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "blue" | "gold"; style?: React.CSSProperties;
}) {
  const gold = tone === "gold";
  return (
    <button onClick={onClick} disabled={disabled} className="press" style={{
      width: "100%", border: "none", borderRadius: 16, padding: "15px 18px",
      fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: disabled ? "var(--line-strong)" : gold ? "linear-gradient(135deg,var(--gold),var(--gold-dark))" : "linear-gradient(135deg,var(--blue),var(--blue-dark))",
      color: disabled ? "var(--ink-mute)" : gold ? "var(--blue-dark)" : "white",
      boxShadow: disabled ? "none" : gold ? "0 6px 16px rgba(245,166,35,0.40)" : "0 6px 16px rgba(11,92,255,0.30)",
      ...style,
    }}>{children}</button>
  );
}

export const card: React.CSSProperties = {
  background: "var(--surface)", borderRadius: 18, boxShadow: "var(--shadow-card)",
};

export const label: React.CSSProperties = {
  display: "block", margin: "0 0 8px", fontSize: 13.5, fontWeight: 600, color: "var(--ink)",
};

export const field: React.CSSProperties = {
  width: "100%", background: "var(--surface)", border: "1.5px solid var(--line)",
  borderRadius: 14, padding: "13px 14px", fontSize: 14, color: "var(--ink)", outline: "none",
};

/** Sticky footer bar for detail pages with a main action. */
export function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "sticky", bottom: 0, zIndex: 20,
      padding: "12px 16px calc(14px + env(safe-area-inset-bottom))",
      background: "linear-gradient(to top, var(--app-bg) 75%, rgba(238,241,251,0))",
    }}>{children}</div>
  );
}

/** Modal sheet that slides up over the current page. */
export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 100, background: "rgba(15,23,41,0.45)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div onClick={(e) => e.stopPropagation()} className="sheet-up no-scroll" style={{
        width: "100%", maxHeight: "82%", overflowY: "auto", background: "var(--app-bg)",
        borderRadius: "24px 24px 0 0", padding: "10px 16px calc(20px + env(safe-area-inset-bottom))",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--line-strong)", margin: "0 auto 12px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{ ...iconBtn, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{
      width: 46, height: 27, borderRadius: 999, border: "none", cursor: "pointer", padding: 3, flexShrink: 0,
      background: on ? "var(--blue)" : "var(--line-strong)", transition: "background 0.2s",
      display: "flex", justifyContent: on ? "flex-end" : "flex-start",
    }}>
      <span style={{ width: 21, height: 21, borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

/** Read-only star row, e.g. ★★★★☆. */
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span aria-label={`${value} out of 5 stars`} style={{ color: "var(--gold)", fontSize: size, letterSpacing: 1, lineHeight: 1 }}>
      {"★".repeat(Math.round(value))}<span style={{ color: "var(--line-strong)" }}>{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

/** Tappable 1–5 star picker. */
export function StarPicker({ value, onChange, size = 32 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} aria-label={`${n} stars`} aria-pressed={n <= value}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: size, lineHeight: 1, color: n <= value ? "var(--gold)" : "var(--line-strong)", padding: 0 }}>★</button>
      ))}
    </div>
  );
}

export function Avatar({ initials, size = 44 }: { initials: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,var(--blue),var(--blue-dark))", color: "white",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 700,
    }}>{initials}</div>
  );
}

export const sectionTitle: React.CSSProperties = { margin: "20px 2px 10px", fontSize: 15, fontWeight: 700, color: "var(--ink)" };

export function ViewAll({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue)", fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>
      View All <ChevronRight s={14} c="var(--blue)" />
    </button>
  );
}
