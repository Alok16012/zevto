"use client";

import Link from "next/link";
import { COMPANY } from "../storefront/content";
import Image from "next/image";
import styles from "./RoleSwitch.module.css";

/* The "Log in as" screen, its back link and the footer links shared by the customer, technician and dealer login screens. */

export type LoginRole = "customer" | "technician" | "dealer";

const ROLES: { id: LoginRole; label: string; detail: string }[] = [
  { id: "customer", label: "Customer", detail: "Shop purifiers, book service & track visits" },
  { id: "technician", label: "Technician", detail: "Manage jobs, inventory & earnings" },
  { id: "dealer", label: "Dealer", detail: "Manage your store, orders & team" },
];

function RoleIcon({ role }: { role: LoginRole }) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {role === "customer" ? <><path d="m2 11 10-10 10 10M4 9v12h5v-7h6v7h5V9" /></>
      : role === "technician" ? <><path d="M14.5 6.5 18 3a7 7 0 0 0-9 8.8l-7 7a2.8 2.8 0 0 0 4 4l7-7A7 7 0 0 0 21.8 7l-3.5 3.5-3.8-4Z" /></>
      : <><path d="M4 10v11h16V10M3 6l2-3h14l2 3v4a3 3 0 0 1-4 0 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-4 0ZM3 6h18M9 21v-7h6v7" /></>}
  </svg>;
}

function Arrow() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>;
}

export const ROLE_NAME: Record<LoginRole, string> = { customer: "Customer", technician: "Technician", dealer: "Dealer" };

/** Shown above a role's login form, in place of the old tab bar: goes back to the "Log in as" screen. */
export function RoleBack({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} style={{
      alignSelf: "flex-start", marginTop: 18, background: "none", border: "none", padding: 0, cursor: "pointer",
      color: "var(--blue)", fontSize: 13.5, fontWeight: 600,
    }}>← Back</button>
  );
}

/** Pick a role to continue into its existing login flow. */
export function RoleChooser({ onPick }: { onPick: (r: LoginRole) => void }) {
  return (
    <main className={`zavtoo-app ${styles.page}`}>
      <header className={styles.hero}>
        <Image className={styles.heroImage} src="/zavtoo-login-reference.png" alt="Zavtoo Pani Filter Pvt Ltd. The Zavtoo App. Pure water. Simpler living." width={941} height={1672} sizes="(max-width: 430px) 100vw, 430px" preload />
      </header>
      <section className={styles.chooser} aria-labelledby="role-title">
          <div className={styles.welcome}><h1 id="role-title">Welcome to Zavtoo</h1><p>Choose how you use Zavtoo.</p></div>
          <div className={styles.roles}>
            {ROLES.map((r) => <button key={r.id} type="button" onClick={() => onPick(r.id)} className={`${styles.role} ${styles[r.id]}`}>
              <span className={styles.roleIcon}><RoleIcon role={r.id} /></span>
              <span className={styles.roleContent}><span className={styles.roleTitle}>{r.label}</span><span className={styles.roleDetail}>{r.detail}</span></span>
              <span className={styles.roleArrow}><Arrow /></span>
            </button>)}
          </div>
          <p className={styles.continueNote}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg> Secure sign-in for every role</p>
          <div className={styles.mobileHelp}>Need help? <a href={COMPANY.phoneHref}>Talk to us</a></div>
      </section>
      <footer className={styles.footer}><AuthFooter /></footer>
    </main>
  );
}

const footLink: React.CSSProperties = { color: "var(--blue)", fontSize: 12.5, textDecoration: "none" };

export function AuthFooter() {
  return (
    <nav aria-label="Legal" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 20px", marginTop: 16 }}>
      <Link href="/privacy-policy" style={footLink}>Privacy policy</Link>
      <Link href="/terms-and-condition" style={footLink}>Terms &amp; conditions</Link>
      <Link href="/delete-account" style={footLink}>Delete account</Link>
    </nav>
  );
}
