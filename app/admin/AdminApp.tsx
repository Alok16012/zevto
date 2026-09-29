"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandMark, Wordmark } from "../components/Brand";
import {
  ADMIN_COUPONS, ADMIN_DEMO, ADMIN_PRODUCTS, ADMIN_REVIEWS, ADMIN_TECHS, BROADCASTS, CUSTOMERS, JOBS, ORDERS, TODAY,
  type AdminCoupon, type AdminCustomer, type AdminJob, type AdminOrder, type AdminProduct, type AdminReview, type AdminTech, type Broadcast,
} from "../lib/adminData";
import { Btn, fieldLabel, input } from "./kit";
import { Dashboard } from "./Dashboard";
import { OrdersSection, ServicesSection } from "./Operations";
import { CustomersSection, TechniciansSection } from "./People";
import { BroadcastSection, CouponsSection, ProductsSection, ReviewsSection } from "./Catalog";

export type Section = "dashboard" | "orders" | "services" | "customers" | "technicians" | "products" | "coupons" | "reviews" | "broadcast";

const NAV: { group: string; items: { id: Section; label: string; icon: string }[] }[] = [
  { group: "Overview", items: [{ id: "dashboard", label: "Dashboard", icon: "▦" }] },
  { group: "Operations", items: [{ id: "orders", label: "Orders", icon: "🛒" }, { id: "services", label: "Service Jobs", icon: "🔧" }] },
  { group: "People", items: [{ id: "customers", label: "Customers", icon: "👥" }, { id: "technicians", label: "Technicians", icon: "🧑‍🔧" }] },
  { group: "Catalogue & growth", items: [
    { id: "products", label: "Products & Stock", icon: "📦" }, { id: "coupons", label: "Offers & Coupons", icon: "🏷️" },
    { id: "reviews", label: "Reviews", icon: "⭐" }, { id: "broadcast", label: "Notifications", icon: "📣" },
  ] },
];

const TITLES: Record<Section, string> = {
  dashboard: "Dashboard", orders: "Orders", services: "Service Jobs & Dispatch", customers: "Customers", technicians: "Technicians",
  products: "Products & Stock", coupons: "Offers & Coupons", reviews: "Reviews", broadcast: "Broadcast Notifications",
};

const SESSION_KEY = "zavtoo:admin";
const readSession = () => { try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; } };
const writeSession = (v: boolean) => { try { if (v) sessionStorage.setItem(SESSION_KEY, "1"); else sessionStorage.removeItem(SESSION_KEY); } catch { /* storage blocked */ } };

/** Swaps one row by key — every section edits its list the same way. */
const patchBy = <T,>(key: (x: T) => string) => (id: string, patch: Partial<T>) => (all: T[]) => all.map((x) => (key(x) === id ? { ...x, ...patch } : x));

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [section, setSection] = useState<Section>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>(ORDERS);
  const [jobs, setJobs] = useState<AdminJob[]>(JOBS);
  const [customers, setCustomers] = useState<AdminCustomer[]>(CUSTOMERS);
  const [techs, setTechs] = useState<AdminTech[]>(ADMIN_TECHS);
  const [products, setProducts] = useState<AdminProduct[]>(ADMIN_PRODUCTS);
  const [coupons, setCoupons] = useState<AdminCoupon[]>(ADMIN_COUPONS);
  const [reviews, setReviews] = useState<AdminReview[]>(ADMIN_REVIEWS);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(BROADCASTS);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { setAuthed(readSession()); }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [section]);

  const notify = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const go = (s: Section) => { setSection(s); setMenuOpen(false); };

  // Sidebar counters for work waiting on someone.
  const badges: Partial<Record<Section, number>> = {
    orders: orders.filter((o) => o.status === "Placed").length,
    services: jobs.filter((j) => j.status === "Unassigned" || j.status === "Rescheduled").length,
    technicians: techs.filter((t) => t.kyc === "Pending").length,
    reviews: reviews.filter((r) => r.status === "Flagged").length,
    products: products.filter((p) => p.active && p.stock <= 5).length,
  };

  if (authed === null) return null;
  if (!authed) return <AdminLogin onDone={() => { writeSession(true); setAuthed(true); }} />;

  const sidebar = (
    <aside className={`admin-side no-scroll${menuOpen ? " open" : ""}`} style={{ background: "var(--blue-dark)", color: "white", padding: "18px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 18px" }}>
        <div style={{ background: "white", borderRadius: 10, padding: 4, display: "flex" }}><BrandMark size={28} /></div>
        <div><p style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: "0.03em" }}>ZAVTOO</p><p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.65)", fontWeight: 600, letterSpacing: "0.08em" }}>ADMIN CONSOLE</p></div>
      </div>
      {NAV.map((g) => (
        <div key={g.group} style={{ marginBottom: 14 }}>
          <p style={{ margin: "0 10px 6px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{g.group}</p>
          {g.items.map((it) => {
            const on = section === it.id;
            const n = badges[it.id];
            return (
              <button key={it.id} onClick={() => go(it.id)} aria-current={on ? "page" : undefined} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer",
                background: on ? "rgba(255,255,255,0.14)" : "transparent", color: on ? "white" : "rgba(255,255,255,0.78)", fontSize: 13.5, fontWeight: on ? 700 : 500, textAlign: "left",
              }}>
                <span style={{ width: 20, textAlign: "center" }}>{it.icon}</span>
                <span style={{ flex: 1 }}>{it.label}</span>
                {n ? <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: "var(--gold)", color: "var(--blue-dark)", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span> : null}
              </button>
            );
          })}
        </div>
      ))}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12, marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
        <Link href="/" style={sideLink}>↗ Customer app</Link>
        <Link href="/technician" style={sideLink}>↗ Technician app</Link>
      </div>
    </aside>
  );

  return (
    <div style={{ background: "var(--app-bg)", minHeight: "100vh" }}>
      <div className="admin-shell">
        {sidebar}
        {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(15,23,41,0.4)" }} />}

        <div style={{ minWidth: 0 }}>
          {/* Phone top bar */}
          <div className="admin-topbar" style={{ alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--blue-dark)", color: "white", position: "sticky", top: 0, zIndex: 100 }}>
            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>☰</button>
            <span style={{ fontWeight: 800, letterSpacing: "0.03em" }}>ZAVTOO ADMIN</span>
          </div>

          <main className="admin-main">
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>Tuesday, {TODAY}</p>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{TITLES[section]}</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Ops Admin</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>{ADMIN_DEMO.email}</p>
                </div>
                <Btn kind="ghost" small onClick={() => { writeSession(false); setAuthed(false); }}>Log out</Btn>
              </div>
            </header>

            {section === "dashboard" && <Dashboard orders={orders} jobs={jobs} customers={customers} techs={techs} products={products} reviews={reviews} go={go} />}
            {section === "orders" && <OrdersSection orders={orders} customers={customers} notify={notify} onUpdate={(id, p) => setOrders(patchBy<AdminOrder>((o) => o.id)(id, p))} />}
            {section === "services" && <ServicesSection jobs={jobs} customers={customers} techs={techs} notify={notify} onUpdate={(id, p) => setJobs(patchBy<AdminJob>((j) => j.id)(id, p))} />}
            {section === "customers" && <CustomersSection customers={customers} orders={orders} jobs={jobs} notify={notify} onUpdate={(id, p) => setCustomers(patchBy<AdminCustomer>((c) => c.id)(id, p))} />}
            {section === "technicians" && <TechniciansSection techs={techs} jobs={jobs} notify={notify} onUpdate={(id, p) => setTechs(patchBy<AdminTech>((t) => t.id)(id, p))} />}
            {section === "products" && <ProductsSection products={products} notify={notify} onUpdate={(id, p) => setProducts(patchBy<AdminProduct>((x) => x.id)(id, p))} />}
            {section === "coupons" && (
              <CouponsSection coupons={coupons} notify={notify} onUpdate={(code, p) => setCoupons(patchBy<AdminCoupon>((c) => c.code)(code, p))}
                onCreate={(c) => setCoupons((all) => [c, ...all])} />
            )}
            {section === "reviews" && (
              <ReviewsSection reviews={reviews} notify={notify} onUpdate={(id, p) => setReviews(patchBy<AdminReview>((r) => r.id)(id, p))}
                onDelete={(id) => setReviews((all) => all.filter((r) => r.id !== id))} />
            )}
            {section === "broadcast" && (
              <BroadcastSection history={broadcasts} onSend={(b) => { setBroadcasts((all) => [b, ...all]); notify(`Sent to ${b.reach.toLocaleString("en-IN")} people`); }} />
            )}

            <p style={{ margin: "28px 0 0", textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)" }}>Demo data · changes reset on refresh</p>
          </main>
        </div>
      </div>

      {toast && (
        <div className="fade-up" role="status" style={{
          position: "fixed", right: 20, bottom: 20, left: "auto", zIndex: 300, maxWidth: "calc(100vw - 40px)",
          background: "var(--ink)", color: "white", borderRadius: 12, padding: "12px 16px", fontSize: 13.5, fontWeight: 500, boxShadow: "var(--shadow-xl)",
        }}>✓ {toast}</div>
      )}
    </div>
  );
}

const sideLink: React.CSSProperties = { color: "rgba(255,255,255,0.7)", fontSize: 12.5, fontWeight: 600, textDecoration: "none", padding: "6px 10px" };

/* ───────────────────────── Login ───────────────────────── */

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === ADMIN_DEMO.email && pw === ADMIN_DEMO.password) onDone();
    else setErr(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "linear-gradient(150deg,var(--blue-dark),var(--blue))" }}>
      <form onSubmit={submit} className="fade-up" style={{ width: "100%", maxWidth: 380, background: "var(--surface)", borderRadius: 20, padding: 26, boxShadow: "0 20px 50px rgba(4,36,107,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><BrandMark size={40} /><Wordmark /></div>
        <h1 style={{ margin: "20px 0 2px", fontSize: 22, fontWeight: 800 }}>Admin console</h1>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--ink-soft)" }}>Sign in to manage orders, service jobs and customers.</p>
        <label><span style={fieldLabel}>Email</span><input type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setErr(false); }} style={input} /></label>
        <label style={{ display: "block", marginTop: 12 }}><span style={fieldLabel}>Password</span><input type="password" autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(false); }} style={input} /></label>
        {err && <p role="alert" style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>Wrong email or password.</p>}
        <button type="submit" disabled={!email || !pw} className="press" style={{
          width: "100%", marginTop: 18, border: "none", borderRadius: 12, padding: 12, fontSize: 14.5, fontWeight: 700, cursor: email && pw ? "pointer" : "not-allowed",
          background: email && pw ? "var(--blue)" : "var(--line-strong)", color: email && pw ? "white" : "var(--ink-mute)",
        }}>Sign in</button>
        <p style={{ margin: "14px 0 0", padding: "10px 12px", borderRadius: 10, background: "var(--gold-tint)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Demo login: <b>{ADMIN_DEMO.email}</b> / <b>{ADMIN_DEMO.password}</b>
        </p>
      </form>
    </div>
  );
}
