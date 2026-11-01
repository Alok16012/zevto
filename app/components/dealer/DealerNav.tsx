"use client";

import { BagIcon, BoxIcon, CartIcon, StoreIcon, WrenchIcon } from "../icons";

export type DealerTab = "home" | "listings" | "orders" | "jobs" | "shop" | "profile";

const ProfileGlyph = ({ s = 22, c = "currentColor" }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" />
  </svg>
);

const tabs: { id: DealerTab; label: string; Icon: (p: { s?: number; c?: string; w?: number }) => React.ReactElement }[] = [
  { id: "home", label: "Home", Icon: StoreIcon },
  { id: "listings", label: "Listings", Icon: BoxIcon },
  { id: "orders", label: "Orders", Icon: BagIcon },
  { id: "jobs", label: "Jobs", Icon: WrenchIcon },
  { id: "shop", label: "Shop", Icon: CartIcon },
  { id: "profile", label: "Profile", Icon: ProfileGlyph },
];

/** Same floating pill as the customer app, with a badge for work waiting on the dealer. */
export default function DealerNav({ active, onChange, badges }: {
  active: DealerTab; onChange: (t: DealerTab) => void; badges: Partial<Record<DealerTab, number>>;
}) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 14px calc(10px + env(safe-area-inset-bottom))", pointerEvents: "none", zIndex: 50 }}>
      <nav className="app-bottom-nav" aria-label="Main navigation" style={{
        display: "flex", alignItems: "stretch", background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderRadius: 999, padding: 4, boxShadow: "0 8px 24px rgba(15,23,41,0.14)", pointerEvents: "auto",
      }}>
        {tabs.map(({ id, label, Icon }) => {
          const on = active === id;
          const color = on ? "white" : "var(--ink-soft)";
          const n = badges[id] ?? 0;
          return (
            <button key={id} aria-label={label} aria-current={on ? "page" : undefined} onClick={() => onChange(id)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              background: on ? "var(--blue-tint)" : "transparent", border: "none", borderRadius: 999, cursor: "pointer",
              padding: "6px 0 5px", transition: "background 0.2s", position: "relative",
            }}>
              <Icon s={21} c={color} w={on ? 2.1 : 1.8} />
              <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 500, color }}>{label}</span>
              {n > 0 && (
                <span style={{
                  position: "absolute", top: 3, left: "calc(50% + 6px)", minWidth: 16, height: 16, padding: "0 4px",
                  borderRadius: 10, background: "var(--red)", border: "1.5px solid white", color: "white",
                  fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                }}>{n}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
