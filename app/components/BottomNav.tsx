"use client";

export type Tab = "home" | "orders" | "service" | "chat" | "profile";

/* Solid glyphs — at 21px a filled shape stays legible where a stroke icon muddies. */
const HomeIcon = ({ c }: { c: string }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={c}>
    <path d="M12 2.5C12 2.5 4.5 11 4.5 15.5a7.5 7.5 0 0 0 15 0C19.5 11 12 2.5 12 2.5z" />
    <path d="M9.5 15.8a2.6 2.6 0 0 0 2.5 2.4" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

const OrdersIcon = ({ c }: { c: string }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={c}>
    <path d="M5.5 7h13l-1 13.2a1.6 1.6 0 0 1-1.6 1.3H8.1a1.6 1.6 0 0 1-1.6-1.3z" />
    <path d="M9 9V6.5a3 3 0 0 1 6 0V9" stroke={c} strokeWidth="1.9" fill="none" strokeLinecap="round" />
    <path d="M9.3 13.5l1.9 1.9 3.6-3.6" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ServiceIcon = ({ c }: { c: string }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={c}>
    <path d="M14.7 3.3a5 5 0 0 0-5.9 6.6L3.4 15.3a2.3 2.3 0 0 0 3.3 3.3l5.4-5.4a5 5 0 0 0 6.6-5.9l-3 3-2.6-.7-.7-2.6z" />
    <circle cx="18" cy="18" r="3.6" />
    <path d="M18 16.3v1.8l1.1.7" stroke="white" strokeWidth="1.3" strokeLinecap="round" fill="none" />
  </svg>
);

const ChatIcon = ({ c }: { c: string }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={c}>
    <path d="M12 3.5c5 0 9 3.4 9 7.8s-4 7.8-9 7.8c-1 0-2-.1-2.9-.4L4.5 20.5l1.2-3.9C4 15.2 3 13.3 3 11.3 3 6.9 7 3.5 12 3.5z" />
    <circle cx="8.3" cy="11.3" r="1.2" fill="white" />
    <circle cx="12" cy="11.3" r="1.2" fill="white" />
    <circle cx="15.7" cy="11.3" r="1.2" fill="white" />
  </svg>
);

const ProfileIcon = ({ c }: { c: string }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={c}>
    <circle cx="12" cy="7.8" r="4.3" />
    <path d="M3.8 20.2a8.2 8.2 0 0 1 16.4 0 1 1 0 0 1-1 1H4.8a1 1 0 0 1-1-1z" />
  </svg>
);

const tabs: { id: Tab; label: string; Icon: ({ c }: { c: string }) => React.ReactElement }[] = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "orders", label: "Orders", Icon: OrdersIcon },
  { id: "service", label: "Service", Icon: ServiceIcon },
  { id: "chat", label: "Chat", Icon: ChatIcon },
  { id: "profile", label: "Profile", Icon: ProfileIcon },
];

export default function BottomNav({ active, onChange, unreadChat = 0 }: { active: Tab; onChange: (t: Tab) => void; unreadChat?: number }) {
  return (
    // Floats over the content with no backdrop of its own — only the pill is solid.
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      padding: "0 14px calc(10px + env(safe-area-inset-bottom))",
      pointerEvents: "none", zIndex: 50,
    }}>
      <nav style={{
        display: "flex", alignItems: "stretch",
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderRadius: 999, padding: 4,
        boxShadow: "0 8px 24px rgba(15,23,41,0.14)",
        pointerEvents: "auto",
      }}>
        {tabs.map((tab) => {
          const on = active === tab.id;
          const color = on ? "var(--blue)" : "var(--ink)";
          return (
            <button key={tab.id} aria-label={tab.label} aria-current={on ? "page" : undefined}
              onClick={() => onChange(tab.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                background: on ? "var(--blue-tint)" : "transparent",
                border: "none", borderRadius: 999, cursor: "pointer", padding: "6px 0 5px",
                transition: "background 0.2s", position: "relative",
              }}>
              <tab.Icon c={color} />
              <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 500, color }}>{tab.label}</span>
              {tab.id === "chat" && unreadChat > 0 && !on && (
                <span style={{
                  position: "absolute", top: 4, left: "calc(50% + 6px)", minWidth: 16, height: 16, padding: "0 4px",
                  borderRadius: 10, background: "var(--red)", border: "1.5px solid white",
                  color: "white", fontSize: 9.5, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{unreadChat}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
