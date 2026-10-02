"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

/* One Supabase client per app. Each keeps its own login in localStorage, so a
 * customer, a technician and an admin can be signed in on the same browser. */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(URL && ANON);

export type AppKind = "customer" | "technician" | "admin" | "store";
export type Role = "customer" | "technician" | "admin" | "super_admin";

const clients: Partial<Record<AppKind, SupabaseClient>> = {};

export function supabaseFor(app: AppKind): SupabaseClient {
  // The storefront browses as the customer app, so a shopper logged in there is logged in here.
  const key = app === "store" ? "customer" : app;
  return (clients[key] ??= createClient(URL, ANON, {
    auth: { storageKey: `zavtoo-${key}-auth`, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
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
  if (/duplicate key|already exists|already been registered/i.test(msg)) return "That already exists.";
  if (/row-level security|permission denied/i.test(msg)) return "You don't have permission to do that.";
  return msg.replace(/^.*?ERROR:\s*/, "") || "Something went wrong. Please try again.";
}

type Watch = { table: string; filter?: string };

/**
 * Loads data and keeps it fresh: re-runs `load` whenever any watched table
 * changes in the database (Supabase Realtime, respecting row-level security).
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
    const run = () => {
      loadRef.current(sb)
        .then((d) => { if (alive) { setData(d); setError(null); } })
        .catch((e) => { if (alive) setError(friendly(e)); });
    };
    run();
    // Coalesce bursts of changes (e.g. a trigger touching several rows) into one reload.
    const later = () => { clearTimeout(timer); timer = setTimeout(run, 250); };
    const channel = sb.channel(`live:${app}:${key}:${Math.random().toString(36).slice(2, 8)}`);
    (JSON.parse(watchKey) as Watch[]).forEach((w) =>
      channel.on("postgres_changes", { event: "*", schema: "public", table: w.table, ...(w.filter ? { filter: w.filter } : {}) }, later));
    channel.subscribe();
    return () => { alive = false; clearTimeout(timer); sb.removeChannel(channel); };
  }, [app, key, watchKey, tick]);

  return { data, error, loading: data === undefined && !error, reload: () => setTick((t) => t + 1) };
}

/** Throws the Supabase error so callers can show `friendly(err)`. */
export async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}
