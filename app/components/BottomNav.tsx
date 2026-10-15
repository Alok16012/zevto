"use client";

export type Tab = "home" | "orders" | "service" | "chat" | "profile";

/* Outline icons echo the login page's role and field icons. */
const HomeIcon = ({ c }: { c: string }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9" /></svg>;
const OrdersIcon = ({ c }: { c: string }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1 13H6ZM9 8V6a3 3 0 0 1 6 0v2" /></svg>;
const ServiceIcon = ({ c }: { c: string }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 6.5 18 3a7 7 0 0 0-9 8.8l-7 7a2.8 2.8 0 0 0 4 4l7-7A7 7 0 0 0 21.8 7l-3.5 3.5-3.8-4Z" /></svg>;
const ChatIcon = ({ c }: { c: string }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.6L3 21l1.8-5.5A8.5 8.5 0 1 1 21 11.5Z" /><path d="M8 10h8M8 14h5" /></svg>;
const ProfileIcon = ({ c }: { c: string }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>;

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
      <nav className="app-bottom-nav" aria-label="Main navigation" style={{
        display: "flex", alignItems: "stretch",
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderRadius: 999, padding: 4,
        boxShadow: "0 8px 24px rgba(15,23,41,0.14)",
        pointerEvents: "auto",
      }}>
        {tabs.map((tab) => {
          const on = active === tab.id;
          const color = on ? "white" : "var(--ink-soft)";
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
