"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark, Logo } from "../components/Brand";
import { PrimaryButton, field, label } from "../components/ui";
import { friendly, roleOf } from "../lib/supabase";

/* Landing page for the "reset your password" email. Supabase redirects here with
 * the recovery session in the URL hash. We use a throwaway client that keeps nothing
 * in localStorage, so the reset never signs anyone into an app — afterwards the
 * person logs in normally with the new password. */

const LOGIN: Record<string, { href: string; name: string }> = {
  customer: { href: "/app", name: "Log in" },
  technician: { href: "/technician", name: "Go to technician login" },
  dealer: { href: "/dealer", name: "Go to dealer login" },
  admin: { href: "/admin", name: "Go to admin login" },
  super_admin: { href: "/admin", name: "Go to admin login" },
};

type Stage = "checking" | "ready" | "invalid" | "done";

export default function ResetPassword() {
  const [stage, setStage] = useState<Stage>("checking");
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [loginKey, setLoginKey] = useState("customer");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Read once: the effect below wipes the hash, and dev mode runs effects twice.
  const [url] = useState(() => typeof window === "undefined" ? null : { hash: window.location.hash, search: window.location.search });

  useEffect(() => {
    if (!url) return;
    const hash = new URLSearchParams(url.hash.slice(1));
    const app = new URLSearchParams(url.search).get("app");
    if (app && LOGIN[app]) setLoginKey(app);
    // Keep the one-time tokens out of the address bar and browser history.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (hash.get("error") || !access_token || !refresh_token || hash.get("type") !== "recovery") { setStage("invalid"); return; }

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    sb.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
      if (error || !data.session) { setStage("invalid"); return; }
      const role = roleOf(data.session);
      if (role) setLoginKey(role);
      setClient(sb);
      setStage("ready");
    });
  }, [url]);

  const problem = password.length < 8 ? "Password must be at least 8 characters"
    : password !== confirm ? "Passwords don't match"
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (problem) { setErr(problem); return; }
    if (!client) return;
    setBusy(true); setErr(null);
    const { error } = await client.auth.updateUser({ password });
    if (error) { setErr(friendly(error)); setBusy(false); return; }
    // Whoever knew the old password is logged out everywhere.
    await client.auth.signOut({ scope: "global" });
    setBusy(false);
    setStage("done");
  };

  const login = LOGIN[loginKey];
  const forgotHref = login.href;

  return (
    <main className="zavtoo-app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--app-bg)" }}>
      <form onSubmit={submit} className="fade-up" style={{ width: "100%", maxWidth: 400, background: "var(--surface)", borderRadius: 20, padding: 26, boxShadow: "var(--shadow-card)" }}>
        <Logo height={44} />

        {stage === "checking" && <p style={{ margin: "22px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>Checking your reset link…</p>}

        {stage === "invalid" && (
          <>
            <h1 style={{ margin: "20px 0 6px", fontSize: 22, fontWeight: 800 }}>This link has expired</h1>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
              Reset links work once and only for a short time. Request a new one from the login screen and open the newest email.
            </p>
            <Link href={forgotHref} style={{ display: "block", textAlign: "center", textDecoration: "none", borderRadius: 16, padding: "15px 18px", fontSize: 15, fontWeight: 700, color: "white", background: "linear-gradient(135deg,var(--blue),var(--blue-dark))" }}>
              Back to login
            </Link>
          </>
        )}

        {stage === "ready" && (
          <>
            <h1 style={{ margin: "20px 0 4px", fontSize: 22, fontWeight: 800 }}>Choose a new password</h1>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ink-soft)" }}>At least 8 characters.</p>
            <label style={label} htmlFor="r-pass">New password</label>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <input id="r-pass" type={showPw ? "text" : "password"} autoComplete="new-password" autoFocus value={password}
                onChange={(e) => { setPassword(e.target.value); setErr(null); }} style={{ ...field, paddingRight: 64 }} />
              <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{showPw ? "Hide" : "Show"}</button>
            </div>
            <label style={label} htmlFor="r-confirm">Confirm new password</label>
            <input id="r-confirm" type={showPw ? "text" : "password"} autoComplete="new-password" value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setErr(null); }} style={field} />
            {err && <p role="alert" style={{ margin: "12px 2px 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
            <div style={{ marginTop: 20 }}>
              <PrimaryButton disabled={busy}>{busy ? "Saving…" : "Save new password"}</PrimaryButton>
            </div>
          </>
        )}

        {stage === "done" && (
          <>
            <h1 style={{ margin: "20px 0 6px", fontSize: 22, fontWeight: 800 }}>Password updated</h1>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
              You&apos;ve been signed out on all devices. Log in again with your new password.
            </p>
            <Link href={login.href} style={{ display: "block", textAlign: "center", textDecoration: "none", borderRadius: 16, padding: "15px 18px", fontSize: 15, fontWeight: 700, color: "white", background: "linear-gradient(135deg,var(--blue),var(--blue-dark))" }}>
              {login.name}
            </Link>
          </>
        )}
      </form>
    </main>
  );
}
