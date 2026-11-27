"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { friendly, supabaseFor } from "../lib/supabase";

const BRAND = "#00869e";
const SERVICES = ["RO Repair", "RO Service", "New RO Installation", "AMC Plan", "Filter Change", "Buy a new RO"];
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
type Track = Record<(typeof UTM)[number] | "fbclid" | "gclid" | "landing_url" | "referrer", string>;
const KEY = "zavtoo:lead-track";

/** Where the visitor came from. The first ad click is kept for the session, so browsing doesn't lose it. */
function readTracking(): Track {
  const q = new URLSearchParams(window.location.search);
  const now: Track = {
    utm_source: q.get("utm_source") ?? "", utm_medium: q.get("utm_medium") ?? "", utm_campaign: q.get("utm_campaign") ?? "",
    utm_term: q.get("utm_term") ?? "", utm_content: q.get("utm_content") ?? "",
    fbclid: q.get("fbclid") ?? "", gclid: q.get("gclid") ?? "",
    landing_url: window.location.href, referrer: document.referrer,
  };
  try {
    if (now.utm_source || now.fbclid || now.gclid) { sessionStorage.setItem(KEY, JSON.stringify(now)); return now; }
    const saved = sessionStorage.getItem(KEY);
    if (saved) return { ...now, ...JSON.parse(saved) };
  } catch { /* storage blocked — use what's in the link */ }
  return now;
}

export default function LeadForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [service, setService] = useState(SERVICES[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const track = useRef<Track | null>(null);
  useEffect(() => { track.current = readTracking(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Please enter a valid 10-digit mobile number.");
    if (pincode && !/^[1-9]\d{5}$/.test(pincode)) return setError("Please enter a valid 6-digit pincode.");
    const t = track.current ?? readTracking();
    setBusy(true);
    const { data, error: err } = await supabaseFor("store").rpc("submit_lead", {
      p_name: name.trim(), p_phone: phone, p_pincode: pincode, p_address: address.trim(), p_service: service, p_message: message.trim(),
      p_utm_source: t.utm_source, p_utm_medium: t.utm_medium, p_utm_campaign: t.utm_campaign, p_utm_term: t.utm_term, p_utm_content: t.utm_content,
      p_fbclid: t.fbclid, p_gclid: t.gclid, p_landing_url: t.landing_url, p_referrer: t.referrer,
    });
    setBusy(false);
    if (err) return setError(friendly(err));
    setDone(String(data ?? ""));
    window.scrollTo({ top: 0 });
  };

  const field: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 12, border: "1.5px solid #d6dde6", fontSize: 16,
    background: "#fff", color: "#0f1729", fontFamily: "inherit", outline: "none",
  };
  const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#334155", margin: "14px 0 6px" };

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(160deg,#e6f6f9 0%,#f5f8fb 55%)", padding: "24px 16px 40px", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/zavtoo-logo.png" alt="Zavtoo Paani Filter" style={{ height: 44, width: "auto", display: "block", margin: "0 auto" }} />
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 18px", boxShadow: "0 12px 32px rgba(15,23,41,0.08)" }}>
          {done !== null ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: "#e3f6ec", color: "#15803d", fontSize: 34, lineHeight: "64px", margin: "0 auto 12px" }}>✓</div>
              <h1 style={{ margin: 0, fontSize: 22, color: "#0f1729" }}>Thank you, {name.trim().split(" ")[0]}!</h1>
              <p style={{ margin: "8px 0 0", fontSize: 15, color: "#475569", lineHeight: 1.5 }}>Our team will call you on <b>+91 {phone}</b> shortly.{done ? <><br />Your request no. <b>{done}</b></> : null}</p>
              <a href="https://wa.me/918929454647" style={{ display: "inline-block", marginTop: 18, padding: "12px 18px", borderRadius: 999, background: "#25d366", color: "#fff", fontWeight: 700, textDecoration: "none" }}>Chat on WhatsApp</a>
              <a href="/" style={{ display: "block", marginTop: 12, color: BRAND, fontWeight: 600, fontSize: 14 }}>Visit our website</a>
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)} noValidate>
              <h1 style={{ margin: 0, fontSize: 22, color: "#0f1729", lineHeight: 1.25 }}>RO service at your doorstep</h1>
              <p style={{ margin: "6px 0 0", fontSize: 14.5, color: "#475569", lineHeight: 1.5 }}>Repair, service, installation & AMC for every brand. Leave your number — we&apos;ll call you back.</p>

              <label style={label} htmlFor="ld-name">Your name</label>
              <input id="ld-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" style={field} />

              <label style={label} htmlFor="ld-phone">Mobile number</label>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ ...field, width: "auto", color: "#64748b" }}>+91</span>
                <input id="ld-phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(-10))} inputMode="numeric" autoComplete="tel-national" style={{ ...field, flex: 1 }} />
              </div>

              <label style={label} htmlFor="ld-service">What do you need?</label>
              <select id="ld-service" value={service} onChange={(e) => setService(e.target.value)} style={field}>
                {SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select>

              <label style={label} htmlFor="ld-pin">Pincode <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
              <input id="ld-pin" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="postal-code" style={field} />

              <label style={label} htmlFor="ld-addr">Address <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
              <textarea id="ld-addr" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={250} autoComplete="street-address" style={{ ...field, resize: "vertical" }} />

              <label style={label} htmlFor="ld-msg">Problem <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
              <textarea id="ld-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={500} placeholder="e.g. water is salty, leaking, not starting" style={{ ...field, resize: "vertical" }} />

              {error && <p role="alert" style={{ margin: "12px 0 0", color: "#b91c1c", fontSize: 14, fontWeight: 600 }}>{error}</p>}
              <button type="submit" disabled={busy} style={{ width: "100%", marginTop: 18, padding: 15, borderRadius: 14, border: "none", background: BRAND, color: "#fff", fontSize: 16, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
                {busy ? "Sending…" : "Get a call back"}
              </button>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#94a3b8", textAlign: "center" }}>20+ years · 50,000+ families · Every brand serviced</p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
