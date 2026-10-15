"use client";

import { useState } from "react";
import Image from "next/image";
import AuthIcon from "./AuthIcon";
import { AuthFooter, ROLE_NAME } from "./RoleSwitch";
import { friendly, sendPasswordReset } from "../lib/supabase";
import { EMAIL_RE } from "../lib/emailCheck";
import styles from "./Auth.module.css";

type PartnerRole = "technician" | "dealer";

/** Shared mobile login presentation; each app owns its authentication and registration. */
/** `initialForgot` opens straight on "reset your password" (e.g. after sign-up found the email already registered). */
export default function RoleLoginForm({ role, email, password, onEmail, onPassword, onSubmit, onSignup, roleSwitch, busy, disabled, error, help, initialForgot = false }: {
  role: PartnerRole;
  email: string;
  password: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onSignup: () => void;
  roleSwitch?: React.ReactNode;
  busy: boolean;
  disabled?: boolean;
  error: string | null;
  help: { href: string; number: string };
  initialForgot?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [forgot, setForgot] = useState(initialForgot);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const sendReset = async (event: React.FormEvent) => {
    event.preventDefault();
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setResetErr("Enter a valid email"); return; }
    setSending(true); setResetErr(null);
    try { await sendPasswordReset(role, e); setSentTo(e); } catch (err) { setResetErr(friendly(err)); }
    setSending(false);
  };
  const leaveForgot = () => { setForgot(false); setSentTo(null); setResetErr(null); };
  const name = ROLE_NAME[role];
  const prefix = role === "technician" ? "t" : "d";

  return (
    <div className={`${styles.page} no-scroll`}>
      <header className={styles.hero}>
        <Image className={styles.heroImage} src="/zavtoo-customer-login-reference.png" alt="Zavtoo Pani Filter Pvt Ltd. Pure water. Peace of mind." width={941} height={1672} sizes="(max-width: 430px) 100vw, 430px" preload />
      </header>
      {forgot ? (
        <form onSubmit={sendReset} className={styles.form}>
          <div className={styles.back}><button type="button" onClick={leaveForgot}>← Back</button></div>
          <div className={styles.badge}><AuthIcon kind={role} /> {name.toUpperCase()} ACCOUNT</div>
          <h1>Reset your password</h1>
          <p className={styles.intro}>{sentTo
            ? `If ${sentTo} has a Zavtoo ${name.toLowerCase()} account, we've emailed it a link to choose a new password. Check your inbox and spam folder.`
            : "Enter your account email and we'll send you a link to choose a new password."}</p>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor={`${prefix}-reset-email`}>Email address</label>
              <div className={styles.inputWrap}>
                <AuthIcon kind="email" />
                <input id={`${prefix}-reset-email`} type="email" autoComplete="username" placeholder="Enter your email" value={email} onChange={(event) => { onEmail(event.target.value); setResetErr(null); }} />
              </div>
            </div>
            {resetErr && <p role="alert" className={styles.error}>{resetErr}</p>}
          </div>
          <button type="submit" className={styles.submit} disabled={sending}>{sending ? "Sending…" : sentTo ? "Send again" : "Send reset link"}</button>
          <p className={styles.switchMode}>Remembered it? <button type="button" onClick={leaveForgot}>Log in</button></p>
          <p className={styles.help}>No email? Call <a href={help.href}>{help.number}</a> and we&apos;ll reset it.</p>
        </form>
      ) : (
      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.back}>{roleSwitch}</div>
        <div className={styles.badge}><AuthIcon kind={role} /> {name.toUpperCase()} LOGIN</div>
        <h1>Welcome back</h1>
        <p className={styles.intro}>{role === "technician" ? "Log in to manage your jobs, inventory and earnings." : "Log in to manage your store, orders and team."}</p>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor={`${prefix}-email`}>Email address</label>
            <div className={styles.inputWrap}>
              <AuthIcon kind="email" />
              <input id={`${prefix}-email`} type="email" autoComplete="username" placeholder="Enter your email" value={email} onChange={(event) => onEmail(event.target.value)} />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${prefix}-pass`}>Password</label>
            <div className={styles.inputWrap}>
              <AuthIcon kind="lock" />
              <input id={`${prefix}-pass`} type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => onPassword(event.target.value)} />
              <button type="button" className={styles.eye} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}><AuthIcon kind={showPassword ? "eyeOff" : "eye"} /></button>
            </div>
          </div>
          <button type="button" className={styles.forgot} onClick={() => setForgot(true)}>Forgot password?</button>
          {error && <p role="alert" className={styles.error}>{error}</p>}
        </div>
        <button type="submit" className={styles.submit} disabled={busy || disabled}>{busy ? "Logging in…" : "Log In"}{!busy && <AuthIcon kind="arrow" />}</button>
        <p className={styles.switchMode}>
          {role === "technician" ? "New technician? " : "Own an RO shop? "}
          <button type="button" onClick={onSignup}>{role === "technician" ? "Create your partner profile" : "Register as a dealer"}</button>
        </p>
        <p className={styles.secure}><AuthIcon kind="lock" /><span>Your account, safely connected.</span></p>
        <p className={styles.help}>Need help? <a href={help.href}>Talk to us</a></p>
      </form>
      )}
      <footer className={styles.footer}><AuthFooter /></footer>
    </div>
  );
}
