"use client";

import { useState } from "react";
import { BrandMark, Wordmark } from "./Brand";
import { PrimaryButton, field, label } from "./ui";
import { friendly, roleOf, supabaseFor } from "../lib/supabase";

/* Customer login / sign-up (email + password). */

const sb = () => supabaseFor("customer");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function CustomerAuth({ initialReferral = "" }: { initialReferral?: string }) {
  const [mode, setMode] = useState<"login" | "signup">(initialReferral ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState(initialReferral);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const signup = mode === "signup";
  const problem = signup && name.trim().length < 2 ? "Enter your full name"
    : !EMAIL_RE.test(email.trim()) ? "Enter a valid email"
    : signup && phone && !/^[6-9]\d{9}$/.test(phone) ? "Enter a 10-digit mobile number"
    : password.length < (signup ? 8 : 1) ? (signup ? "Password must be at least 8 characters" : "Enter your password")
    : null;

  const login = async () => {
    const { data, error } = await sb().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    if (roleOf(data.session) !== "customer") {
      await sb().auth.signOut();
      throw new Error("This is a staff account. Technicians use /technician and admins use /admin.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr(null);
    try {
      if (signup) {
        const res = await fetch("/api/signup", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password, phone, referral: referral.trim() }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(out.error ?? "Couldn't create your account");
      }
      await login();
    } catch (e2) {
      setErr(friendly(e2));
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="fade-up no-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: "0 20px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><BrandMark size={48} /><Wordmark /></div>
        <h1 style={{ margin: "22px 0 4px", fontSize: 26, fontWeight: 800 }}>{signup ? "Create your account" : "Welcome back"}</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>{signup ? "Buy purifiers, book service and track your technician live." : "Log in to see your orders and service visits."}</p>

        <div style={{ marginTop: 22 }}>
          {signup && (
            <>
              <label style={label} htmlFor="a-name">Full name</label>
              <input id="a-name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} style={{ ...field, marginBottom: 14 }} />
            </>
          )}
          <label style={label} htmlFor="a-email">Email</label>
          <input id="a-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} style={{ ...field, marginBottom: 14 }} />
          {signup && (
            <>
              <label style={label} htmlFor="a-phone">Mobile number <span style={{ fontWeight: 400, color: "var(--ink-mute)" }}>(for your technician)</span></label>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <span style={{ ...field, width: "auto", color: "var(--ink-soft)" }}>+91</span>
                <input id="a-phone" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErr(null); }} style={{ ...field, flex: 1 }} />
              </div>
            </>
          )}
          <label style={label} htmlFor="a-pass">Password</label>
          <div style={{ position: "relative" }}>
            <input id="a-pass" type={showPw ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} value={password}
              onChange={(e) => { setPassword(e.target.value); setErr(null); }} style={{ ...field, paddingRight: 64 }} />
            <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{showPw ? "Hide" : "Show"}</button>
          </div>
          {signup && (
            <>
              <label style={{ ...label, marginTop: 14 }} htmlFor="a-ref">Referral code <span style={{ fontWeight: 400, color: "var(--ink-mute)" }}>(optional)</span></label>
              <input id="a-ref" value={referral} placeholder="CUS-100101" onChange={(e) => { setReferral(e.target.value.toUpperCase()); setErr(null); }} style={field} />
            </>
          )}
          {err && <p role="alert" style={{ margin: "12px 2px 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
        </div>
      </div>
      <div style={{ padding: "18px 0 calc(24px + env(safe-area-inset-bottom))" }}>
        <PrimaryButton disabled={busy}>{busy ? (signup ? "Creating account…" : "Logging in…") : signup ? "Create Account" : "Log In"}</PrimaryButton>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-soft)", margin: "14px 0 0" }}>
          {signup ? "Already have an account? " : "New to Zavtoo? "}
          <button type="button" onClick={() => { setMode(signup ? "login" : "signup"); setErr(null); }} style={{ background: "none", border: "none", padding: 0, color: "var(--blue)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {signup ? "Log in" : "Create an account"}
          </button>
        </p>
        {!signup && <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)", margin: "8px 0 0" }}>Forgot your password? Call or WhatsApp +91 97117 78855 and we&apos;ll reset it.</p>}
      </div>
    </form>
  );
}
