"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* One app for everyone: the login screens of /app, /technician and /dealer carry
 * a "Log in as" switch, and the app remembers which one was used last so the
 * Zavtoo app (which opens /app) goes straight back to it. Each part keeps its
 * own login, so switching never signs anyone out. */

export type AppRole = "customer" | "technician" | "dealer";

const KEY = "zavtoo-app";
const PATH: Record<AppRole, string> = { customer: "/app", technician: "/technician", dealer: "/dealer" };
const OPTIONS: { id: AppRole; label: string; icon: string }[] = [
  { id: "customer", label: "Customer", icon: "🏠" },
  { id: "technician", label: "Technician", icon: "🔧" },
  { id: "dealer", label: "Dealer", icon: "🏪" },
];

export function rememberApp(role: AppRole) {
  try { localStorage.setItem(KEY, role); } catch { /* storage blocked */ }
}

function rememberedApp(): AppRole | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "customer" || v === "technician" || v === "dealer" ? v : null;
  } catch { return null; }
}

/** On /app: reopen the technician or dealer side if that's where this phone logged in last. */
export function useReturnToLastApp() {
  const router = useRouter();
  useEffect(() => {
    // Website deep links (cart, booking, referral) are always for customers.
    if (window.location.search) return;
    const last = rememberedApp();
    if (last && last !== "customer") router.replace(PATH[last]);
  }, [router]);
}

export function AppSwitch({ current }: { current: AppRole }) {
  const router = useRouter();
  const go = (role: AppRole) => {
    if (role === current) return;
    rememberApp(role);
    router.replace(PATH[role]);
  };
  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>Log in as</p>
      <div role="radiogroup" aria-label="Log in as" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: "var(--surface)", boxShadow: "var(--shadow-card)" }}>
        {OPTIONS.map((o) => {
          const on = o.id === current;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => go(o.id)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, border: "none", borderRadius: 11, cursor: on ? "default" : "pointer",
              padding: "9px 4px", fontSize: 13, fontWeight: on ? 700 : 500,
              background: on ? "var(--blue)" : "transparent", color: on ? "white" : "var(--ink-soft)",
            }}>
              <span aria-hidden style={{ fontSize: 14 }}>{o.icon}</span>{o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
