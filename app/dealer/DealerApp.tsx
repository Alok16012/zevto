"use client";

import { useEffect, useRef, useState } from "react";
import DealerNav, { type DealerTab } from "../components/dealer/DealerNav";
import { ListingFormPage, ListingsScreen, type ListingDraft } from "../components/dealer/ListingScreens";
import { DealerHome, DealerOrderDetail, DealerOrdersScreen, JobDetail, JobsScreen } from "../components/dealer/WorkScreens";
import {
  DealerAuthScreen, DealerHelpPage, DealerProfileScreen, ShopForm, TeamPage,
  type DealerPage, type DealerSignup, type NewTeamMember, type ShopEdit,
} from "../components/dealer/ProfileScreens";
import { BrandMark } from "../components/Brand";
import { useCatalog } from "../lib/catalog";
import { friendly, roleOf, supabaseFor, useLive, useSession } from "../lib/supabase";
import { isOpenJob, loadDealerData, type DbListing, type DealerOrderStatus } from "../lib/dealerData";

const SHELL_MAX_W = 430;
const sb = () => supabaseFor("dealer");

type Detail =
  | { k: "listing"; id?: string }
  | { k: "order"; id: string }
  | { k: "job"; id: string }
  | { k: "page"; p: DealerPage };

export default function DealerApp() {
  const session = useSession("dealer");
  const isDealer = roleOf(session ?? null) === "dealer";
  const uid = isDealer ? session!.user.id : null;
  // Zavtoo's catalogue, for "resell a Zavtoo model" on new listings.
  useCatalog("dealer", session === undefined ? undefined : uid);
  const live = useLive("dealer", uid, (c) => loadDealerData(c, uid!), [
    { table: "dealers" }, { table: "products" }, { table: "dealer_orders" }, { table: "service_requests" }, { table: "technicians" },
  ]);
  const data = live.data;

  const [tab, setTab] = useState<DealerTab>("home");
  const [stack, setStack] = useState<Detail[]>([]);
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const detail = stack[stack.length - 1];
  const detailKey = detail ? JSON.stringify(detail) : tab;
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [detailKey]);
  // Customer, technician and staff logins can't use the dealer app.
  useEffect(() => { if (session && !isDealer) void sb().auth.signOut(); }, [session, isDealer]);

  const push = (d: Detail) => setStack((s) => [...s, d]);
  const back = () => setStack((s) => s.slice(0, -1));
  const goTab = (t: DealerTab) => { setStack([]); setTab(t); };
  const flash = (msg: string, bad = false) => {
    setToast({ msg, bad });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), bad ? 4500 : 2000);
  };
  /** Runs a database call; shows the error or the success message. */
  const run = async (p: PromiseLike<{ error: unknown }>, ok?: string) => {
    const { error } = await p;
    if (error) { flash(friendly(error), true); return false; }
    if (ok) flash(ok);
    live.reload();
    return true;
  };

  /* ── Auth ── */

  const login = async (email: string, password: string) => {
    const { data: d, error } = await sb().auth.signInWithPassword({ email, password });
    if (error) return friendly(error);
    if (roleOf(d.session) !== "dealer") {
      await sb().auth.signOut();
      return "This isn't a dealer account. Customers use the Zavtoo app and technicians the Partner app.";
    }
    setTab("home"); setStack([]);
    return null;
  };
  const signup = async (d: DealerSignup) => {
    try {
      const res = await fetch("/api/dealer-signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return body.error ?? "Couldn't register your shop";
    } catch (e) { return friendly(e); }
    const err = await login(d.email, d.password);
    if (!err) flash("Shop registered — welcome to Zavtoo!");
    return err;
  };
  const logout = () => { setStack([]); setTab("home"); void sb().auth.signOut(); };

  /* ── Shell ── */

  const showNav = !!data && !detail;
  const shell = (children: React.ReactNode) => (
    <div style={{ position: "fixed", inset: 0, background: "var(--app-bg)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: SHELL_MAX_W, height: "100%", position: "relative", background: "var(--app-bg)", overflow: "hidden", boxShadow: "var(--shadow-float)", display: "flex", flexDirection: "column" }}>
        {children}
        {showNav && data && (
          <DealerNav active={tab} onChange={goTab} badges={{
            orders: data.orders.filter((o) => o.status === "New").length,
            jobs: data.dealer.kyc === "Verified" ? data.jobs.filter(isOpenJob).length : 0,
          }} />
        )}
        {toast && (
          <div className="fade-up" role={toast.bad ? "alert" : "status"} style={{
            position: "absolute", left: 16, right: 16, bottom: showNav ? 90 : 96, zIndex: 120,
            background: toast.bad ? "var(--error-text)" : "var(--ink)", color: "white", borderRadius: 14, padding: "12px 16px",
            fontSize: 13.5, fontWeight: 500, boxShadow: "var(--shadow-xl)", textAlign: "center",
          }}>{toast.msg}</div>
        )}
      </div>
    </div>
  );

  if (session === undefined) return shell(<Centered text="Loading…" />);
  if (!isDealer) return shell(<DealerAuthScreen onLogin={login} onSignup={signup} />);
  if (live.error && /NO_DEALER/.test(live.error)) {
    return shell(<Centered text="This login isn't linked to a dealer shop yet. Call dealer help to finish setting it up." action={<button onClick={logout} style={linkBtn}>Log out</button>} />);
  }
  if (!data) return shell(<Centered text={live.error ?? "Loading your shop…"} action={live.error ? <button onClick={live.reload} style={linkBtn}>Try again</button> : undefined} />);

  const { dealer } = data;
  const verified = dealer.kyc === "Verified" && dealer.active;

  /* ── Actions ── */

  const saveListing = async (draft: ListingDraft, id?: string) => {
    const ok = id
      ? await run(sb().from("products").update(draft).eq("id", id), "Listing updated")
      // The database issues the listing ID and links it to this shop.
      : await run(sb().from("products").insert({ ...draft, id: "new", dealer_id: dealer.id }),
        !draft.active ? "Saved as paused" : verified ? "Listing is live" : "Saved — it goes live once your shop is verified");
    if (ok) back();
    return ok;
  };
  const deleteListing = async (l: DbListing) => { if (await run(sb().from("products").delete().eq("id", l.id), `${l.name} deleted`)) back(); };
  const toggleListing = (l: DbListing, active: boolean) => run(sb().from("products").update({ active }).eq("id", l.id), active ? "Listing is live" : "Listing paused");
  const setStock = (l: DbListing, stock: number) => run(sb().from("products").update({ stock }).eq("id", l.id));

  const setOrderStatus = async (id: string, status: DealerOrderStatus, reason?: string) =>
    run(sb().rpc("dealer_set_order_status", { p_id: id, p_status: status, p_reason: reason ?? null }), {
      Accepted: "Order accepted", Shipped: "Marked as dispatched", Delivered: "Marked as delivered",
      Rejected: "Order rejected — stock is back on your listing", New: "", Cancelled: "",
    }[status]);
  const assignJob = (id: string, techId: string) =>
    run(sb().rpc("dealer_assign_job", { p_request: id, p_tech: techId }), `Assigned to ${data.team.find((t) => t.id === techId)?.name ?? "technician"}`);

  const saveShop = async (d: ShopEdit) => {
    const ok = await run(sb().from("dealers").update(d).eq("id", dealer.id), "Shop details saved");
    if (ok) back();
    return ok;
  };
  const addTechnician = async (t: NewTeamMember) => {
    const { data: s } = await sb().auth.getSession();
    try {
      const res = await fetch("/api/dealer/technicians", {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` }, body: JSON.stringify(t),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return body.error ?? "Couldn't add the technician";
    } catch (e) { return friendly(e); }
    live.reload();
    return null;
  };

  return shell(
    <div ref={scrollRef} className="no-scroll" style={{
      flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain",
      paddingBottom: showNav ? "calc(76px + env(safe-area-inset-bottom))" : undefined,
    }}>
      {/* ── Detail pages ── */}
      {detail?.k === "listing" && (() => {
        const l = detail.id ? data.listings.find((x) => x.id === detail.id) : undefined;
        return <ListingFormPage key={detail.id ?? "new"} initial={l} onBack={back} onSave={(d) => saveListing(d, l?.id)} onDelete={l ? () => void deleteListing(l) : undefined} />;
      })()}
      {detail?.k === "order" && (() => {
        const o = data.orders.find((x) => x.id === detail.id);
        return o ? <DealerOrderDetail order={o} onBack={back} onStatus={(st, r) => setOrderStatus(o.id, st, r)} /> : <Gone onBack={back} />;
      })()}
      {detail?.k === "job" && (() => {
        const j = data.jobs.find((x) => x.id === detail.id);
        return j ? <JobDetail key={j.id} job={j} team={data.team} verified={verified} onBack={back}
          onAssign={(t) => assignJob(j.id, t)} onAddTech={() => push({ k: "page", p: "team" })} /> : <Gone onBack={back} />;
      })()}
      {detail?.k === "page" && detail.p === "edit" && <ShopForm dealer={dealer} onBack={back} onSave={saveShop} />}
      {detail?.k === "page" && detail.p === "team" && <TeamPage team={data.team} jobs={data.jobs} shopPins={dealer.pincodes} onBack={back} onAdd={addTechnician} />}
      {detail?.k === "page" && detail.p === "help" && <DealerHelpPage onBack={back} />}

      {/* ── Tabs ── */}
      {!detail && tab === "home" && (
        <DealerHome data={data}
          onOrders={() => goTab("orders")} onJobs={() => goTab("jobs")} onListings={() => goTab("listings")}
          onTeam={() => push({ k: "page", p: "team" })} onAddListing={() => push({ k: "listing" })}
          onOpenOrder={(id) => push({ k: "order", id })} onOpenJob={(id) => push({ k: "job", id })} />
      )}
      {!detail && tab === "listings" && (
        <ListingsScreen listings={data.listings} verified={verified}
          onAdd={() => push({ k: "listing" })} onEdit={(id) => push({ k: "listing", id })}
          onToggle={(l, a) => void toggleListing(l, a)} onStock={(l, n) => void setStock(l, n)} />
      )}
      {!detail && tab === "orders" && <DealerOrdersScreen orders={data.orders} onOpen={(id) => push({ k: "order", id })} />}
      {!detail && tab === "jobs" && <JobsScreen jobs={data.jobs} team={data.team} verified={verified} onOpen={(id) => push({ k: "job", id })} />}
      {!detail && tab === "profile" && <DealerProfileScreen data={data} onOpen={(p) => push({ k: "page", p })} onLogout={logout} />}
    </div>,
  );
}

const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--blue)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 8 };

function Centered({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
      <BrandMark size={44} />
      <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>{text}</p>
      {action}
    </div>
  );
}

/** A detail page whose row is no longer visible (e.g. a job another dealer took). */
function Gone({ onBack }: { onBack: () => void }) {
  return <Centered text="This isn't available any more." action={<button onClick={onBack} style={linkBtn}>Go back</button>} />;
}
