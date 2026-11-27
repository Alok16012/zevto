"use client";

import { useEffect, useState } from "react";
import { fmtStamp } from "../lib/db";
import { supabaseFor, type AppKind } from "../lib/supabase";

/** Someone already on record who looks like the customer being typed in (supabase/rating-and-duplicates-migration.sql). */
export interface DuplicateHit {
  match: "Same mobile" | "Same email" | "Same address";
  /** Only returned to admins. */
  customer_id: string | null;
  customer_code: string | null;
  name: string; phone: string; address: string | null; pincode: string | null;
  last_ref: string | null; last_at: string | null;
}

/**
 * Looks up existing customers with the same mobile, email, or the same address in
 * the same pincode under another mobile — while the form is being filled (debounced).
 */
export function useDuplicates(app: AppKind, phone: string, address: string, pincode: string, email = "") {
  const [hits, setHits] = useState<DuplicateHit[]>([]);
  const digits = phone.replace(/\D/g, "").slice(-10);
  const ready = digits.length === 10 || (address.trim().length >= 8 && /^[1-9]\d{5}$/.test(pincode)) || /\S+@\S+\.\S+/.test(email);
  useEffect(() => {
    if (!ready) { setHits([]); return; }
    let alive = true;
    const t = setTimeout(() => {
      void supabaseFor(app).rpc("find_duplicates", {
        p_phone: digits.length === 10 ? digits : "", p_address: address.trim(), p_pincode: pincode, p_email: email.trim(),
      }).then(({ data, error }) => {
        // Before the migration runs the function doesn't exist — just show nothing.
        if (alive) setHits(error ? [] : ((data ?? []) as DuplicateHit[]));
      });
    }, 500);
    return () => { alive = false; clearTimeout(t); };
  }, [app, digits, address, pincode, email, ready]);
  return hits;
}

/** The yellow "this customer may already exist" box shown under the customer fields. */
export function DuplicateWarning({ hits, onUse }: {
  hits: DuplicateHit[];
  /** Admin only: attach the task to this existing app customer. */
  onUse?: (h: DuplicateHit) => void;
}) {
  if (!hits.length) return null;
  const sameMobile = hits.some((h) => h.match === "Same mobile");
  return (
    <div role="alert" style={{ marginTop: 12, padding: "12px 14px", borderRadius: 14, background: "var(--warning)", border: "1px solid rgba(180,120,0,0.25)" }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--warning-text)" }}>
        {sameMobile ? "⚠ This mobile number is already a customer" : "⚠ This customer may already exist"}
      </p>
      <p style={{ margin: "2px 0 8px", fontSize: 12, color: "var(--warning-text)" }}>
        {sameMobile
          ? "The task will be added to their existing record — please don't create a new customer under another name."
          : "Same house, different number? Check with the customer before making a new record, so AMC and service history stay in one account."}
      </p>
      {hits.map((h, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: i ? "1px solid rgba(180,120,0,0.18)" : "none", fontSize: 12.5 }}>
          <div style={{ flex: 1, minWidth: 0, color: "var(--ink)" }}>
            <b>{h.name || "Customer"}</b>{h.customer_code ? ` · ${h.customer_code}` : ""} · {h.phone}
            <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "var(--warning-text)" }}>{h.match}</span>
            <div style={{ color: "var(--ink-soft)", overflowWrap: "anywhere" }}>
              {[h.address, h.pincode].filter(Boolean).join(" · ")}
              {h.last_ref ? ` · last job #${h.last_ref}${h.last_at ? ` (${fmtStamp(h.last_at)?.split(",")[0]})` : ""}` : ""}
            </div>
          </div>
          {onUse && h.customer_id && (
            <button type="button" onClick={() => onUse(h)} style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 10, border: "1px solid var(--blue)", background: "var(--surface)", color: "var(--blue)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Use this customer</button>
          )}
        </div>
      ))}
    </div>
  );
}
