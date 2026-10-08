"use client";

import { ChevronDown } from "../icons";
import { card, field, label } from "../ui";
import type { JobState } from "../../lib/data";
import type { DealerOrderStatus } from "../../lib/dealerData";

/* Small pieces shared by the dealer screens. */

type Tone = "green" | "amber" | "blue" | "purple" | "red" | "grey";

const TONE: Record<Tone, { bg: string; fg: string; bd: string }> = {
  green:  { bg: "var(--success)", fg: "var(--success-text)", bd: "var(--success-border)" },
  amber:  { bg: "var(--warning)", fg: "var(--warning-text)", bd: "var(--warning-border)" },
  blue:   { bg: "var(--info-bg)", fg: "var(--info-text)", bd: "var(--info-border)" },
  purple: { bg: "var(--purple-tint)", fg: "var(--purple)", bd: "#e9e3ff" },
  red:    { bg: "var(--error)", fg: "var(--error-text)", bd: "#fecaca" },
  grey:   { bg: "var(--surface-dim)", fg: "var(--text-muted)", bd: "var(--border)" },
};

export const ORDER_TONE: Record<DealerOrderStatus, Tone> = {
  New: "purple", Accepted: "blue", Shipped: "amber", Delivered: "green", Rejected: "red", Cancelled: "grey",
};
export const JOB_TONE: Record<JobState, Tone> = {
  Requested: "purple", "With ops": "purple", Assigned: "blue", "On the way": "amber", Arrived: "amber",
  "In Progress": "amber", Completed: "green", Rescheduled: "red", Cancelled: "grey",
};
/** What the dealer calls each job state. */
export const JOB_LABEL: Record<JobState, string> = {
  Requested: "Open", "With ops": "Open", Assigned: "Assigned", "On the way": "On the way", Arrived: "Arrived",
  "In Progress": "In progress", Completed: "Completed", Rescheduled: "Needs new slot", Cancelled: "Cancelled",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <span style={{
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

export function Switch({ on, onChange, label: aria }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={aria} onClick={(e) => { e.stopPropagation(); onChange(!on); }} style={{
      width: 42, height: 24, borderRadius: 999, border: "none", padding: 3, cursor: "pointer", flexShrink: 0,
      background: on ? "var(--green-500)" : "var(--line-strong)", transition: "background 0.2s",
      display: "flex", justifyContent: on ? "flex-end" : "flex-start",
    }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

export function Field({ id, label: text, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} style={label}>{text}</label>
      {children}
      {error ? <p style={{ margin: "5px 2px 0", fontSize: 11.5, color: "var(--error-text)" }}>{error}</p>
        : hint ? <p style={{ margin: "5px 2px 0", fontSize: 11.5, color: "var(--ink-mute)" }}>{hint}</p> : null}
    </div>
  );
}

export const inputStyle = (bad?: boolean): React.CSSProperties => ({ ...field, ...(bad ? { border: "1.5px solid var(--error-text)" } : {}) });

export function Select({ id, value, onChange, children, bad }: { id: string; value: string; onChange: (v: string) => void; children: React.ReactNode; bad?: boolean }) {
  return (
    <div style={{ position: "relative" }}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle(bad), appearance: "none", paddingRight: 40 }}>
        {children}
      </select>
      <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
        <ChevronDown s={18} c="var(--ink-soft)" />
      </span>
    </div>
  );
}

/** Horizontal scroll of filter chips with counts. */
export function Chips<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; count?: number }[] }) {
  return (
    <div className="no-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 0" }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} aria-pressed={on} style={{
            flexShrink: 0, border: on ? "1.5px solid var(--blue)" : "1.5px solid var(--line)", cursor: "pointer",
            background: on ? "var(--blue)" : "var(--surface)", color: on ? "white" : "var(--ink-soft)",
            borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 600,
          }}>
            {it.label}{it.count !== undefined && <span style={{ opacity: 0.75, marginLeft: 5 }}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: "32px 20px" }}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>{body}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", fontSize: 13.5 }}>
      <span style={{ color: "var(--ink-soft)", flexShrink: 0 }}>{k}</span>
      <span style={{ color: "var(--ink)", fontWeight: strong ? 700 : 600, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{v}</span>
    </div>
  );
}

export const sectionH: React.CSSProperties = { margin: "20px 2px 10px", fontSize: 15, fontWeight: 700, color: "var(--ink)" };

export const ghostBtn: React.CSSProperties = {
  flex: 1, background: "var(--surface)", border: "1.5px solid var(--line-strong)", borderRadius: 14,
  padding: "13px 12px", fontSize: 14, fontWeight: 600, color: "var(--ink)", cursor: "pointer",
};
