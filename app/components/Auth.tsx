"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark, Wordmark } from "./Brand";
import { PrimaryButton, field, label } from "./ui";
import { friendly, roleOf, sendPasswordReset, supabaseFor } from "../lib/supabase";
import { EMAIL_RE, emailFormatProblem, emailTypo } from "../lib/emailCheck";

/* Customer login / sign-up (email + password), plus "forgot password" which emails a reset link. */

const sb = () => supabaseFor("customer");

export function CustomerAuth({ initialReferral = "" }: { initialReferral?: string }) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialReferral ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState(initialReferral);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Sign-up email check: a popup when the email can't be used, and a "did you mean" hint for typos.
  const [emailPopup, setEmailPopup] = useState<{ reason: string; suggestion: string | null } | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const latestEmail = useRef("");

  const signup = mode === "signup";
  const forgot = mode === "forgot";
  const problem = signup && name.trim().length < 2 ? "Enter your full name"
    : !EMAIL_RE.test(email.trim()) ? "Enter a valid email"
    : signup && phone && !/^[6-9]\d{9}$/.test(phone) ? "Enter a 10-digit mobile number"
    : forgot ? null
    : password.length < (signup ? 8 : 1) ? (signup ? "Password must be at least 8 characters" : "Enter your password")
    : null;

  /** Checks the sign-up email (format, throwaway inbox, domain can receive mail). Opens the popup and returns false if it's not usable. */
  const checkEmail = async (value: string) => {
    const e = value.trim().toLowerCase();
    latestEmail.current = e;
    const typo = emailTypo(e);
    setSuggestion(typo);
    const local = emailFormatProblem(e);
    if (local) { setEmailPopup({ reason: local, suggestion: typo }); return false; }
    try {
      const out = await (await fetch(`/api/check-email?email=${encodeURIComponent(e)}`)).json();
      if (latestEmail.current !== e) return true; // they've typed something else since
      if (out.error) { setEmailPopup({ reason: out.error, suggestion: typo }); return false; }
    } catch {
      // Offline or server hiccup: let sign-up decide.
    }
    return true;
  };

  const applySuggestion = (s: string) => {
    setEmail(s); setSuggestion(null); setEmailPopup(null); setErr(null);
    latestEmail.current = s;
  };

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
    if (signup && problem === "Enter a valid email") { setEmailPopup({ reason: emailFormatProblem(email.trim().toLowerCase()) ?? problem, suggestion: emailTypo(email.trim().toLowerCase()) }); return; }
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr(null);
    try {
      if (signup && !(await checkEmail(email))) { setBusy(false); return; }
      if (forgot) {
        await sendPasswordReset("customer", email);
        setSentTo(email.trim().toLowerCase());
        setBusy(false);
        return;
      }
      if (signup) {
        const res = await fetch("/api/signup", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password, phone, referral: referral.trim() }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok && out.field === "email") { setEmailPopup({ reason: out.error, suggestion: emailTypo(email.trim().toLowerCase()) }); setBusy(false); return; }
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
        <h1 style={{ margin: "22px 0 4px", fontSize: 26, fontWeight: 800 }}>{signup ? "Create your account" : forgot ? "Reset your password" : "Welcome back"}</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>
          {signup ? "Buy purifiers, book service and track your technician live."
            : forgot ? (sentTo ? `If ${sentTo} has a Zavtoo account, we've emailed it a link to choose a new password. Check your inbox and spam folder.` : "Enter your account email and we'll send you a link to choose a new password.")
            : "Log in to see your orders and service visits."}
        </p>

        <div style={{ marginTop: 22 }}>
          {signup && (
            <>
              <label style={label} htmlFor="a-name">Full name</label>
              <input id="a-name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} style={{ ...field, marginBottom: 14 }} />
            </>
          )}
          <label style={label} htmlFor="a-email">Email</label>
          <input id="a-email" ref={emailRef} type="email" autoComplete="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setErr(null); setSuggestion(null); }}
            onBlur={() => { if (signup && email.trim()) checkEmail(email); }}
            style={{ ...field, marginBottom: suggestion && signup ? 6 : 14 }} />
          {signup && suggestion && (
            <p style={{ margin: "0 2px 14px", fontSize: 12.5, color: "var(--ink-soft)" }}>
              Did you mean{" "}
              <button type="button" onClick={() => applySuggestion(suggestion)} style={{ background: "none", border: "none", padding: 0, color: "var(--blue)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{suggestion}</button>?
            </p>
          )}
          {signup && (
            <>
              <label style={label} htmlFor="a-phone">Mobile number <span style={{ fontWeight: 400, color: "var(--ink-mute)" }}>(for your technician)</span></label>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <span style={{ ...field, width: "auto", color: "var(--ink-soft)" }}>+91</span>
                <input id="a-phone" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErr(null); }} style={{ ...field, flex: 1 }} />
              </div>
            </>
          )}
          {!forgot && (
            <>
              <label style={label} htmlFor="a-pass">Password</label>
              <div style={{ position: "relative" }}>
                <input id="a-pass" type={showPw ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} value={password}
                  onChange={(e) => { setPassword(e.target.value); setErr(null); }} style={{ ...field, paddingRight: 64 }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{showPw ? "Hide" : "Show"}</button>
              </div>
            </>
          )}
          {mode === "login" && (
            <button type="button" onClick={() => { setMode("forgot"); setErr(null); setSentTo(null); }} style={{ display: "block", marginLeft: "auto", marginTop: 10, background: "none", border: "none", padding: 0, color: "var(--blue)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              Forgot password?
            </button>
          )}
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
        <PrimaryButton disabled={busy}>
          {busy ? (signup ? "Creating account…" : forgot ? "Sending…" : "Logging in…")
            : signup ? "Create Account" : forgot ? (sentTo ? "Send again" : "Send reset link") : "Log In"}
        </PrimaryButton>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-soft)", margin: "14px 0 0" }}>
          {signup ? "Already have an account? " : forgot ? "Remembered it? " : "New to Zavtoo? "}
          <button type="button" onClick={() => { setMode(signup || forgot ? "login" : "signup"); setErr(null); }} style={{ background: "none", border: "none", padding: 0, color: "var(--blue)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {signup || forgot ? "Log in" : "Create an account"}
          </button>
        </p>
        {forgot && <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)", margin: "8px 0 0" }}>No email? Call our account helpline at 89-290-290-06 and we&apos;ll reset it.</p>}
      </div>
      {emailPopup && (
        <EmailPopup reason={emailPopup.reason} suggestion={emailPopup.suggestion} onUse={applySuggestion}
          onClose={() => { setEmailPopup(null); emailRef.current?.focus(); }} />
      )}
    </form>
  );
}

/** Sign-up email check for any sign-up form: format, throwaway inbox, and a domain that can receive mail.
 *  Returns what to show in <EmailPopup>, or null when the email is usable (or the check couldn't run). */
export async function signupEmailProblem(value: string): Promise<{ reason: string; suggestion: string | null } | null> {
  const e = value.trim().toLowerCase();
  const suggestion = emailTypo(e);
  const local = emailFormatProblem(e);
  if (local) return { reason: local, suggestion };
  try {
    const out = await (await fetch(`/api/check-email?email=${encodeURIComponent(e)}`)).json();
    if (out.error) return { reason: out.error, suggestion };
  } catch {
    // Offline or server hiccup: the sign-up API checks again.
  }
  return null;
}

export function EmailPopup({ reason, suggestion, onUse, onClose }: {
  reason: string; suggestion: string | null; onUse: (s: string) => void; onClose: () => void;
}) {
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(4,20,48,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="email-popup-title" aria-describedby="email-popup-reason" onClick={(e) => e.stopPropagation()}
        className="fade-up" style={{ width: "100%", maxWidth: 340, background: "var(--surface)", borderRadius: 20, padding: "24px 22px 20px", textAlign: "center", boxShadow: "0 20px 50px rgba(4,36,107,0.30)" }}>
        <div aria-hidden style={{ width: 48, height: 48, margin: "0 auto 12px", borderRadius: "50%", background: "var(--error)", border: "1.5px solid var(--error-border)", color: "var(--error-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800 }}>!</div>
        <h2 id="email-popup-title" style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>Please enter a valid email</h2>
        <p id="email-popup-reason" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-soft)" }}>
          {reason === "Enter a valid email" ? "An email looks like name@gmail.com. Check it for typos and missing letters." : reason}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          {suggestion && (
            <button type="button" onClick={() => onUse(suggestion)} className="press" style={{
              width: "100%", border: "none", borderRadius: 16, padding: "13px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              background: "linear-gradient(135deg,var(--blue),var(--blue-dark))", color: "white", overflowWrap: "anywhere",
            }}>Use {suggestion}</button>
          )}
          <button ref={okRef} type="button" onClick={onClose} className="press" style={{
            width: "100%", borderRadius: 16, padding: "13px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            border: suggestion ? "1.5px solid var(--line)" : "none", background: suggestion ? "var(--surface)" : "linear-gradient(135deg,var(--blue),var(--blue-dark))", color: suggestion ? "var(--ink)" : "white",
          }}>{suggestion ? "Edit email" : "OK"}</button>
        </div>
      </div>
    </div>
  );
}
