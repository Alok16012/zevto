"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav, { type Tab } from "./components/BottomNav";
import HomeScreen from "./components/HomeScreen";
import { OnboardingScreen, SplashScreen } from "./components/Intro";
import { CartPage, OrderPlacedPage, ProductDetailPage, ProductListPage, type CartLine } from "./components/ShopScreens";
import { BookServiceScreen, OrderDetailPage, OrdersScreen, TrackServicePage } from "./components/ServiceScreens";
import { ChatScreen, InfoPage, ProfileScreen, type ProfileKey } from "./components/ChatProfile";
import { PrimaryButton, StatusBadge, card } from "./components/ui";
import { ChevronRight, PinIcon, CardIcon, ShieldIcon } from "./components/icons";
import {
  INITIAL_CHAT, INITIAL_ORDERS, INITIAL_SERVICES, SERVICE_STEPS, USER, inr, nowTime, productById, setDealerListings, todayLabel,
  type ChatMessage, type Order, type ServiceRequest,
} from "./lib/data";
import { dealerProducts, sendOrderToDealer } from "./lib/dealer";

const SHELL_MAX_W = 430;
const ONBOARDED_KEY = "osmo:onboarded";

type Detail =
  | { k: "products"; q?: string }
  | { k: "product"; id: string }
  | { k: "cart" }
  | { k: "placed"; ref: string; title: string; next: Detail }
  | { k: "track"; id: string }
  | { k: "order"; id: string }
  | { k: "orders" }
  | { k: "book"; type: ServiceRequest["type"] }
  | { k: "chat" }
  | { k: "info"; key: ProfileKey };

const readFlag = () => { try { return localStorage.getItem(ONBOARDED_KEY) === "1"; } catch { return false; } };
const writeFlag = (v: boolean) => { try { if (v) localStorage.setItem(ONBOARDED_KEY, "1"); else localStorage.removeItem(ONBOARDED_KEY); } catch { /* storage blocked */ } };

let seq = 1240;
const nextRef = (prefix: string) => `${prefix}${++seq}`;

/** Canned support replies until the real chat backend (Socket.IO) is wired up. */
function autoReply(body: string) {
  const t = body.toLowerCase();
  if (/zvt\d+|order/.test(t)) return "Got it! I can see that order. Is the issue with water flow, taste or a leak?";
  if (/filter/.test(t)) return "Filters should be changed every 6–9 months. Want me to book a filter-change visit for you?";
  if (/leak/.test(t)) return "Please switch off the purifier's inlet valve. I'm raising a priority repair request right away.";
  if (/amc/.test(t)) return "Your AMC for AquaPure RO Classic is due in 12 days. You can renew it from Home → AMC Renewal.";
  return "Thanks! Our support team will get back to you shortly.";
}

export default function CustomerApp() {
  const [stage, setStage] = useState<"splash" | "onboarding" | "app">("splash");
  const [tab, setTab] = useState<Tab>("home");
  const [stack, setStack] = useState<Detail[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [services, setServices] = useState<ServiceRequest[]>(INITIAL_SERVICES);
  const [chat, setChat] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [wish, setWish] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatOpen = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Pull in whatever local dealers currently have live on /dealer.
  useEffect(() => { setDealerListings(dealerProducts()); }, []);

  // Returning users skip the Get Started tap.
  useEffect(() => {
    if (!readFlag()) return;
    const t = setTimeout(() => setStage("app"), 1100);
    return () => clearTimeout(t);
  }, []);

  const detail = stack[stack.length - 1];
  const detailKey = detail ? JSON.stringify(detail) : tab;
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [detailKey]);

  const push = (d: Detail) => setStack((s) => [...s, d]);
  const back = () => setStack((s) => s.slice(0, -1));
  const goTab = (t: Tab) => { setStack([]); setTab(t); if (t === "chat") setUnread(0); };
  const flash = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  const addToCart = (id: string, qty = 1) => {
    setCart((c) => {
      const hit = c.find((l) => l.id === id);
      return hit ? c.map((l) => (l.id === id ? { ...l, qty: Math.min(9, l.qty + qty) } : l)) : [...c, { id, qty }];
    });
    flash(`${productById(id)?.name} added to cart`);
  };

  const setQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty } : l))));

  const checkout = (pay: "online" | "cod") => {
    const first = productById(cart[0].id)!;
    const amount = cart.reduce((s, l) => s + productById(l.id)!.price * l.qty, 0);
    const ref = nextRef("ZVT");
    // Lines listed by a dealer go to that dealer's order inbox to fulfil.
    const dealerLines = cart.filter((l) => productById(l.id)?.soldBy);
    if (dealerLines.length) {
      const items = dealerLines.map((l) => { const p = productById(l.id)!; return { listingId: p.id, name: p.name, qty: l.qty, price: p.price }; });
      sendOrderToDealer({
        id: ref, customer: USER.name, phone: USER.phone, address: "B-42, Sector 62, Noida, Uttar Pradesh 201309",
        items, amount: items.reduce((s, i) => s + i.price * i.qty, 0), date: todayLabel(), pay: pay === "cod" ? "COD" : "Online",
      });
    }
    const title = cart.length > 1 ? `${first.name} + ${cart.length - 1} more` : first.name;
    setOrders((o) => [{ id: ref, kind: "product", title, art: first.art, amount, date: todayLabel(), status: "Placed" }, ...o]);
    setCart([]);
    setStack([{ k: "placed", ref, title: "Order Placed!", next: { k: "order", id: ref } }]);
  };

  const bookService = (req: { type: ServiceRequest["type"]; product: string; date: string; slot: string; description: string }) => {
    const id = nextRef("SRV");
    const ref = nextRef("ZVT");
    const now = `${todayLabel()}, ${nowTime()}`;
    const svc: ServiceRequest = {
      id, ...req, current: 0, technician: null,
      timeline: SERVICE_STEPS.map((label, i) => ({ label, at: i === 0 ? now : null })),
    };
    setServices((s) => [svc, ...s]);
    const price = { Installation: 0, Repair: 499, AMC: 1999 }[req.type];
    setOrders((o) => [{ id: ref, kind: "service", title: `Service Booking · ${req.type}`, art: "spare", amount: price, date: todayLabel(), status: "Requested", serviceId: id }, ...o]);
    setStack([{ k: "placed", ref, title: "Service Booked!", next: { k: "track", id } }]);

    // Demo: ops assigns a technician a few seconds later.
    setTimeout(() => {
      setServices((all) => all.map((s) => s.id !== id ? s : {
        ...s, current: 1,
        technician: { name: "Rohit Kumar", initials: "RK", rating: 4.8, phone: "+919800000000" },
        timeline: s.timeline.map((st, i) => (i === 1 ? { ...st, at: `${todayLabel()}, ${nowTime()}` } : st)),
      }));
      setOrders((all) => all.map((o) => (o.serviceId === id ? { ...o, status: "In Progress" } : o)));
    }, 5000);
  };

  const rateService = (id: string) => {
    setServices((all) => all.map((s) => s.id !== id ? s : {
      ...s, timeline: s.timeline.map((st, i) => (i === 4 ? { ...st, at: `${todayLabel()}, ${nowTime()}` } : st)),
    }));
    flash("Thanks for your feedback!");
  };

  /** Demo helper: moves a running job one step along. */
  const advanceService = (id: string) => {
    const s = services.find((x) => x.id === id);
    if (!s || s.current >= 4) return;
    // Finishing the job stamps "Completed" and moves straight on to feedback.
    const cur = s.current === 2 ? 4 : s.current + 1;
    const stampAt = cur === 4 ? 3 : cur;
    const stamp = `${todayLabel()}, ${nowTime()}`;
    setServices((all) => all.map((x) => x.id !== id ? x : {
      ...x, current: cur, timeline: x.timeline.map((st, i) => (i === stampAt ? { ...st, at: stamp } : st)),
    }));
    if (cur >= 3) setOrders((all) => all.map((o) => (o.serviceId === id ? { ...o, status: "Completed" } : o)));
  };

  const sendChat = (body: string) => {
    setChat((c) => [...c, { id: Date.now(), from: "me", body, at: nowTime() }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setChat((c) => [...c, { id: Date.now() + 1, from: "agent", body: autoReply(body), at: nowTime() }]);
      if (!chatOpen.current) setUnread((u) => u + 1);
    }, 1400);
  };

  const openOrder = (o: Order) => push(o.serviceId ? { k: "track", id: o.serviceId } : { k: "order", id: o.id });

  const logout = () => {
    writeFlag(false);
    setStack([]); setTab("home"); setCart([]);
    setStage("splash");
  };

  const showNav = stage === "app" && !detail;
  const chatFull = (!detail && tab === "chat") || detail?.k === "chat";
  useEffect(() => { chatOpen.current = chatFull; }, [chatFull]);

  return (
    // Pinned to the viewport so the page itself never scrolls — only the content area does.
    <div style={{ position: "fixed", inset: 0, background: "var(--app-bg)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: SHELL_MAX_W, height: "100%", position: "relative", background: "var(--app-bg)", overflow: "hidden", boxShadow: "var(--shadow-float)", display: "flex", flexDirection: "column" }}>

        {stage === "splash" && <SplashScreen onStart={() => setStage(readFlag() ? "app" : "onboarding")} />}
        {stage === "onboarding" && <OnboardingScreen onDone={() => { writeFlag(true); setStage("app"); }} />}

        {chatFull ? (
          <div style={{ flex: 1, minHeight: 0, paddingBottom: showNav ? "calc(76px + env(safe-area-inset-bottom))" : undefined }}>
            <ChatScreen messages={chat} typing={typing} onSend={sendChat} onBack={detail ? back : undefined} />
          </div>
        ) : (
          <div ref={scrollRef} className="no-scroll" style={{
            flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain",
            paddingBottom: showNav ? "calc(76px + env(safe-area-inset-bottom))" : undefined,
          }}>
            {/* ── Detail pages ── */}
            {detail?.k === "products" && (
              <ProductListPage key={detail.q ?? ""} initialQuery={detail.q} onBack={back} onOpen={(id) => push({ k: "product", id })}
                onAdd={(id) => addToCart(id)} cartCount={cartCount} onOpenCart={() => push({ k: "cart" })} />
            )}
            {detail?.k === "product" && (
              <ProductDetailPage key={detail.id} id={detail.id} onBack={back}
                onAdd={(id, qty) => addToCart(id, qty)}
                onBuyNow={(id, qty) => { addToCart(id, qty); push({ k: "cart" }); }}
                wished={wish.includes(detail.id)}
                onToggleWish={() => setWish((w) => (w.includes(detail.id) ? w.filter((x) => x !== detail.id) : [...w, detail.id]))} />
            )}
            {detail?.k === "cart" && <CartPage lines={cart} onBack={back} setQty={setQty} onCheckout={checkout} onShop={() => push({ k: "products" })} />}
            {detail?.k === "placed" && (
              <OrderPlacedPage orderId={detail.ref} title={detail.title} onTrack={() => setStack([detail.next])} onHome={() => goTab("home")} />
            )}
            {detail?.k === "track" && (() => {
              const s = services.find((x) => x.id === detail.id);
              return s ? (
                <>
                  <TrackServicePage key={s.id} service={s} onBack={back} onChat={() => push({ k: "chat" })} onRate={() => rateService(s.id)} />
                  {s.technician && s.current < 4 && (
                    <div style={{ padding: "0 16px 24px", textAlign: "center" }}>
                      <button onClick={() => advanceService(s.id)} style={{ background: "none", border: "1px dashed var(--line-strong)", borderRadius: 10, padding: "6px 12px", fontSize: 11.5, color: "var(--ink-mute)", cursor: "pointer" }}>
                        Demo: move to next step
                      </button>
                    </div>
                  )}
                </>
              ) : null;
            })()}
            {detail?.k === "order" && (() => {
              const o = orders.find((x) => x.id === detail.id);
              return o ? <OrderDetailPage order={o} onBack={back} onHelp={() => push({ k: "chat" })} /> : null;
            })()}
            {detail?.k === "orders" && <OrdersScreen orders={orders} onBack={back} onOpen={openOrder} />}
            {detail?.k === "book" && <BookServiceScreen key={detail.type} initialType={detail.type} onBack={back} onSubmit={bookService} />}
            {detail?.k === "info" && (
              <ProfileInfo which={detail.key} onBack={back} services={services}
                onTrack={(id) => push({ k: "track", id })} onRenew={() => push({ k: "book", type: "AMC" })} />
            )}

            {/* ── Tabs ── */}
            {!detail && tab === "home" && (
              <HomeScreen
                cartCount={cartCount}
                onOpenCart={() => push({ k: "cart" })}
                onOpenProducts={(q) => push({ k: "products", q })}
                onOpenProduct={(id) => push({ k: "product", id })}
                onBookService={() => goTab("service")}
                onRenewAmc={() => push({ k: "book", type: "AMC" })}
                onSupport={() => goTab("chat")}
                onAddToCart={(id) => addToCart(id)}
              />
            )}
            {!detail && tab === "orders" && <OrdersScreen orders={orders} onOpen={openOrder} />}
            {!detail && tab === "service" && <BookServiceScreen onSubmit={bookService} />}
            {!detail && tab === "profile" && (
              <ProfileScreen
                stats={{ orders: orders.filter((o) => o.kind === "product").length, services: services.length, amcDays: 12 }}
                onMenu={(key) => push(key === "orders" ? { k: "orders" } : { k: "info", key })}
                onLogout={logout}
              />
            )}
          </div>
        )}

        {showNav && <BottomNav active={tab} onChange={goTab} unreadChat={unread} />}

        {toast && (
          <div className="fade-up" role="status" style={{
            position: "absolute", left: 16, right: 16, bottom: showNav ? 90 : 96, zIndex: 120,
            background: "var(--ink)", color: "white", borderRadius: 14, padding: "12px 16px",
            fontSize: 13.5, fontWeight: 500, boxShadow: "var(--shadow-xl)", textAlign: "center",
          }}>{toast}</div>
        )}
      </div>
    </div>
  );
}

/* Profile-menu pages that don't need a screen of their own yet. */
function ProfileInfo({ which, onBack, services, onTrack, onRenew }: {
  which: ProfileKey; onBack: () => void; services: ServiceRequest[]; onTrack: (id: string) => void; onRenew: () => void;
}) {
  const row: React.CSSProperties = { ...card, padding: 14, display: "flex", alignItems: "center", gap: 12 };
  const small: React.CSSProperties = { margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 };

  switch (which) {
    case "history":
      return (
        <InfoPage title="Service History" onBack={onBack}>
          {services.map((s) => (
            <button key={s.id} onClick={() => onTrack(s.id)} className="press" style={{ ...row, border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{s.type} · {s.product}</p>
                <p style={small}>#{s.id} · {s.date}</p>
              </div>
              <StatusBadge status={s.current >= 3 ? "Completed" : s.current === 0 ? "Requested" : "In Progress"} />
              <ChevronRight s={16} c="var(--ink-mute)" />
            </button>
          ))}
        </InfoPage>
      );
    case "amc":
      return (
        <InfoPage title="AMC Plans" onBack={onBack}>
          <div style={{ borderRadius: 20, padding: 18, background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", color: "white", boxShadow: "0 10px 28px rgba(11,92,255,0.28)" }}>
            <span style={{ background: "var(--gold)", color: "var(--blue-dark)", fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>ACTIVE · FREE YEAR</span>
            <p style={{ margin: "12px 0 2px", fontSize: 17, fontWeight: 700 }}>AquaPure RO Classic</p>
            <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.75)" }}>18 Sep 2025 → 10 Oct 2026</p>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.2)", margin: "14px 0 6px" }}>
              <div style={{ width: "96%", height: "100%", borderRadius: 3, background: "var(--gold)" }} />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>12 days left · 1 of 3 visits remaining</p>
          </div>
          <PrimaryButton tone="gold" onClick={onRenew}>Renew for 1 year · {inr(1999)}</PrimaryButton>
        </InfoPage>
      );
    case "addresses":
      return (
        <InfoPage title="Addresses" onBack={onBack}>
          {[["Home", "B-42, Sector 62, Noida, Uttar Pradesh 201309"], ["Office", "4th Floor, Tower C, Cyber City, Gurugram 122002"]].map(([t, a]) => (
            <div key={t} style={row}><PinIcon s={22} c="var(--blue)" /><div><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t}</p><p style={small}>{a}</p></div></div>
          ))}
        </InfoPage>
      );
    case "payments":
      return (
        <InfoPage title="Payment Methods" onBack={onBack}>
          <div style={row}><CardIcon s={22} c="var(--blue)" /><div><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>UPI</p><p style={small}>alok@okaxis</p></div></div>
          <p style={{ ...small, textAlign: "center", padding: "0 20px" }}>Card details are stored by the payment gateway, never on Zavtoo servers.</p>
        </InfoPage>
      );
    case "notifications":
      return (
        <InfoPage title="Notifications" onBack={onBack}>
          {[["Technician assigned", "Rohit Kumar will visit today, 10–12 AM.", "2h"], ["AMC renewal due", "Your AMC expires in 12 days.", "1d"], ["Order delivered", "AquaPure RO Classic was delivered.", "10d"]].map(([t, b, w]) => (
            <div key={t} style={row}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />
              <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t}</p><p style={small}>{b}</p></div>
              <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{w}</span>
            </div>
          ))}
        </InfoPage>
      );
    case "help":
      return (
        <InfoPage title="Help & Support" onBack={onBack}>
          {[["How often should I change filters?", "Every 6–9 months, depending on your water TDS and usage."], ["Is installation free?", "Yes — free with every Zavtoo purifier."], ["What does AMC cover?", "3 service visits, 2 filter sets and priority repairs for one year."]].map(([q, a]) => (
            <div key={q} style={{ ...card, padding: 14 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{q}</p><p style={small}>{a}</p></div>
          ))}
          <a href="tel:+911800000000" style={{ ...row, textDecoration: "none", color: "var(--ink)" }}>
            <ShieldIcon s={22} c="var(--blue)" /><span style={{ fontSize: 14, fontWeight: 600 }}>Call 1800-000-000 (toll free)</span>
          </a>
        </InfoPage>
      );
    case "about":
    default:
      return (
        <InfoPage title="About Us" onBack={onBack}>
          <div style={{ ...card, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Zavtoo Pani Filter Pvt Ltd</p>
            <p style={small}>We sell, install and service RO water purifiers, spare parts and AMC plans — so every home gets pure water without the hassle.</p>
          </div>
        </InfoPage>
      );
  }
}
