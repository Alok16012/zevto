"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav, { type Tab } from "./components/BottomNav";
import HomeScreen from "./components/HomeScreen";
import { OnboardingScreen, SplashScreen } from "./components/Intro";
import { CartPage, OrderPlacedPage, ProductDetailPage, ProductListPage, type CartLine, type CheckoutTotals } from "./components/ShopScreens";
import { BookServiceScreen, OrderDetailPage, OrdersScreen, TrackServicePage, type BookingRequest } from "./components/ServiceScreens";
import { ChatScreen, InfoPage, ProfileScreen, type ProfileKey } from "./components/ChatProfile";
import { AddressesPage, EditProfilePage, NotificationsPage, ReferralPage, WalletPage } from "./components/Account";
import { OffersPage } from "./components/Offers";
import { AllReviewsPage, MyReviewsPage, TechnicianPage, WriteReviewPage } from "./components/Reviews";
import { ServiceDetailPage, ServicesHubScreen } from "./components/ServicesHub";
import { PrimaryButton, StatusBadge, card } from "./components/ui";
import { ChevronRight, CardIcon, ShieldIcon } from "./components/icons";
import { setTrip, updateBridge, useBridge } from "./lib/bridge";
import {
  INITIAL_ADDRESSES, INITIAL_CHAT, INITIAL_NOTIFICATIONS, INITIAL_ORDERS, INITIAL_REFERRALS, INITIAL_REVIEWS, INITIAL_SERVICES,
  INITIAL_WALLET, REFERRAL_REWARD, SERVICE_STEPS, USER, inr, nowTime, productById, techById, todayLabel,
  type Address, type AppNotification, type ChatMessage, type NotifPrefs, type Order, type Referral, type Review,
  type ServiceRating, type ServiceRequest, type ServiceType, type UserProfile, type WalletTxn,
} from "./lib/data";

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
  | { k: "book"; type: ServiceType }
  | { k: "serviceInfo"; type: ServiceType }
  | { k: "tech"; id: string }
  | { k: "reviews"; productId: string }
  | { k: "writeReview"; productId: string }
  | { k: "myReviews" }
  | { k: "offers" }
  | { k: "wallet" }
  | { k: "referral" }
  | { k: "notifications" }
  | { k: "editProfile" }
  | { k: "addresses" }
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
  const [user, setUser] = useState<UserProfile>(USER);
  const [addresses, setAddresses] = useState<Address[]>(INITIAL_ADDRESSES);
  const [wallet, setWallet] = useState<WalletTxn[]>(INITIAL_WALLET);
  const [referrals, setReferrals] = useState<Referral[]>(INITIAL_REFERRALS);
  const [notifs, setNotifs] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ push: true, sms: true, whatsapp: false, offers: true });
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const bridge = useBridge();
  const seenTrips = useRef(new Set<string>());
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatOpen = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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
  const walletBalance = wallet.reduce((s, t) => s + t.amount, 0);
  const unreadNotifs = notifs.filter((n) => !n.read).length;
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const referralCode = `${user.name.split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "ZAV"}250`;

  /** Drops a new item into the in-app notification centre. */
  const notify = (n: Omit<AppNotification, "id" | "at" | "read">) =>
    setNotifs((all) => [{ ...n, id: `n${Date.now()}${Math.random().toString(36).slice(2, 5)}`, at: `${todayLabel()}, ${nowTime()}`, read: false }, ...all]);

  const creditWallet = (title: string, amount: number) =>
    setWallet((w) => [{ id: `w${Date.now()}`, title, amount, at: todayLabel() }, ...w]);

  const addToCart = (id: string, qty = 1) => {
    setCart((c) => {
      const hit = c.find((l) => l.id === id);
      return hit ? c.map((l) => (l.id === id ? { ...l, qty: Math.min(9, l.qty + qty) } : l)) : [...c, { id, qty }];
    });
    flash(`${productById(id)?.name} added to cart`);
  };

  const setQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty } : l))));

  const checkout = (_pay: "online" | "cod", t: CheckoutTotals) => {
    const first = productById(cart[0].id)!;
    const ref = nextRef("ZVT");
    const title = cart.length > 1 ? `${first.name} + ${cart.length - 1} more` : first.name;
    setOrders((o) => [{
      id: ref, kind: "product", title, art: first.art, amount: t.toPay, date: todayLabel(), status: "Placed",
      productIds: cart.map((l) => l.id), coupon: t.coupon ?? undefined, discount: t.discount || undefined, walletUsed: t.walletUsed || undefined,
    }, ...o]);
    if (t.walletUsed) creditWallet(`Paid for order #${ref}`, -t.walletUsed);
    notify({ kind: "order", title: "Order placed", body: `${title} · ${inr(t.toPay)}. We'll notify you when it ships.`, link: { k: "order", id: ref } });
    setCart([]); setCoupon(null); setUseWallet(false);
    setStack([{ k: "placed", ref, title: "Order Placed!", next: { k: "order", id: ref } }]);
  };

  const bookService = ({ price, coupon: code, discount, ...req }: BookingRequest) => {
    const id = nextRef("SRV");
    const ref = nextRef("ZVT");
    const now = `${todayLabel()}, ${nowTime()}`;
    const otp = String(1000 + Math.floor(Math.random() * 9000));
    const address = defaultAddress ? `${defaultAddress.line} ${defaultAddress.pincode}` : "Address not set";
    const svc: ServiceRequest = {
      id, ...req, current: 0, technician: null, otp, address,
      timeline: SERVICE_STEPS.map((label, i) => ({ label, at: i === 0 ? now : null })),
    };
    setServices((s) => [svc, ...s]);
    setOrders((o) => [{
      id: ref, kind: "service", title: `Service Booking · ${req.type}`, art: "spare", amount: price - discount, date: todayLabel(),
      status: "Requested", serviceId: id, coupon: code ?? undefined, discount: discount || undefined,
    }, ...o]);
    notify({ kind: "service", title: `${req.type} booked`, body: `${req.date}, ${req.slot}. We'll assign a technician shortly.`, link: { k: "track", id } });
    setStack([{ k: "placed", ref, title: "Service Booked!", next: { k: "track", id } }]);

    // Demo: ops assigns a technician a few seconds later.
    setTimeout(() => {
      const tech = techById("t1")!;
      setServices((all) => all.map((s) => s.id !== id ? s : {
        ...s, current: 1,
        technician: { id: tech.id, name: tech.name, initials: tech.initials, rating: tech.rating, phone: tech.phone },
        timeline: s.timeline.map((st, i) => (i === 1 ? { ...st, at: `${todayLabel()}, ${nowTime()}` } : st)),
      }));
      setOrders((all) => all.map((o) => (o.serviceId === id ? { ...o, status: "In Progress" } : o)));
      // Hand the job to the technician's app (demo bridge between tabs).
      updateBridge((b) => ({
        ...b,
        jobs: [...b.jobs.filter((j) => j.id !== id), {
          id, techId: tech.id, customer: { name: user.name, phone: user.phone, address },
          type: req.type, product: req.product, date: req.date, slot: req.slot, issue: req.description || "No details given.", otp,
        }],
      }));
      notify({ kind: "service", title: "Technician assigned", body: `${tech.name} (★ ${tech.rating}) will visit on ${req.date}, ${req.slot}.`, link: { k: "track", id } });
    }, 5000);
  };

  const rateService = (id: string, rating: ServiceRating) => {
    const s = services.find((x) => x.id === id);
    setServices((all) => all.map((x) => x.id !== id ? x : {
      ...x, rating, timeline: x.timeline.map((st, i) => (i === 4 ? { ...st, at: `${todayLabel()}, ${nowTime()}` } : st)),
    }));
    // The rating also shows up on the technician's public profile.
    if (s?.technician) {
      const body = [rating.comment, rating.tags.length ? rating.tags.join(" · ") : ""].filter(Boolean).join(" — ");
      setReviews((r) => [{ id: `rv${Date.now()}`, techId: s.technician!.id, author: user.name, stars: rating.stars, body, date: todayLabel(), mine: true }, ...r]);
    }
    flash("Thanks for your feedback!");
  };

  const saveProductReview = (productId: string, stars: number, body: string) => {
    setReviews((all) => {
      const rest = all.filter((r) => !(r.mine && r.productId === productId));
      return [{ id: `rv${Date.now()}`, productId, author: user.name, stars, body, date: todayLabel(), mine: true }, ...rest];
    });
    back();
    flash("Review posted — thank you!");
  };

  const addMoney = (n: number) => {
    creditWallet("Added money", n);
    notify({ kind: "wallet", title: `${inr(n)} added to wallet`, body: `Your wallet balance is now ${inr(walletBalance + n)}.`, link: { k: "wallet" } });
    flash(`${inr(n)} added to your wallet`);
  };

  /** Demo: a referred friend completes a purchase. */
  const simulateReferral = () => {
    const names = ["Sneha P.", "Arjun M.", "Kavya R.", "Rahul T.", "Isha B."];
    const name = names[referrals.length % names.length];
    setReferrals((r) => [{ name, status: "Purchased", at: todayLabel() }, ...r]);
    creditWallet(`Referral bonus · ${name}`, REFERRAL_REWARD);
    notify({ kind: "wallet", title: `You earned ${inr(REFERRAL_REWARD)}!`, body: `${name} bought a Zavtoo purifier with your code.`, link: { k: "wallet" } });
    flash(`${inr(REFERRAL_REWARD)} referral bonus credited`);
  };

  const openNotif = (n: AppNotification) => {
    setNotifs((all) => all.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.link) push(n.link);
  };

  // A fresh session has fresh booking ids, so drop what an earlier session left on the bridge.
  useEffect(() => { updateBridge((b) => ({ ...b, jobs: [], trips: {} })); }, []);

  // Follow the technician's progress from their app: ride started → arrived → working → done.
  useEffect(() => {
    Object.values(bridge.trips).forEach((t) => {
      const s = services.find((x) => x.id === t.jobId);
      const key = `${t.jobId}:${t.status}`;
      if (!s || !s.technician || seenTrips.current.has(key)) return;
      seenTrips.current.add(key);
      const first = s.technician.name.split(" ")[0];
      const stamp = `${todayLabel()}, ${nowTime()}`;
      if (t.status === "On the way") {
        notify({ kind: "service", title: `${first} is on the way`, body: `Track live — about ${t.etaMin} min away.`, link: { k: "track", id: s.id } });
        flash(`${first} started the ride — track live`);
      } else if (t.status === "Arrived") {
        notify({ kind: "service", title: `${first} has arrived`, body: `Share your start code ${s.otp ?? ""} to begin the service.`, link: { k: "track", id: s.id } });
      } else if (t.status === "In Progress" && s.current < 2) {
        setServices((all) => all.map((x) => x.id !== s.id ? x : { ...x, current: 2, timeline: x.timeline.map((st, i) => (i === 2 ? { ...st, at: stamp } : st)) }));
      } else if (t.status === "Completed" && s.current < 3) {
        setServices((all) => all.map((x) => x.id !== s.id ? x : {
          ...x, current: 4, timeline: x.timeline.map((st, i) => ((i === 2 && !st.at) || i === 3 ? { ...st, at: stamp } : st)),
        }));
        setOrders((all) => all.map((o) => (o.serviceId === s.id ? { ...o, status: "Completed" } : o)));
        notify({ kind: "service", title: `${s.type} completed`, body: "How did it go? Rate your technician to help others.", link: { k: "track", id: s.id } });
      }
    });
    // notify/flash only append state; they don't need to retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge.trips, services]);

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
    if (cur >= 3) {
      setOrders((all) => all.map((o) => (o.serviceId === id ? { ...o, status: "Completed" } : o)));
      notify({ kind: "service", title: `${s.type} completed`, body: "How did it go? Rate your technician to help others.", link: { k: "track", id } });
    }
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

  const openProfileMenu = (key: ProfileKey) => {
    const direct: Partial<Record<ProfileKey, Detail>> = {
      edit: { k: "editProfile" }, orders: { k: "orders" }, wallet: { k: "wallet" }, offers: { k: "offers" },
      referral: { k: "referral" }, reviews: { k: "myReviews" }, addresses: { k: "addresses" }, notifications: { k: "notifications" },
    };
    push(direct[key] ?? { k: "info", key });
  };

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
                onToggleWish={() => setWish((w) => (w.includes(detail.id) ? w.filter((x) => x !== detail.id) : [...w, detail.id]))}
                reviews={reviews}
                onSeeReviews={() => push({ k: "reviews", productId: detail.id })}
                onWriteReview={() => push({ k: "writeReview", productId: detail.id })} />
            )}
            {detail?.k === "reviews" && (
              <AllReviewsPage productId={detail.productId} reviews={reviews} onBack={back} onWrite={() => push({ k: "writeReview", productId: detail.productId })} />
            )}
            {detail?.k === "writeReview" && (
              <WriteReviewPage key={detail.productId} productId={detail.productId} onBack={back}
                existing={reviews.find((r) => r.mine && r.productId === detail.productId)}
                onSubmit={(stars, body) => saveProductReview(detail.productId, stars, body)} />
            )}
            {detail?.k === "cart" && (
              <CartPage lines={cart} onBack={back} setQty={setQty} onCheckout={checkout} onShop={() => push({ k: "products" })}
                coupon={coupon} onCoupon={setCoupon} walletBalance={walletBalance} useWallet={useWallet} onUseWallet={setUseWallet}
                address={defaultAddress} onChangeAddress={() => push({ k: "addresses" })} userName={user.name} />
            )}
            {detail?.k === "placed" && (
              <OrderPlacedPage orderId={detail.ref} title={detail.title} onTrack={() => setStack([detail.next])} onHome={() => goTab("home")} />
            )}
            {detail?.k === "track" && (() => {
              const s = services.find((x) => x.id === detail.id);
              return s ? (
                <>
                  <TrackServicePage key={s.id} service={s} trip={bridge.trips[s.id]} onBack={back} onChat={() => push({ k: "chat" })}
                    onRate={(r) => rateService(s.id, r)} onOpenTech={(id) => push({ k: "tech", id })} />
                  {s.technician && s.current < 4 && (() => {
                    // Single-tab demo: stand in for what the technician does in their app.
                    const trip = bridge.trips[s.id];
                    const techId = s.technician.id;
                    const step = s.current !== 1 ? { label: "Demo: move to next step", run: () => advanceService(s.id) }
                      : !trip ? { label: "Demo: technician starts the ride", run: () => setTrip(s.id, { techId, status: "On the way", startedAt: Date.now() }) }
                      : trip.status === "On the way" ? { label: "Demo: technician arrives", run: () => setTrip(s.id, { techId, status: "Arrived" }) }
                      : { label: "Demo: start the job", run: () => setTrip(s.id, { techId, status: "In Progress" }) };
                    return (
                      <div style={{ padding: "0 16px 24px", textAlign: "center" }}>
                        <button onClick={step.run} style={{ background: "none", border: "1px dashed var(--line-strong)", borderRadius: 10, padding: "6px 12px", fontSize: 11.5, color: "var(--ink-mute)", cursor: "pointer" }}>
                          {step.label}
                        </button>
                        {s.current === 1 && <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--ink-mute)" }}>Or open /technician in another tab and run the job there.</p>}
                      </div>
                    );
                  })()}
                </>
              ) : null;
            })()}
            {detail?.k === "order" && (() => {
              const o = orders.find((x) => x.id === detail.id);
              return o ? <OrderDetailPage order={o} onBack={back} onHelp={() => push({ k: "chat" })} onReview={(pid) => push({ k: "writeReview", productId: pid })} /> : null;
            })()}
            {detail?.k === "tech" && (() => {
              const t = techById(detail.id);
              return t ? <TechnicianPage tech={t} reviews={reviews} onBack={back} onChat={() => push({ k: "chat" })} /> : null;
            })()}
            {detail?.k === "serviceInfo" && (
              <ServiceDetailPage type={detail.type} reviews={reviews} onBack={back} onBook={() => push({ k: "book", type: detail.type })} />
            )}
            {detail?.k === "myReviews" && (
              <MyReviewsPage reviews={reviews} services={services} onBack={back}
                onEditProduct={(pid) => push({ k: "writeReview", productId: pid })} onTrack={(id) => push({ k: "track", id })} />
            )}
            {detail?.k === "offers" && (
              <OffersPage onBack={back} onShop={() => push({ k: "products" })} onBook={() => goTab("service")} />
            )}
            {detail?.k === "wallet" && (
              <WalletPage balance={walletBalance} txns={wallet} onBack={back} onAddMoney={addMoney} onRefer={() => push({ k: "referral" })} />
            )}
            {detail?.k === "referral" && (
              <ReferralPage code={referralCode} referrals={referrals} onBack={back} onSimulate={simulateReferral} />
            )}
            {detail?.k === "notifications" && (
              <NotificationsPage items={notifs} prefs={notifPrefs} onBack={back} onOpen={openNotif} onPrefs={setNotifPrefs}
                onReadAll={() => setNotifs((all) => all.map((n) => ({ ...n, read: true })))} onClear={() => setNotifs([])} />
            )}
            {detail?.k === "editProfile" && (
              <EditProfilePage user={user} onBack={back} onSave={(u) => { setUser(u); back(); flash("Profile updated"); }} />
            )}
            {detail?.k === "addresses" && <AddressesPage addresses={addresses} onBack={back} onChange={setAddresses} />}
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
                unreadNotifs={unreadNotifs}
                onOpenNotifications={() => push({ k: "notifications" })}
                onOpenOffers={() => push({ k: "offers" })}
                onOpenService={(t) => push({ k: "serviceInfo", type: t })}
                onOpenServices={() => goTab("service")}
                onRefer={() => push({ k: "referral" })}
              />
            )}
            {!detail && tab === "orders" && <OrdersScreen orders={orders} onOpen={openOrder} />}
            {!detail && tab === "service" && (
              <ServicesHubScreen services={services} onOpen={(t) => push({ k: "serviceInfo", type: t })}
                onTrack={(id) => push({ k: "track", id })} onOpenTech={(id) => push({ k: "tech", id })} />
            )}
            {!detail && tab === "profile" && (
              <ProfileScreen
                user={user}
                stats={{ orders: orders.filter((o) => o.kind === "product").length, services: services.length, amcDays: 12 }}
                walletBalance={walletBalance}
                unreadNotifs={unreadNotifs}
                onMenu={openProfileMenu}
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
    case "payments":
      return (
        <InfoPage title="Payment Methods" onBack={onBack}>
          <div style={row}><CardIcon s={22} c="var(--blue)" /><div><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>UPI</p><p style={small}>alok@okaxis</p></div></div>
          <p style={{ ...small, textAlign: "center", padding: "0 20px" }}>Card details are stored by the payment gateway, never on Zavtoo servers.</p>
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
