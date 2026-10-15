"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { COMPANY } from "../storefront/content";
import styles from "./Auth.module.css";
import AuthIcon from "./AuthIcon";
import { friendly, roleOf, sendPasswordReset, supabaseFor } from "../lib/supabase";
import { EMAIL_RE, emailFormatProblem, emailTypo } from "../lib/emailCheck";
import { AuthFooter, ROLE_NAME, type LoginRole } from "./RoleSwitch";

/* Customer login / sign-up (email + password), plus "forgot password" which emails a reset link. */

const sb = () => supabaseFor("customer");

/** `roleSwitch` is the "Log in as" picker, shown on the login form when the apps run as one. */
export function CustomerAuth({ initialReferral = "", roleSwitch }: { initialReferral?: string; roleSwitch?: React.ReactNode }) {
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
  // Sign-up hit an email that already has an account: offer a password reset for it.
  const [taken, setTaken] = useState(false);
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
    const role = roleOf(data.session);
    if (role !== "customer") {
      await sb().auth.signOut();
      throw new Error(role === "technician" || role === "dealer"
        ? `This is a ${ROLE_NAME[role as LoginRole].toLowerCase()} account. Choose ${ROLE_NAME[role as LoginRole]} under "Log in as".`
        : "This is a staff account. Admins log in at /admin.");
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
        if (res.status === 409) { setTaken(true); setErr(out.error ?? "An account with this email already exists."); setBusy(false); return; }
        if (!res.ok) throw new Error(out.error ?? "Couldn't create your account");
      }
      await login();
    } catch (e2) {
      setErr(friendly(e2));
    }
    setBusy(false);
  };

  return (
    <div className={`${styles.page} no-scroll`}>
      <header className={styles.hero}>
        <Image className={styles.heroImage} src="/zavtoo-customer-login-reference.png" alt="Zavtoo Pani Filter Pvt Ltd. Pure water. Peace of mind." width={941} height={1672} sizes="(max-width: 430px) 100vw, 430px" preload />
      </header>
      <form onSubmit={submit} className={styles.form}>
        <div className={styles.back}>
          {mode === "login" ? roleSwitch : <button type="button" onClick={() => { setMode("login"); setErr(null); }}>← Back</button>}
        </div>
        <div className={styles.badge}><AuthIcon kind="home" /> CUSTOMER {signup ? "SIGN UP" : forgot ? "ACCOUNT" : "LOGIN"}</div>
        <h1>{signup ? "Create your account" : forgot ? "Reset your password" : "Welcome back"}</h1>
        <p className={styles.intro}>
          {signup ? "Buy purifiers, book service and track your technician live."
            : forgot ? (sentTo ? `If ${sentTo} has a Zavtoo account, we've emailed it a link to choose a new password. Check your inbox and spam folder.` : "Enter your account email and we'll send you a link to choose a new password.")
            : "Log in to see your orders and service visits."}
        </p>
        <div className={styles.fields}>
          {signup && <div className={styles.field}>
            <label htmlFor="a-name">Full name</label>
            <input id="a-name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} />
          </div>}
          <div className={styles.field}>
            <label htmlFor="a-email">Email address</label>
            <div className={styles.inputWrap}>
              <AuthIcon kind="email" />
              <input id="a-email" ref={emailRef} type="email" autoComplete="email" placeholder="Enter your email" value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(null); setTaken(false); setSuggestion(null); }}
                onBlur={() => { if (signup && email.trim()) checkEmail(email); }} />
            </div>
            {signup && suggestion && <p className={styles.hint}>Did you mean <button type="button" onClick={() => applySuggestion(suggestion)}>{suggestion}</button>?</p>}
          </div>
          {signup && <div className={styles.field}>
            <label htmlFor="a-phone">Mobile number <span>(for your technician)</span></label>
            <div className={styles.phone}><span>+91</span><input id="a-phone" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErr(null); }} /></div>
          </div>}
          {!forgot && <div className={styles.field}>
            <label htmlFor="a-pass">Password</label>
            <div className={styles.inputWrap}>
              <AuthIcon kind="lock" />
              <input id="a-pass" type={showPw ? "text" : "password"} placeholder="Enter your password" autoComplete={signup ? "new-password" : "current-password"} value={password}
                onChange={(e) => { setPassword(e.target.value); setErr(null); }} />
              <button type="button" className={styles.eye} aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw} onClick={() => setShowPw((v) => !v)}><AuthIcon kind={showPw ? "eyeOff" : "eye"} /></button>
            </div>
          </div>}
          {mode === "login" && <button type="button" className={styles.forgot} onClick={() => { setMode("forgot"); setErr(null); setSentTo(null); }}>Forgot password?</button>}
          {signup && <div className={styles.field}>
            <label htmlFor="a-ref">Referral code <span>(optional)</span></label>
            <input id="a-ref" value={referral} placeholder="CUS-100101" onChange={(e) => { setReferral(e.target.value.toUpperCase()); setErr(null); }} />
          </div>}
          {err && <p role="alert" className={styles.error}>{err}</p>}
          {signup && taken && <ResetOffer onReset={() => { setMode("forgot"); setErr(null); setTaken(false); setSentTo(null); }} onLogin={() => { setMode("login"); setErr(null); setTaken(false); }} />}
        </div>
        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? (signup ? "Creating account…" : forgot ? "Sending…" : "Logging in…")
            : signup ? "Create Account" : forgot ? (sentTo ? "Send again" : "Send reset link") : "Log In"}
          {!busy && <AuthIcon kind="arrow" />}
        </button>
        <p className={styles.switchMode}>
          {signup ? "Already have an account? " : forgot ? "Remembered it? " : "New to Zavtoo? "}
          <button type="button" onClick={() => { setMode(signup || forgot ? "login" : "signup"); setErr(null); }}>{signup || forgot ? "Log in" : "Create an account"}</button>
        </p>
        {forgot && <p className={styles.hint}>No email? Call our account helpline at 89-290-290-06 and we&apos;ll reset it.</p>}
        <p className={styles.secure}><AuthIcon kind="lock" /><span>Your account, safely connected.</span></p>
        <p className={styles.help}>Need help? <a href={COMPANY.phoneHref}>Talk to us</a></p>
      </form>
      <footer className={styles.footer}><AuthFooter /></footer>
      {emailPopup && <EmailPopup reason={emailPopup.reason} suggestion={emailPopup.suggestion} onUse={applySuggestion}
        onClose={() => { setEmailPopup(null); emailRef.current?.focus(); }} />}
    </div>
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

/** Shown under a sign-up error when the email already has an account. */
export function ResetOffer({ onReset, onLogin }: { onReset: () => void; onLogin: () => void }) {
  const btn: React.CSSProperties = { background: "none", border: "none", padding: 0, color: "var(--blue)", fontSize: 13, fontWeight: 700, cursor: "pointer" };
  return (
    <p style={{ margin: "8px 2px 0", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
      Forgot your password? <button type="button" onClick={onReset} style={btn}>Reset it by email</button> or <button type="button" onClick={onLogin} style={btn}>log in</button>.
    </p>
  );
}

/** Password box with a show/hide eye, for the plain sign-up forms. */
export function PasswordInput({ id, value, onChange, autoComplete, placeholder, style }: {
  id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string; placeholder?: string; style: React.CSSProperties;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={onChange} placeholder={placeholder} style={{ ...style, paddingRight: 48 }} />
      <button type="button" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow((v) => !v)} style={{
        position: "absolute", top: 0, right: 4, height: "100%", width: 42, display: "grid", placeItems: "center",
        background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer",
      }}><span style={{ width: 20, height: 20, display: "block" }}><AuthIcon kind={show ? "eyeOff" : "eye"} /></span></button>
    </div>
  );
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
