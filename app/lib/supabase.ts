"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

/* One Supabase client per app. Each keeps its own login in localStorage, so a
 * customer, a technician, a dealer and an admin can be signed in on the same browser. */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(URL && ANON);

export type AppKind = "customer" | "technician" | "dealer" | "admin" | "store";
export type Role = "customer" | "technician" | "dealer" | "admin" | "super_admin";

const clients: Partial<Record<AppKind, SupabaseClient>> = {};

/* A request that never answers (common after a phone sleeps or a laptop lid
 * closes) used to hang forever — and a hung login-token refresh holds a lock
 * every other query waits on, so nothing updated until the page was reloaded.
 * Every request now gives up after a while: 20s for data, 2 min for uploads. */
const timedFetch: typeof fetch = (input, init) => {
  const url = typeof input === "string" ? input : "url" in input ? input.url : String(input);
  const timeout = AbortSignal.timeout(url.includes("/storage/v1/") ? 120000 : 20000);
  const signal = init?.signal && "any" in AbortSignal ? AbortSignal.any([init.signal, timeout]) : init?.signal ?? timeout;
  return fetch(input, { ...init, signal });
};

export function supabaseFor(app: AppKind): SupabaseClient {
  // The storefront browses as the customer app, so a shopper logged in there is logged in here.
  const key = app === "store" ? "customer" : app;
  return (clients[key] ??= createClient(URL, ANON, {
    auth: { storageKey: `zavtoo-${key}-auth`, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: timedFetch },
  }));
}

export const roleOf = (s: Session | null): Role | null =>
  s ? ((s.user.app_metadata?.role as Role | undefined) ?? "customer") : null;

/** Current session for an app; `undefined` while it's still being read from storage. */
export function useSession(app: AppKind) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const sb = supabaseFor(app);
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [app]);
  return session;
}

/** Turns Supabase/Postgres errors into something a person can read. */
export function friendly(err: unknown): string {
  const msg = typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err ?? "");
  if (/Invalid login credentials/i.test(msg)) return "Wrong email or password.";
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "Can't reach the server. Check your internet connection.";
  if (/JWT|token is expired/i.test(msg)) return "Your session expired. Please log in again.";
  if (/rate limit|only request this after/i.test(msg)) return "Too many reset emails. Please wait a few minutes and try again.";
  if (/should be different from the old password/i.test(msg)) return "Choose a password you haven't used before.";
  if (/duplicate key|already exists|already been registered/i.test(msg)) return "That already exists.";
  if (/row-level security|permission denied/i.test(msg)) return "You don't have permission to do that.";
  return msg.replace(/^.*?ERROR:\s*/, "") || "Something went wrong. Please try again.";
}

/** Emails a link to /reset-password where the person picks a new password.
 * Supabase doesn't say whether the email has an account, so neither do we. */
export async function sendPasswordReset(app: "customer" | "technician" | "dealer" | "admin", email: string) {
  const { error } = await supabaseFor(app).auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/reset-password?app=${app}`,
  });
  if (error) throw error;
}

type Watch = { table: string; filter?: string };

/**
 * Loads data and keeps it fresh: re-runs `load` whenever any watched table
 * changes in the database (Supabase Realtime, respecting row-level security),
 * and polls every few seconds as a safety net — every 5s for the admin panel
 * so ops never need to refresh the page.
 */
export function useLive<T>(app: AppKind, key: string | null, load: (sb: SupabaseClient) => Promise<T>, watch: Watch[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });
  const [tick, setTick] = useState(0);
  const watchKey = JSON.stringify(watch);

  useEffect(() => {
    if (!key) { setData(undefined); return; }
    const sb = supabaseFor(app);
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One load at a time; a change that lands mid-load queues exactly one more.
    // A load stuck for over 10s (a hung request) no longer blocks updates:
    // a fresh one starts, and only the newest load's result is used.
    let seq = 0, latest = 0, busySince = 0, again = false;
    const run = () => {
      if (busySince && Date.now() - busySince < 10000) { again = true; return; }
      const id = ++seq;
      busySince = Date.now();
      loadRef.current(sb)
        .then((d) => { if (alive && id > latest) { latest = id; setData(d); setError(null); } })
        .catch((e) => { if (alive && id > latest) setError(friendly(e)); })
        .finally(() => {
          if (id !== seq) return;
          busySince = 0;
          if (again && alive) { again = false; run(); }
        });
    };
    run();
    // Coalesce bursts of changes (e.g. a trigger touching several rows) into one reload.
    const later = () => { clearTimeout(timer); timer = setTimeout(run, 250); };
    const channel = sb.channel(`live:${app}:${key}:${Math.random().toString(36).slice(2, 8)}`);
    (JSON.parse(watchKey) as Watch[]).forEach((w) =>
      channel.on("postgres_changes", { event: "*", schema: "public", table: w.table, ...(w.filter ? { filter: w.filter } : {}) }, later));
    channel.subscribe();
    // Phones drop the realtime socket when the app is backgrounded or the screen
    // sleeps, and missed changes never replay. Reload when the app comes back,
    // and poll slowly while visible as a safety net.
    const onVisible = () => { if (document.visibilityState === "visible") later(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", later);
    // Staff and partner screens poll every 5s; customers every 10s.
    const poll = setInterval(onVisible, app === "customer" || app === "store" ? 10000 : 5000);
    return () => {
      alive = false; clearTimeout(timer); clearInterval(poll); sb.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", later);
    };
  }, [app, key, watchKey, tick]);

  return { data, error, loading: data === undefined && !error, reload: () => setTick((t) => t + 1) };
}

/** Throws the Supabase error so callers can show `friendly(err)`. */
export async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}
