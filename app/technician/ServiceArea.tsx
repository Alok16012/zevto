"use client";

import { useState } from "react";
import { CloseIcon, PinIcon } from "../components/icons";
import { PrimaryButton, card, field, label } from "../components/ui";
import { PIN_AREAS, isPincode } from "../lib/data";

const MAX_NEARBY = 10;

/** Primary pincode + the nearby pincodes a technician also covers. */
export function ServiceAreaEditor({ initial, onSave, saveLabel = "Save service area" }: {
  initial: string[]; onSave: (pins: string[]) => void; saveLabel?: string;
}) {
  const [primary, setPrimary] = useState(initial[0] ?? "");
  const [nearby, setNearby] = useState<string[]>(initial.slice(1));
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const add = (pin: string) => {
    if (!isPincode(pin)) { setErr("A pincode is 6 digits and can't start with 0"); return; }
    if (pin === primary || nearby.includes(pin)) { setErr("Already added"); return; }
    if (nearby.length >= MAX_NEARBY) { setErr(`Up to ${MAX_NEARBY} nearby pincodes`); return; }
    setNearby([...nearby, pin]); setDraft(""); setErr(null);
  };

  // Suggest known pincodes from the same district (same first 3 digits) as the primary.
  const suggestions = isPincode(primary)
    ? Object.keys(PIN_AREAS).filter((p) => p.slice(0, 3) === primary.slice(0, 3) && p !== primary && !nearby.includes(p))
    : [];
  const valid = isPincode(primary);

  return (
    <div>
      <label style={label} htmlFor="sa-primary">Primary pincode</label>
      <p style={{ margin: "-4px 0 8px", fontSize: 12, color: "var(--ink-soft)" }}>Where you live or start your day. You get these jobs first.</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input id="sa-primary" inputMode="numeric" value={primary} placeholder="e.g. 201309"
          onChange={(e) => { setPrimary(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(null); }}
          style={{ ...field, width: 150, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", ...(primary.length === 6 && !valid ? { border: "1.5px solid var(--error-text)" } : {}) }} />
        {valid && <span style={{ fontSize: 12.5, color: "var(--success-text)", fontWeight: 600 }}>{PIN_AREAS[primary] ?? "✓ Valid pincode"}</span>}
      </div>

      <label style={{ ...label, marginTop: 18 }} htmlFor="sa-add">Nearby pincodes you also cover</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: nearby.length ? 10 : 0 }}>
        {nearby.map((p) => (
          <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 12px", borderRadius: 999, background: "var(--blue-tint)", color: "var(--blue)", fontSize: 13, fontWeight: 700 }}>
            {p}{PIN_AREAS[p] && <span style={{ fontWeight: 500, fontSize: 11.5 }}>· {PIN_AREAS[p]}</span>}
            <button onClick={() => setNearby(nearby.filter((x) => x !== p))} aria-label={`Remove ${p}`} style={{ width: 20, height: 20, borderRadius: "50%", border: "none", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
              <CloseIcon s={10} c="var(--blue)" w={3} />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); add(draft); }} style={{ display: "flex", gap: 8 }}>
        <input id="sa-add" inputMode="numeric" value={draft} placeholder="Add pincode"
          onChange={(e) => { setDraft(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(null); }} style={{ ...field, flex: 1 }} />
        <button type="submit" disabled={draft.length !== 6} style={{
          border: "none", borderRadius: 14, padding: "0 18px", fontSize: 14, fontWeight: 700, cursor: draft.length === 6 ? "pointer" : "not-allowed",
          background: draft.length === 6 ? "var(--blue)" : "var(--line-strong)", color: draft.length === 6 ? "white" : "var(--ink-mute)",
        }}>Add</button>
      </form>
      {err && <p role="alert" style={{ margin: "6px 2px 0", fontSize: 12, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: "0 0 6px", fontSize: 11.5, color: "var(--ink-mute)", fontWeight: 600 }}>Suggested near {primary}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggestions.map((p) => (
              <button key={p} onClick={() => add(p)} style={{ border: "1.5px dashed var(--blue)", background: "var(--surface)", color: "var(--blue)", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                + {p} · {PIN_AREAS[p]}
              </button>
            ))}
          </div>
        </div>
      )}
      <p style={{ margin: "14px 2px", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
        Customers in these {1 + nearby.length} pincode{nearby.length ? "s" : ""} will see you and can pick you for their job.
      </p>
      <PrimaryButton disabled={!valid} onClick={() => onSave([primary, ...nearby])}>{saveLabel}</PrimaryButton>
    </div>
  );
}

/** Read-only summary used on the profile. */
export function ServiceAreaSummary({ pins, onEdit }: { pins: string[]; onEdit: () => void }) {
  return (
    <div style={{ ...card, padding: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <PinIcon s={22} c="var(--blue)" />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>Primary · {pins[0]} <span style={{ fontWeight: 500, color: "var(--ink-soft)" }}>{PIN_AREAS[pins[0]] ?? ""}</span></p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {pins.slice(1).map((p) => <span key={p} style={{ fontSize: 11.5, fontWeight: 600, color: "var(--blue)", background: "var(--blue-tint)", padding: "4px 9px", borderRadius: 999 }}>{p}</span>)}
            {pins.length === 1 && <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>No nearby pincodes yet</span>}
          </div>
        </div>
        <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue)", fontSize: 12.5, fontWeight: 600 }}>EDIT</button>
      </div>
    </div>
  );
}
