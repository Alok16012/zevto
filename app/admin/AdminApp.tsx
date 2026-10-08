"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandMark, Wordmark } from "../components/Brand";
import { BagIcon, InboxIcon, BoxIcon, GridIcon, MegaphoneIcon, StarLineIcon, StoreIcon, TagIcon, TechnicianIcon, UsersIcon, WrenchIcon } from "../components/icons";
import { friendly, roleOf, supabaseFor, useLive, useSession } from "../lib/supabase";
import { useCatalog } from "../lib/catalog";
import {
  ADMIN_WATCH, loadAdminData,
  type AdminCoupon, type AdminCustomer, type AdminJob, type AdminOrder, type AdminOrderStatus, type AdminProduct, type AdminReview, type AdminTech, type Dealer,
} from "../lib/adminData";
import { Btn, fieldLabel, input } from "./kit";
import { Dashboard } from "./Dashboard";
import { OrdersSection, ServicesSection } from "./Operations";
import { CustomersSection, DealersSection, TechniciansSection, type NewDealer, type NewTechnician } from "./People";
import { BroadcastSection, CouponsSection, ProductsSection, ReviewsSection, type ProductDraft } from "./Catalog";
import { removeProductImages } from "../lib/photos";
import { SupportSection, useSupportUnread } from "./Support";
import { SparePartsSection } from "./SpareParts";
import type { DbGalleryPart } from "../lib/partsGallery";

export type Section = "dashboard" | "support" | "orders" | "services" | "customers" | "technicians" | "dealers" | "products" | "spareparts" | "coupons" | "reviews" | "broadcast";

type NavIcon = (p: { s?: number; c?: string; w?: number }) => React.ReactElement;

const NAV: { group: string; items: { id: Section; label: string; Icon: NavIcon }[] }[] = [
  { group: "Overview", items: [{ id: "dashboard", label: "Dashboard", Icon: GridIcon }] },
  { group: "Operations", items: [{ id: "orders", label: "Orders", Icon: BagIcon }, { id: "services", label: "Service Jobs", Icon: WrenchIcon }, { id: "support", label: "Support Chat", Icon: InboxIcon }] },
  { group: "People", items: [{ id: "customers", label: "Customers", Icon: UsersIcon }, { id: "technicians", label: "Technicians", Icon: TechnicianIcon }, { id: "dealers", label: "Dealers", Icon: StoreIcon }] },
  { group: "Catalogue & growth", items: [
    { id: "products", label: "Products & Stock", Icon: BoxIcon }, { id: "spareparts", label: "Technician Parts", Icon: WrenchIcon }, { id: "coupons", label: "Offers & Coupons", Icon: TagIcon },
    { id: "reviews", label: "Reviews", Icon: StarLineIcon }, { id: "broadcast", label: "Notifications", Icon: MegaphoneIcon },
  ] },
];

const TITLES: Record<Section, string> = {
  dashboard: "Dashboard", support: "Support Chat", orders: "Orders", services: "Service Jobs & Dispatch", customers: "Customers", technicians: "Technicians", dealers: "Dealers",
  products: "Products & Stock", spareparts: "Technician Spare Parts", coupons: "Offers & Coupons", reviews: "Reviews", broadcast: "Broadcast Notifications",
};

const sb = () => supabaseFor("admin");

export default function AdminApp() {
  const session = useSession("admin");
  const role = roleOf(session ?? null);
  const staff = role === "admin" || role === "super_admin";
  const uid = staff ? session!.user.id : null;
  useCatalog("admin", session === undefined ? undefined : uid);
  const live = useLive("admin", uid, loadAdminData, ADMIN_WATCH);
  const supportUnread = useSupportUnread(!!uid);
  const data = live.data;

  const [section, setSection] = useState<Section>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [section]);

  // A signed-in non-staff account (customer/technician) can't use the console.
  useEffect(() => {
    if (session && !staff) void sb().auth.signOut();
  }, [session, staff]);

  const notify = (msg: string, bad = false) => {
    setToast({ msg, bad });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), bad ? 5000 : 2600);
  };
  /** Runs a write, reports the outcome, and refreshes the data. */
  const act = async (fn: () => PromiseLike<{ error: unknown }>, ok: string) => {
    const { error } = await fn();
    if (error) { notify(friendly(error), true); return false; }
    notify(ok); live.reload(); return true;
  };

  const go = (s: Section) => { setSection(s); setMenuOpen(false); };

  /* ── Writes ── */
  const setOrderStatus = async (o: AdminOrder, status: AdminOrderStatus) => {
    await act(() => sb().from("orders").update({ status, ...(status === "Delivered" && o.payment === "COD" ? { payment_status: "Paid" } : {}) }).eq("id", o.id),
      status === "Cancelled" ? `#${o.ref} cancelled` : `#${o.ref} marked ${status.toLowerCase()} — customer notified`);
  };
  const assignJob = async (j: AdminJob, techId: string, isoDate: string) => {
    const t = data?.techs.find((x) => x.id === techId);
    await act(() => sb().from("service_requests").update({
      tech_id: techId, preferred_tech_id: null, status: "Assigned", assigned_at: new Date().toISOString(), visit_date: isoDate,
      reschedule_reason: null, trip_started_at: null,
    }).eq("id", j.id), `#${j.ref} assigned to ${t?.name ?? "technician"} — they and the customer are notified`);
  };
  const cancelJob = async (j: AdminJob) => {
    await act(() => sb().from("service_requests").update({ status: "Cancelled" }).eq("id", j.id), `#${j.ref} cancelled`);
  };
  const blockCustomer = async (c: AdminCustomer, blocked: boolean) => {
    await act(() => sb().from("profiles").update({ blocked }).eq("id", c.id), blocked ? `${c.name} blocked` : `${c.name} unblocked`);
  };
  const creditCustomer = (c: AdminCustomer, amount: number, reason: string) =>
    act(() => sb().rpc("admin_credit_wallet", { p_user: c.id, p_amount: amount, p_reason: reason }), `₹${amount} credited to ${c.name}`);
  const updateTech = async (t: AdminTech, patch: { kyc?: "Verified"; active?: boolean; dealerId?: string | null }) => {
    const row: Record<string, unknown> = {};
    if (patch.kyc) row.kyc = patch.kyc;
    if (patch.active !== undefined) { row.active = patch.active; if (!patch.active) row.status = "Offline"; }
    if (patch.dealerId !== undefined) row.dealer_id = patch.dealerId;
    await act(() => sb().from("technicians").update(row).eq("id", t.id),
      patch.kyc ? `${t.name} approved — can now take jobs` : patch.active === false ? `${t.name} deactivated` : `${t.name} updated`);
  };
  /** Technician logins are created on the server (it holds the service key). */
  const staffApi = async (body: Record<string, unknown>) => {
    const { data: s } = await sb().auth.getSession();
    const res = await fetch("/api/admin/technicians", {
      method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` }, body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { notify(out.error ?? "Something went wrong", true); return null; }
    live.reload();
    return out as { ok: true; code?: string };
  };
  const createTech = async (t: NewTechnician) => {
    const out = await staffApi({ ...t });
    if (!out?.code) return null;
    notify(`${t.name} added · ${out.code}`);
    return { code: out.code };
  };
  const resetTechPassword = async (t: AdminTech, password: string) => {
    const out = await staffApi({ action: "reset-password", id: t.id, password });
    if (out) notify(`New password set for ${t.name}`);
    return Boolean(out);
  };
  const toggleDealer = async (d: Dealer) => {
    await act(() => sb().from("dealers").update({ active: !d.active }).eq("id", d.id), d.active ? `${d.name} paused` : `${d.name} reactivated`);
  };
  const verifyDealer = async (d: Dealer) => {
    await act(() => sb().from("dealers").update({ kyc: "Verified" }).eq("id", d.id), `${d.name} verified — their listings are live`);
  };
  const createDealer = async (d: NewDealer) => {
    const { data: row, error } = await sb().from("dealers").insert(d).select("code").single();
    if (error) { notify(friendly(error), true); return null; }
    notify(`${d.name} added · ${row.code}`); live.reload();
    return { code: row.code as string };
  };
  const updateProduct = (p: AdminProduct, patch: Partial<AdminProduct>) =>
    act(() => sb().from("products").update(patch).eq("id", p.id), patch.images ? `${p.name} photos saved` : patch.active === false ? `${p.name} hidden from the app` : patch.active ? `${p.name} is live` : `${p.name} updated`);
  /** New products get a readable id from their name ("ro-membrane-housing") and go to the end of the list. */
  const createProduct = async (d: ProductDraft) => {
    const base = d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "product";
    const taken = new Set((data?.products ?? []).map((p) => p.id));
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    const sort = Math.max(0, ...(data?.products ?? []).map((p) => p.sort)) + 1;
    const ok = await act(() => sb().from("products").insert({ id, ...d, sort, active: true }), `${d.name} added — it's live in the shop. Add photos next.`);
    return ok ? id : null;
  };
  const deleteProduct = async (p: AdminProduct) => {
    const ok = await act(() => sb().from("products").delete().eq("id", p.id), `${p.name} deleted`);
    if (ok) await removeProductImages(p.images).catch(() => undefined);
    return ok;
  };
  const updateCoupon = (c: AdminCoupon, patch: { active: boolean }) =>
    act(() => sb().from("coupons").update(patch).eq("code", c.code), patch.active ? `${c.code} is live` : `${c.code} paused`);
  const createCoupon = (c: AdminCoupon) =>
    act(() => sb().from("coupons").insert({
      code: c.code, title: c.title, descr: c.desc, kind: c.kind, value: c.value, max_off: c.maxOff ?? null, min_order: c.minOrder,
      applies_to: c.appliesTo, expires: c.expiresIso, active: true,
    }), `${c.code} created`);
  const setReviewStatus = async (r: AdminReview, status: AdminReview["status"]) => {
    await act(() => sb().from("reviews").update({ status }).eq("id", r.id), status === "Hidden" ? "Review hidden from the app" : "Review published");
  };
  const deleteReview = async (r: AdminReview) => { await act(() => sb().from("reviews").delete().eq("id", r.id), "Review deleted"); };
  const reviewGalleryPart = (p: DbGalleryPart, status: "Approved" | "Rejected", reason?: string) =>
    act(() => sb().from("tech_parts").update({ status, reject_reason: status === "Rejected" ? reason || null : null }).eq("id", p.id),
      status === "Approved" ? `${p.name} approved — the technician can share it now` : `${p.name} rejected`);
  const sendBroadcast = async (b: { title: string; body: string; audience: string }) => {
    const { data: row, error } = await sb().from("broadcasts").insert({ ...b, channels: ["In-app"] }).select("id").single();
    if (error) { notify(friendly(error), true); return null; }
    const { data: sent } = await sb().from("broadcasts").select("reach").eq("id", row.id).single();
    notify(`Sent to ${(sent?.reach ?? 0).toLocaleString("en-IN")} people`); live.reload();
    return sent?.reach ?? 0;
  };

  if (session === undefined) return <Splash text="Loading…" />;
  if (!staff) return <AdminLogin />;
  if (!data) return <Splash text={live.error ?? "Loading console…"} error={!!live.error} onRetry={live.reload} />;
  const { orders, jobs, customers, techs, products, coupons, reviews, dealers, broadcasts, galleryParts } = data;
  const me = session!.user;

  // Sidebar counters for work waiting on someone.
  const badges: Partial<Record<Section, number>> = {
    support: supportUnread,
    orders: orders.filter((o) => o.status === "Placed").length,
    services: jobs.filter((j) => j.status === "Unassigned" || j.status === "Awaiting tech" || j.status === "Rescheduled").length,
    technicians: techs.filter((t) => t.kyc === "Pending").length,
    reviews: reviews.filter((r) => r.status === "Flagged").length,
    products: products.filter((p) => p.active && p.stock != null && p.stock <= 5).length,
    spareparts: galleryParts.filter((p) => p.status === "Pending").length,
  };


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
                <span style={{ width: 20, display: "flex", justifyContent: "center" }}><it.Icon s={19} c="currentColor" w={1.8} /></span>
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
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}</p>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{TITLES[section]}</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{role === "super_admin" ? "Super Admin" : "Admin"}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>{me.email}</p>
                </div>
                <Btn kind="ghost" small onClick={() => void sb().auth.signOut()}>Log out</Btn>
              </div>
            </header>

            {section === "dashboard" && <Dashboard orders={orders} jobs={jobs} customers={customers} techs={techs} products={products} reviews={reviews} go={go} />}
            {section === "support" && <SupportSection customers={customers} notify={notify} />}
            {section === "orders" && <OrdersSection orders={orders} customers={customers} onStatus={setOrderStatus} />}
            {section === "services" && <ServicesSection jobs={jobs} customers={customers} techs={techs} onAssign={assignJob} onCancel={cancelJob} />}
            {section === "customers" && (
              <CustomersSection customers={customers} orders={orders} jobs={jobs} onBlock={blockCustomer} onCredit={creditCustomer}
                onResetPassword={async (id, password) => {
                  const out = await staffApi({ action: "reset-password", id, password });
                  if (out) notify("New password set");
                  return Boolean(out);
                }} />
            )}
            {section === "dealers" && <DealersSection dealers={dealers} techs={techs} onToggle={toggleDealer} onVerify={verifyDealer} onCreate={createDealer} />}
            {section === "technicians" && (
              <TechniciansSection techs={techs} jobs={jobs} dealers={dealers} onUpdate={updateTech} onCreate={createTech} onResetPassword={resetTechPassword} />
            )}
            {section === "products" && <ProductsSection products={products} onUpdate={updateProduct} onCreate={createProduct} onDelete={deleteProduct} />}
            {section === "spareparts" && <SparePartsSection parts={galleryParts} techs={techs} onReview={reviewGalleryPart} />}
            {section === "coupons" && <CouponsSection coupons={coupons} onUpdate={updateCoupon} onCreate={createCoupon} />}
            {section === "reviews" && <ReviewsSection reviews={reviews} onStatus={setReviewStatus} onDelete={deleteReview} />}
            {section === "broadcast" && <BroadcastSection history={broadcasts} onSend={sendBroadcast} />}

            <p style={{ margin: "28px 0 0", textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)" }}>Live data · updates automatically</p>
          </main>
        </div>
      </div>

      {toast && (
        <div className="fade-up" role={toast.bad ? "alert" : "status"} style={{
          position: "fixed", right: 20, bottom: 20, left: "auto", zIndex: 300, maxWidth: "calc(100vw - 40px)",
          background: toast.bad ? "var(--error-text)" : "var(--ink)", color: "white", borderRadius: 12, padding: "12px 16px", fontSize: 13.5, fontWeight: 500, boxShadow: "var(--shadow-xl)",
        }}>{toast.bad ? "" : "✓ "}{toast.msg}</div>
      )}
    </div>
  );
}

const sideLink: React.CSSProperties = { color: "rgba(255,255,255,0.7)", fontSize: 12.5, fontWeight: 600, textDecoration: "none", padding: "6px 10px" };

/* ───────────────────────── Login ───────────────────────── */

function Splash({ text, error, onRetry }: { text: string; error?: boolean; onRetry?: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", background: "var(--app-bg)", padding: 16, textAlign: "center" }}>
      <BrandMark size={44} />
      <p style={{ margin: 0, fontSize: 14, color: error ? "var(--error-text)" : "var(--ink-soft)", fontWeight: error ? 600 : 400 }}>{text}</p>
      {error && onRetry && <Btn small onClick={onRetry}>Try again</Btn>}
    </div>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { data, error } = await sb().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
    if (error) { setErr(friendly(error)); setBusy(false); return; }
    const r = roleOf(data.session);
    if (r !== "admin" && r !== "super_admin") {
      await sb().auth.signOut();
      setErr("This account doesn't have admin access.");
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "linear-gradient(150deg,var(--blue-dark),var(--blue))" }}>
      <form onSubmit={submit} className="fade-up" style={{ width: "100%", maxWidth: 380, background: "var(--surface)", borderRadius: 20, padding: 26, boxShadow: "0 20px 50px rgba(4,36,107,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><BrandMark size={40} /><Wordmark /></div>
        <h1 style={{ margin: "20px 0 2px", fontSize: 22, fontWeight: 800 }}>Admin console</h1>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--ink-soft)" }}>Sign in to manage orders, service jobs and customers.</p>
        <label><span style={fieldLabel}>Email</span><input type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} style={input} /></label>
        <label style={{ display: "block", marginTop: 12 }}><span style={fieldLabel}>Password</span><input type="password" autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(null); }} style={input} /></label>
        {err && <p role="alert" style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
        <button type="submit" disabled={!email || !pw || busy} className="press" style={{
          width: "100%", marginTop: 18, border: "none", borderRadius: 12, padding: 12, fontSize: 14.5, fontWeight: 700, cursor: email && pw && !busy ? "pointer" : "not-allowed",
          background: email && pw ? "var(--blue)" : "var(--line-strong)", color: email && pw ? "white" : "var(--ink-mute)",
        }}>{busy ? "Signing in…" : "Sign in"}</button>
        <p style={{ margin: "14px 0 0", fontSize: 11.5, color: "var(--ink-mute)", textAlign: "center" }}>Forgot your password? Ask the super admin to reset it.</p>
      </form>
    </div>
  );
}
