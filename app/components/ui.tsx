"use client";

import { BackIcon } from "./icons";
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
