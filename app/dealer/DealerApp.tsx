"use client";

import { useEffect, useRef, useState } from "react";
import DealerNav, { type DealerTab } from "../components/dealer/DealerNav";
import { ListingFormPage, ListingsScreen } from "../components/dealer/ListingScreens";
import { DealerHome, DealerOrderDetail, DealerOrdersScreen, JobDetail, JobsScreen } from "../components/dealer/WorkScreens";
import { DealerHelpPage, DealerProfileScreen, PayoutsPage, ShopForm, TeamPage, type DealerPage } from "../components/dealer/ProfileScreens";
import { BrandMark } from "../components/Brand";
import {
  demoDealer, freshDealer, loadDealer, saveDealer,
  type DealerOrderStatus, type DealerState, type JobStatus, type Listing,
} from "../lib/dealer";

const SHELL_MAX_W = 430;

type Detail =
  | { k: "listing"; id?: string }
  | { k: "order"; id: string }
  | { k: "job"; id: string }
  | { k: "page"; p: DealerPage };

export default function DealerApp() {
  // null until localStorage has been read on the client.
  const [state, setState] = useState<DealerState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<DealerTab>("home");
  const [stack, setStack] = useState<Detail[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setState(loadDealer());
    setLoaded(true);
    // Orders placed from the customer app in another tab show up live.
    const onStorage = (e: StorageEvent) => { if (e.key === null || e.key.startsWith("zavtoo:dealer")) setState(loadDealer()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => { if (loaded) saveDealer(state); }, [state, loaded]);

  const detail = stack[stack.length - 1];
  const detailKey = detail ? JSON.stringify(detail) : tab;
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [detailKey]);

  const push = (d: Detail) => setStack((s) => [...s, d]);
  const back = () => setStack((s) => s.slice(0, -1));
  const goTab = (t: DealerTab) => { setStack([]); setTab(t); };
  const flash = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };
  const update = (fn: (s: DealerState) => DealerState) => setState((s) => (s ? fn(s) : s));

  const shell = (children: React.ReactNode) => (
    <div style={{ position: "fixed", inset: 0, background: "var(--app-bg)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: SHELL_MAX_W, height: "100%", position: "relative", background: "var(--app-bg)", overflow: "hidden", boxShadow: "var(--shadow-float)", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );

  if (!loaded) {
    return shell(<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><BrandMark size={56} /></div>);
  }

  /* ── Not registered yet: sign-up form ── */
  if (!state?.registered) {
    return shell(
      <div className="no-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <ShopForm mode="register"
          onSubmit={(d) => { setState(freshDealer(d)); setTab("home"); setStack([]); flash("Shop registered — welcome to Zavtoo!"); }}
          onDemo={() => { setState(demoDealer()); setTab("home"); setStack([]); }} />
      </div>,
    );
  }

  const s = state;

  /* ── Actions ── */

  const saveListing = (l: Omit<Listing, "id"> & { id?: string }) => {
    if (l.id) {
      update((x) => ({ ...x, listings: x.listings.map((y) => (y.id === l.id ? { ...l, id: y.id } : y)) }));
      flash("Listing updated");
    } else {
      const id = `dl-${Date.now().toString(36)}`;
      update((x) => ({ ...x, listings: [{ ...l, id }, ...x.listings] }));
      flash(l.active ? "Listing is live" : "Listing saved as paused");
    }
    back();
  };

  const deleteListing = (id: string) => {
    update((x) => ({ ...x, listings: x.listings.filter((y) => y.id !== id) }));
    back();
    flash("Listing deleted");
  };

  const setOrderStatus = (id: string, status: DealerOrderStatus) => {
    update((x) => {
      const o = x.orders.find((y) => y.id === id);
      // Accepting an order reserves the units from stock.
      const listings = status === "Accepted" && o
        ? x.listings.map((l) => { const it = o.items.find((i) => i.listingId === l.id); return it ? { ...l, stock: Math.max(0, l.stock - it.qty) } : l; })
        : x.listings;
      return { ...x, listings, orders: x.orders.map((y) => (y.id === id ? { ...y, status } : y)) };
    });
    flash({ Accepted: "Order accepted", Shipped: "Marked as dispatched", Delivered: "Marked as delivered", Rejected: "Order rejected — customer will be refunded", New: "" }[status]);
    if (status === "Rejected") back();
  };

  const assignJob = (id: string, techId: string) => {
    update((x) => ({ ...x, jobs: x.jobs.map((j) => (j.id === id ? { ...j, techId, status: j.status === "New" ? "Assigned" : j.status } : j)) }));
    flash(`Assigned to ${s.team.find((t) => t.id === techId)?.name}`);
  };

  const setJobStatus = (id: string, status: JobStatus) => {
    update((x) => ({ ...x, jobs: x.jobs.map((j) => (j.id === id ? { ...j, status } : j)) }));
    flash(status === "Completed" ? "Job completed" : "Job started");
  };

  const load: Record<string, number> = {};
  for (const j of s.jobs) if (j.techId && j.status !== "Completed") load[j.techId] = (load[j.techId] ?? 0) + 1;

  const logout = () => { setState(null); setStack([]); setTab("home"); };

  const showNav = !detail;
  const badges = { orders: s.orders.filter((o) => o.status === "New").length, jobs: s.jobs.filter((j) => j.status === "New").length };

  return shell(
    <>
      <div ref={scrollRef} className="no-scroll" style={{
        flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain",
        paddingBottom: showNav ? "calc(76px + env(safe-area-inset-bottom))" : undefined,
      }}>
        {/* ── Detail pages ── */}
        {detail?.k === "listing" && (() => {
          const l = detail.id ? s.listings.find((x) => x.id === detail.id) : undefined;
          return <ListingFormPage key={detail.id ?? "new"} initial={l} onBack={back} onSave={saveListing} onDelete={l ? () => deleteListing(l.id) : undefined} />;
        })()}
        {detail?.k === "order" && (() => {
          const o = s.orders.find((x) => x.id === detail.id);
          return o ? <DealerOrderDetail order={o} onBack={back} onStatus={(st) => setOrderStatus(o.id, st)} /> : null;
        })()}
        {detail?.k === "job" && (() => {
          const j = s.jobs.find((x) => x.id === detail.id);
          return j ? <JobDetail key={j.id} job={j} team={s.team} load={load} onBack={back}
            onAssign={(t) => assignJob(j.id, t)} onStatus={(st) => setJobStatus(j.id, st)} onAddTech={() => push({ k: "page", p: "team" })} /> : null;
        })()}
        {detail?.k === "page" && detail.p === "edit" && (
          <ShopForm mode="edit" initial={s.profile} initialBank={s.profile.bank} onBack={back}
            onSubmit={(d, bank) => { update((x) => ({ ...x, profile: { ...x.profile, ...d, bank } })); back(); flash("Profile saved"); }} />
        )}
        {detail?.k === "page" && detail.p === "team" && (
          <TeamPage team={s.team} load={load} onBack={back}
            onAdd={(name, phone) => { update((x) => ({ ...x, team: [...x.team, { id: `T${Date.now().toString(36)}`, name, phone, available: true }] })); flash(`${name} added`); }}
            onToggle={(id, available) => update((x) => ({ ...x, team: x.team.map((t) => (t.id === id ? { ...t, available } : t)) }))}
            onRemove={(id) => update((x) => ({ ...x, team: x.team.filter((t) => t.id !== id) }))} />
        )}
        {detail?.k === "page" && detail.p === "payouts" && <PayoutsPage state={s} onBack={back} onAddBank={() => push({ k: "page", p: "edit" })} />}
        {detail?.k === "page" && detail.p === "help" && <DealerHelpPage onBack={back} />}

        {/* ── Tabs ── */}
        {!detail && tab === "home" && (
          <DealerHome state={s}
            onOrders={() => goTab("orders")} onJobs={() => goTab("jobs")} onListings={() => goTab("listings")}
            onAddListing={() => push({ k: "listing" })}
            onOpenOrder={(id) => push({ k: "order", id })} onOpenJob={(id) => push({ k: "job", id })}
            onPayouts={() => push({ k: "page", p: "payouts" })} />
        )}
        {!detail && tab === "listings" && (
          <ListingsScreen listings={s.listings}
            onAdd={() => push({ k: "listing" })} onEdit={(id) => push({ k: "listing", id })}
            onToggle={(id, active) => { update((x) => ({ ...x, listings: x.listings.map((l) => (l.id === id ? { ...l, active } : l)) })); flash(active ? "Listing is live" : "Listing paused"); }}
            onStock={(id, stock) => update((x) => ({ ...x, listings: x.listings.map((l) => (l.id === id ? { ...l, stock } : l)) }))} />
        )}
        {!detail && tab === "orders" && <DealerOrdersScreen orders={s.orders} onOpen={(id) => push({ k: "order", id })} />}
        {!detail && tab === "jobs" && <JobsScreen jobs={s.jobs} team={s.team} onOpen={(id) => push({ k: "job", id })} />}
        {!detail && tab === "profile" && <DealerProfileScreen state={s} onOpen={(p) => push({ k: "page", p })} onLogout={logout} />}
      </div>

      {showNav && <DealerNav active={tab} onChange={goTab} badges={badges} />}

      {toast && (
        <div className="fade-up" role="status" style={{
          position: "absolute", left: 16, right: 16, bottom: showNav ? 90 : 96, zIndex: 120,
          background: "var(--ink)", color: "white", borderRadius: 14, padding: "12px 16px",
          fontSize: 13.5, fontWeight: 500, boxShadow: "var(--shadow-xl)", textAlign: "center",
        }}>{toast}</div>
      )}
    </>,
  );
}
