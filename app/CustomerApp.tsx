"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { CustomerAuth } from "./components/Auth";
import { PrimaryButton, StatusBadge, card } from "./components/ui";
import { HELPLINES } from "./storefront/content";
import { ChevronRight, CardIcon, ShieldIcon } from "./components/icons";
import type { LivePoint } from "./components/LiveTracking";
import { friendly, roleOf, supabaseFor, useLive, useSession } from "./lib/supabase";
import { useCatalog } from "./lib/catalog";
import { removeRoPhotos, uploadRoPhoto, useSignedUrls } from "./lib/photos";
import {
  fmtDateOnly, requestAsOrder, toChat, toNotification, toOrder, toReview, toServiceRequest, toTxn,
  type DbOrder, type DbRequest, type DbReview,
} from "./lib/db";
import {
  SERVICE_CATALOG, inr, productById, techById,
  type Address, type AppNotification, type NotifPrefs, type Referral, type ServiceRating, type ServiceRequest, type ServiceType, type UserProfile,
} from "./lib/data";

const SHELL_MAX_W = 430;
const ONBOARDED_KEY = "osmo:onboarded";
const CART_KEY = "zavtoo:cart";
const sb = () => supabaseFor("customer");

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
const readCart = (): CartLine[] => {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((l) => typeof l?.id === "string" && Number.isInteger(l?.qty) && l.qty > 0 && l.qty <= 9) : [];
  } catch { return []; }
};

/* ───────────── Everything the signed-in customer sees ───────────── */

interface CustomerData {
  profile: { code: string; full_name: string; email: string | null; phone: string | null; gender: UserProfile["gender"]; dob: string | null; notif_prefs: NotifPrefs; blocked: boolean };
  addresses: Address[];
  orders: DbOrder[];
  requests: DbRequest[];
  notifications: AppNotification[];
  wallet: { id: string; title: string; amount: number; created_at: string }[];
  chat: { id: string; sender: "customer" | "agent"; body: string; image_path: string | null; created_at: string }[];
  reviews: DbReview[];
  referrals: Referral[];
}

async function loadCustomer(c: ReturnType<typeof sb>, uid: string): Promise<CustomerData> {
  const [profile, addresses, orders, requests, notifications, wallet, chat, reviews, referrals] = await Promise.all([
    c.from("profiles").select("code, full_name, email, phone, gender, dob, notif_prefs, blocked").eq("id", uid).single(),
    c.from("addresses").select("*").eq("user_id", uid).order("created_at"),
    c.from("orders").select("*").eq("customer_id", uid).order("created_at", { ascending: false }),
    c.from("service_requests").select("*").eq("customer_id", uid).order("created_at", { ascending: false }),
    c.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
    c.from("wallet_txns").select("id, title, amount, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
    c.from("chat_messages").select("id, sender, body, image_path, created_at").eq("customer_id", uid).order("created_at").limit(300),
    c.from("reviews").select("*").order("created_at", { ascending: false }).limit(500),
    c.rpc("my_referrals"),
  ]);
  const err = profile.error ?? addresses.error ?? orders.error ?? requests.error;
  if (err) throw err;
  return {
    profile: profile.data as CustomerData["profile"],
    addresses: (addresses.data ?? []).map((a) => ({ id: a.id, label: a.label, line: a.line, pincode: a.pincode, isDefault: a.is_default, lat: a.lat, lng: a.lng })),
    orders: (orders.data ?? []) as DbOrder[],
    requests: (requests.data ?? []) as DbRequest[],
    notifications: (notifications.data ?? []).map(toNotification),
    wallet: wallet.data ?? [],
    chat: chat.data ?? [],
    reviews: (reviews.data ?? []) as DbReview[],
    referrals: ((referrals.data ?? []) as { name: string; joined: string; rewarded: boolean }[])
      .map((r) => ({ name: r.name || "Friend", status: r.rewarded ? "Purchased" : "Joined", at: fmtDateOnly(r.joined) })),
  };
}

/** The assigned technician's live position — only readable while they're on the way. */
function useTechPosition(techId: string | null | undefined, riding: boolean): LivePoint | null {
  const [pos, setPos] = useState<LivePoint | null>(null);
  useEffect(() => {
    setPos(null);
    if (!techId || !riding) return;
    const client = sb();
    const set = (r: { lat: number; lng: number; updated_at: string } | null) => setPos(r ? { lat: r.lat, lng: r.lng, updatedAt: r.updated_at } : null);
    const fetchNow = () => client.from("tech_locations").select("lat, lng, updated_at").eq("tech_id", techId).maybeSingle().then(({ data }) => { if (data) set(data); });
    fetchNow();
    const ch = client.channel(`ride:${techId}:${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tech_locations", filter: `tech_id=eq.${techId}` },
        (e) => set(e.eventType === "DELETE" ? null : (e.new as { lat: number; lng: number; updated_at: string })))
      .subscribe();
    // Realtime can drop on weak networks; poll as a backup.
    const t = setInterval(fetchNow, 20000);
    return () => { client.removeChannel(ch); clearInterval(t); };
  }, [techId, riding]);
  return pos;
}

export default function CustomerApp() {
  const session = useSession("customer");
  const isCustomer = roleOf(session ?? null) === "customer";
  const uid = isCustomer ? session!.user.id : null;
  const catalog = useCatalog("customer", session === undefined ? undefined : uid);
  const live = useLive("customer", uid, (c) => loadCustomer(c, uid!), [
    { table: "profiles", filter: `id=eq.${uid}` }, { table: "addresses", filter: `user_id=eq.${uid}` },
    { table: "orders", filter: `customer_id=eq.${uid}` }, { table: "service_requests", filter: `customer_id=eq.${uid}` },
    { table: "notifications", filter: `user_id=eq.${uid}` }, { table: "wallet_txns", filter: `user_id=eq.${uid}` },
    { table: "chat_messages", filter: `customer_id=eq.${uid}` }, { table: "reviews" },
  ]);
  const data = live.data;

  const [stage, setStage] = useState<"splash" | "onboarding" | "app">("splash");
  const [tab, setTab] = useState<Tab>("home");
  const [stack, setStack] = useState<Detail[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wish, setWish] = useState<string[]>([]);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [seenChat, setSeenChat] = useState(0);
  const [otps, setOtps] = useState<Record<string, string>>({});
  const [referral, setReferral] = useState("");
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Returning users skip the Get Started tap; deep links jump straight in.
  useEffect(() => {
    setCart(readCart());
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^CUS-\d{6}$/i.test(ref)) setReferral(ref.toUpperCase());
    const screen = params.get("screen");
    const service = SERVICE_CATALOG.find((s) => s.type === params.get("service"));
    // Deep links from the website: /app?screen=cart | book&service=Repair | services | orders | chat
    if (screen && ["services", "chat", "cart", "book", "orders"].includes(screen)) {
      setStage("app");
      if (screen === "chat") setTab("chat");
      else if (screen === "orders") setTab("orders");
      else setTab(screen === "cart" ? "home" : "service");
      if (screen === "cart") setStack([{ k: "cart" }]);
      if (screen === "book" && service) setStack([{ k: "book", type: service.type }]);
      if (screen === "services" && service) setStack([{ k: "serviceInfo", type: service.type }]);
      return;
    }
    if (!readFlag()) return;
    const t = setTimeout(() => setStage("app"), 900);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* storage blocked */ } }, [cart]);
  // Staff accounts can't shop as customers here.
  useEffect(() => { if (session && !isCustomer) void sb().auth.signOut(); }, [session, isCustomer]);

  const detail = stack[stack.length - 1];
  const detailKey = detail ? JSON.stringify(detail) : tab;
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [detailKey]);

  const push = (d: Detail) => setStack((s) => [...s, d]);
  const back = () => setStack((s) => s.slice(0, -1));
  const goTab = (t: Tab) => { setStack([]); setTab(t); };
  const flash = (msg: string, bad = false) => {
    setToast({ msg, bad });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), bad ? 4500 : 1900);
  };
  const run = async (p: PromiseLike<{ error: unknown }>, ok?: string) => {
    const { error } = await p;
    if (error) { flash(friendly(error), true); return false; }
    if (ok) flash(ok);
    live.reload();
    return true;
  };

  /* ── Derived, live ── */
  const services = useMemo(() => (data?.requests ?? []).map(toServiceRequest),
    // Catalogue version matters: technician names/photos come from it.
    [data?.requests, catalog.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const orders = useMemo(() => [...(data?.orders ?? []).map(toOrder), ...(data?.requests ?? []).map(requestAsOrder)]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")), [data?.orders, data?.requests]);
  const reviews = useMemo(() => (data?.reviews ?? []).map((r) => toReview(r, uid ?? undefined)), [data?.reviews, uid]);
  const addresses = data?.addresses ?? [];
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const walletBalance = (data?.wallet ?? []).reduce((s, t) => s + t.amount, 0);
  const unreadNotifs = (data?.notifications ?? []).filter((n) => !n.read).length;
  const agentMsgs = (data?.chat ?? []).filter((m) => m.sender === "agent").length;
  const user: UserProfile = {
    id: data?.profile.code ?? "", uid: uid ?? undefined, name: data?.profile.full_name ?? "", email: data?.profile.email ?? session?.user.email ?? "",
    phone: data?.profile.phone ?? "", gender: data?.profile.gender ?? "", dob: data?.profile.dob ?? "",
  };
  // AMC lasts a year from a completed AMC visit.
  const amcUntil = Math.max(0, ...(data?.requests ?? []).filter((r) => r.type === "AMC" && r.status === "Completed" && r.completed_at)
    .map((r) => new Date(r.completed_at!).getTime() + 365 * 864e5));
  const amcDaysLeft = amcUntil > Date.now() ? Math.ceil((amcUntil - Date.now()) / 864e5) : null;

  const chatFull = (!detail && tab === "chat") || detail?.k === "chat";
  useEffect(() => { if (chatFull) setSeenChat(agentMsgs); }, [chatFull, agentMsgs]);
  const unreadChat = chatFull ? 0 : Math.max(0, agentMsgs - seenChat);

  // Start code and live position for the job on screen.
  const trackId = detail?.k === "track" ? detail.id : null;
  const tracked = services.find((s) => s.id === trackId);
  const riding = tracked ? tracked.status === "On the way" || tracked.status === "Arrived" : false;
  const position = useTechPosition(tracked?.technician?.id, riding);
  useEffect(() => {
    if (!tracked || otps[tracked.id] || tracked.current >= 2 || tracked.status === "Cancelled") return;
    sb().rpc("my_start_code", { p_request: tracked.id }).then(({ data: code }) => { if (code) setOtps((o) => ({ ...o, [tracked.id]: code as string })); });
  }, [tracked?.id, tracked?.current, tracked?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const photoUrls = useSignedUrls("customer", tracked?.photos);
  const chatImageUrls = useSignedUrls("customer", (data?.chat ?? []).map((m) => m.image_path).filter((p): p is string => !!p));

  /* ── Cart & checkout ── */
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const addToCart = (id: string, qty = 1) => {
    setCart((c) => {
      const hit = c.find((l) => l.id === id);
      return hit ? c.map((l) => (l.id === id ? { ...l, qty: Math.min(9, l.qty + qty) } : l)) : [...c, { id, qty }];
    });
    flash(`${productById(id)?.name ?? "Item"} added to cart`);
  };
  const setQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty } : l))));

  const checkout = async (pay: "online" | "cod", t: CheckoutTotals) => {
    if (!defaultAddress) { push({ k: "addresses" }); return; }
    // The server recomputes prices, stock, coupon and wallet — these totals are only a preview.
    const { data: order, error } = await sb().rpc("place_order", {
      p_items: cart.map((l) => ({ id: l.id, qty: l.qty })), p_coupon: t.coupon ?? "", p_use_wallet: useWallet,
      p_payment: pay === "cod" ? "COD" : "Online", p_address_id: defaultAddress.id,
    });
    if (error) { flash(friendly(error), true); return; }
    setCart([]); setCoupon(null); setUseWallet(false);
    live.reload();
    setStack([{ k: "placed", ref: order.ref, title: "Order Placed!", next: { k: "order", id: order.id } }]);
  };

  /* ── Service bookings ── */
  const bookService = async ({ coupon: code, address: where, techId: picked, photos, ...req }: BookingRequest) => {
    try {
      // Photos go to private storage first; the booking keeps their paths.
      const paths = await Promise.all(photos.map((p) => uploadRoPhoto("customer", p)));
      const { data: row, error } = await sb().rpc("book_service", {
        p_type: req.type, p_product: req.product, p_date: isoFromLabel(req.date), p_slot: req.slot, p_description: req.description,
        p_address_id: where.id, p_coupon: code ?? "", p_photos: paths, p_preferred_tech: picked,
      });
      if (error) { await removeRoPhotos("customer", paths); throw error; }
      live.reload();
      setStack([{ k: "placed", ref: row.ref, title: "Service Booked!", next: { k: "track", id: row.id } }]);
    } catch (e) {
      flash(friendly(e), true);
    }
  };

  /** RoPhotoPicker hands back display URLs: signed links for kept photos, data URLs for new ones. */
  const setServicePhotos = async (s: ServiceRequest, next: string[]) => {
    const current = s.photos ?? [];
    const byUrl = new Map(current.map((p) => [photoUrls[p], p]));
    try {
      const paths = await Promise.all(next.map((u) => (u.startsWith("data:") ? uploadRoPhoto("customer", u) : Promise.resolve(byUrl.get(u) ?? ""))));
      const keep = paths.filter(Boolean);
      if (await run(sb().rpc("set_request_photos", { p_request: s.id, p_photos: keep }), s.technician ? `${s.technician.name.split(" ")[0]} can see your photos` : "Photos saved")) {
        await removeRoPhotos("customer", current.filter((p) => !keep.includes(p)));
      }
    } catch (e) { flash(friendly(e), true); }
  };

  const rateService = (id: string, r: ServiceRating) =>
    run(sb().rpc("rate_service", { p_request: id, p_stars: r.stars, p_tags: r.tags, p_comment: r.comment }), "Thanks for your feedback!");

  const saveProductReview = async (productId: string, stars: number, body: string) => {
    const mine = reviews.find((r) => r.mine && r.productId === productId);
    const ok = await run(mine
      ? sb().from("reviews").update({ stars, body }).eq("id", mine.id)
      : sb().from("reviews").insert({ product_id: productId, stars, body, author_name: user.name || "Customer" }), "Review posted — thank you!");
    if (ok) back();
  };

  /* ── Account ── */
  const saveAddress = async (a: Address, isNew: boolean): Promise<boolean> => {
    const row = { label: a.label, line: a.line, pincode: a.pincode, is_default: a.isDefault, lat: a.lat ?? null, lng: a.lng ?? null };
    return run(isNew ? sb().from("addresses").insert(row) : sb().from("addresses").update(row).eq("id", a.id), "Address saved");
  };
  const addAddressInline = async (a: Address): Promise<Address | null> => {
    const { data: row, error } = await sb().from("addresses")
      .insert({ label: a.label, line: a.line, pincode: a.pincode, is_default: a.isDefault || !addresses.length, lat: a.lat ?? null, lng: a.lng ?? null })
      .select("*").single();
    if (error) { flash(friendly(error), true); return null; }
    live.reload();
    return { id: row.id, label: row.label, line: row.line, pincode: row.pincode, isDefault: row.is_default, lat: row.lat, lng: row.lng };
  };
  const deleteAddress = async (id: string) => {
    const wasDefault = addresses.find((a) => a.id === id)?.isDefault;
    if (await run(sb().from("addresses").delete().eq("id", id), "Address removed") && wasDefault) {
      const next = addresses.find((a) => a.id !== id);
      if (next) await sb().from("addresses").update({ is_default: true }).eq("id", next.id);
      live.reload();
    }
  };
  const makeDefault = (id: string) => void run(sb().from("addresses").update({ is_default: true }).eq("id", id), "Default address updated");
  const saveProfile = async (u: UserProfile) => {
    if (await run(sb().from("profiles").update({ full_name: u.name, phone: u.phone || null, gender: u.gender, dob: u.dob || null }).eq("id", uid!), "Profile updated")) back();
  };
  const setPrefs = (p: NotifPrefs) => void run(sb().from("profiles").update({ notif_prefs: p }).eq("id", uid!));
  const openNotif = (n: AppNotification) => {
    if (!n.read) void sb().from("notifications").update({ read: true }).eq("id", n.id).then(() => live.reload());
    if (n.link) push(n.link);
  };
  const sendChat = async (body: string, image?: string) => {
    try {
      const path = image ? await uploadRoPhoto("customer", image, "chat") : null;
      await run(sb().from("chat_messages").insert({ customer_id: uid, sender: "customer", body, image_path: path }));
    } catch (e) { flash(friendly(e), true); }
  };

  const openOrder = (o: { serviceId?: string; id: string }) => push(o.serviceId ? { k: "track", id: o.serviceId } : { k: "order", id: o.id });
  const openProfileMenu = (key: ProfileKey) => {
    const direct: Partial<Record<ProfileKey, Detail>> = {
      edit: { k: "editProfile" }, orders: { k: "orders" }, wallet: { k: "wallet" }, offers: { k: "offers" },
      referral: { k: "referral" }, reviews: { k: "myReviews" }, addresses: { k: "addresses" }, notifications: { k: "notifications" },
    };
    push(direct[key] ?? { k: "info", key });
  };
  const logout = async () => {
    setStack([]); setTab("home"); setCart([]); setOtps({});
    await sb().auth.signOut();
  };

  /* ── Screens ── */
  const showNav = stage === "app" && isCustomer && !!data && !data.profile.blocked && !detail;
  const frame = (children: React.ReactNode) => (
    // Pinned to the viewport so the page itself never scrolls — only the content area does.
    <div style={{ position: "fixed", inset: 0, background: "var(--app-bg)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: SHELL_MAX_W, height: "100%", position: "relative", background: "var(--app-bg)", overflow: "hidden", boxShadow: "var(--shadow-float)", display: "flex", flexDirection: "column" }}>
        {children}
        {showNav && <BottomNav active={tab} onChange={goTab} unreadChat={unreadChat} />}
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

  if (stage === "splash") return frame(<SplashScreen onStart={() => setStage(readFlag() ? "app" : "onboarding")} />);
  if (stage === "onboarding") return frame(<OnboardingScreen onDone={() => { writeFlag(true); setStage("app"); }} />);
  if (session === undefined) return frame(<Centered text="Loading…" />);
  if (!isCustomer) return frame(<CustomerAuth initialReferral={referral} />);
  if (!data) return frame(<Centered text={live.error ?? "Loading your account…"} onRetry={live.error ? live.reload : undefined} />);
  if (data.profile.blocked) return frame(<Centered text="Your account is on hold. Please call our account helpline at 89-290-290-06." onRetry={() => void logout()} retryLabel="Log out" />);

  const chatMessages = data.chat.map((m) => {
    const c = toChat(m, "customer");
    return { ...c, image: m.image_path ? chatImageUrls[m.image_path] : undefined };
  });
  const welcome = { id: "welcome", from: "agent" as const, body: `Hi ${user.name.split(" ")[0] || "there"}! Message us here — our support team replies during working hours.`, at: "" };

  return frame(chatFull ? (
    <div style={{ flex: 1, minHeight: 0, paddingBottom: showNav ? "calc(76px + env(safe-area-inset-bottom))" : undefined }}>
      <ChatScreen messages={[welcome, ...chatMessages]} typing={false} onSend={(b, img) => void sendChat(b, img)} onBack={detail ? back : undefined} />
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
      {detail?.k === "product" && productById(detail.id) && (
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
          onSubmit={(stars, body) => void saveProductReview(detail.productId, stars, body)} />
      )}
      {detail?.k === "cart" && (
        <CartPage lines={cart.filter((l) => productById(l.id))} onBack={back} setQty={setQty} onCheckout={(p, t) => void checkout(p, t)} onShop={() => push({ k: "products" })}
          coupon={coupon} onCoupon={setCoupon} walletBalance={walletBalance} useWallet={useWallet} onUseWallet={setUseWallet}
          address={defaultAddress} onChangeAddress={() => push({ k: "addresses" })} userName={user.name} />
      )}
      {detail?.k === "placed" && (
        <OrderPlacedPage orderId={detail.ref} title={detail.title} onTrack={() => setStack([detail.next])} onHome={() => goTab("home")} />
      )}
      {detail?.k === "track" && (tracked ? (
        <TrackServicePage key={tracked.id} service={tracked} position={position} otp={otps[tracked.id] ?? null}
          photoUrls={(tracked.photos ?? []).map((p) => photoUrls[p]).filter(Boolean)}
          onBack={back} onChat={() => push({ k: "chat" })}
          onRate={(r) => void rateService(tracked.id, r)} onOpenTech={(id) => push({ k: "tech", id })}
          onPhotos={(p) => void setServicePhotos(tracked, p)} />
      ) : <Centered text="Loading this booking…" />)}
      {detail?.k === "order" && (() => {
        const o = orders.find((x) => x.id === detail.id);
        return o ? <OrderDetailPage order={o} onBack={back} onHelp={() => push({ k: "chat" })} onReview={(pid) => push({ k: "writeReview", productId: pid })} /> : <Centered text="Loading this order…" />;
      })()}
      {detail?.k === "tech" && (() => {
        const t = techById(detail.id);
        return t ? <TechnicianPage tech={t} reviews={reviews} onBack={back} onChat={() => push({ k: "chat" })} /> : <Centered text="This technician isn't available." />;
      })()}
      {detail?.k === "serviceInfo" && (
        <ServiceDetailPage type={detail.type} reviews={reviews} onBack={back} onBook={() => push({ k: "book", type: detail.type })} />
      )}
      {detail?.k === "myReviews" && (
        <MyReviewsPage reviews={reviews} services={services} onBack={back}
          onEditProduct={(pid) => push({ k: "writeReview", productId: pid })} onTrack={(id) => push({ k: "track", id })} />
      )}
      {detail?.k === "offers" && <OffersPage onBack={back} onShop={() => push({ k: "products" })} onBook={() => goTab("service")} />}
      {detail?.k === "wallet" && (
        <WalletPage balance={walletBalance} txns={data.wallet.map(toTxn)} onBack={back} onRefer={() => push({ k: "referral" })} />
      )}
      {detail?.k === "referral" && <ReferralPage code={user.id} referrals={data.referrals} onBack={back} />}
      {detail?.k === "notifications" && (
        <NotificationsPage items={data.notifications} prefs={data.profile.notif_prefs} onBack={back} onOpen={openNotif} onPrefs={setPrefs}
          onReadAll={() => void run(sb().from("notifications").update({ read: true }).eq("user_id", uid!).eq("read", false))}
          onClear={() => void run(sb().from("notifications").delete().eq("user_id", uid!), "Notifications cleared")} />
      )}
      {detail?.k === "editProfile" && <EditProfilePage user={user} onBack={back} onSave={(u) => void saveProfile(u)} />}
      {detail?.k === "addresses" && (
        <AddressesPage addresses={addresses} onBack={back} onSave={saveAddress} onDelete={(id) => void deleteAddress(id)} onMakeDefault={makeDefault} />
      )}
      {detail?.k === "orders" && <OrdersScreen orders={orders} onBack={back} onOpen={openOrder} />}
      {detail?.k === "book" && (
        <BookServiceScreen key={detail.type} initialType={detail.type} onBack={back} onSubmit={(r) => void bookService(r)} addresses={addresses}
          onAddAddress={addAddressInline} />
      )}
      {detail?.k === "info" && (
        <ProfileInfo which={detail.key} onBack={back} services={services} amcDaysLeft={amcDaysLeft}
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
          amcDaysLeft={amcDaysLeft}
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
          stats={{ orders: data.orders.length, services: services.length, amcDays: amcDaysLeft }}
          walletBalance={walletBalance}
          unreadNotifs={unreadNotifs}
          onMenu={openProfileMenu}
          onLogout={() => void logout()}
        />
      )}
    </div>
  ));
}

/** "03 Oct 2026" (what the booking form produces) → "2026-10-03". */
function isoFromLabel(label: string) {
  const d = new Date(`${label} 12:00:00`);
  if (Number.isNaN(d.getTime())) return label;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Centered({ text, onRetry, retryLabel = "Try again" }: { text: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>{text}</p>
      {onRetry && <button onClick={onRetry} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{retryLabel}</button>}
    </div>
  );
}

/* Profile-menu pages that don't need a screen of their own yet. */
function ProfileInfo({ which, onBack, services, amcDaysLeft, onTrack, onRenew }: {
  which: ProfileKey; onBack: () => void; services: ServiceRequest[]; amcDaysLeft: number | null; onTrack: (id: string) => void; onRenew: () => void;
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
                <p style={small}>#{s.ref} · {s.date}</p>
              </div>
              <StatusBadge status={s.status === "Completed" ? "Completed" : s.status === "Cancelled" ? "Cancelled" : s.status === "Rescheduled" ? "Rescheduled" : s.current === 0 ? "Requested" : "In Progress"} />
              <ChevronRight s={16} c="var(--ink-mute)" />
            </button>
          ))}
          {services.length === 0 && <p style={{ ...small, textAlign: "center", padding: 24 }}>No service visits yet.</p>}
        </InfoPage>
      );
    case "amc": {
      const last = services.filter((s) => s.type === "AMC" && s.status === "Completed")[0];
      return (
        <InfoPage title="AMC Plans" onBack={onBack}>
          {amcDaysLeft != null ? (
            <div style={{ borderRadius: 20, padding: 18, background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", color: "white", boxShadow: "0 10px 28px rgba(11,92,255,0.28)" }}>
              <span style={{ background: "var(--gold)", color: "var(--blue-dark)", fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>ACTIVE</span>
              <p style={{ margin: "12px 0 2px", fontSize: 17, fontWeight: 700 }}>{last?.product ?? "Your purifier"}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.75)" }}>Started {last?.timeline[3]?.at?.split(",")[0] ?? "—"}</p>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.2)", margin: "14px 0 6px" }}>
                <div style={{ width: `${Math.min(100, Math.max(4, (amcDaysLeft / 365) * 100))}%`, height: "100%", borderRadius: 3, background: "var(--gold)" }} />
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{amcDaysLeft} days left</p>
            </div>
          ) : (
            <div style={{ ...card, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>No active AMC</p>
              <p style={small}>A year of cover: 3 preventive visits, 2 filter sets and priority repairs.</p>
            </div>
          )}
          <PrimaryButton tone="gold" onClick={onRenew}>{amcDaysLeft != null ? "Renew" : "Get AMC"} · {inr(SERVICE_CATALOG.find((s) => s.type === "AMC")?.price ?? 1999)}</PrimaryButton>
        </InfoPage>
      );
    }
    case "payments":
      return (
        <InfoPage title="Payment Methods" onBack={onBack}>
          <div style={row}><CardIcon s={22} c="var(--blue)" /><div><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Pay at checkout</p><p style={small}>Choose online payment or cash on delivery for each order. Service visits are paid to the technician by UPI or cash.</p></div></div>
          <p style={{ ...small, textAlign: "center", padding: "0 20px" }}>We never store card details on Zavtoo servers.</p>
        </InfoPage>
      );
    case "help":
      return (
        <InfoPage title="Help & Support" onBack={onBack}>
          {[["How often should I change filters?", "Every 6–9 months, depending on your water TDS and usage."], ["How much is installation?", "New RO installation is ₹399 — it includes a free site inspection, pipeline setup, a full demo and post-installation support."], ["What does AMC cover?", "Silver ₹999/yr: 2 visits. Gold ₹1,799/yr: 4 visits, free filters, deep cleaning, 20% off parts. Platinum ₹2,999/yr: 6 visits, all parts free, 30% off parts."], ["Is there a warranty on service?", "Yes — every repair and maintenance service has a 90-day warranty. If the same issue comes back, we fix it free."], ["How do I send a photo of my RO?", "While booking: Service → pick a service → 'Photos of your RO'. After booking: open the job in My Orders → Track Service → 'Add photo'. Or tap 📎 in Chat to send one to support."]].map(([q, a]) => (
            <div key={q} style={{ ...card, padding: 14 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{q}</p><p style={small}>{a}</p></div>
          ))}
          {HELPLINES.filter((h) => h.label !== "Technician help").map((h) => (
            <a key={h.label} href={h.href} style={{ ...row, textDecoration: "none", color: "var(--ink)" }}>
              <ShieldIcon s={22} c="var(--blue)" /><span style={{ fontSize: 14, fontWeight: 600 }}>{h.label}: {h.number} <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(8 AM – 8 PM)</span></span>
            </a>
          ))}
          <a href="https://wa.me/918929454647" target="_blank" rel="noopener noreferrer" style={{ ...row, textDecoration: "none", color: "var(--ink)" }}>
            <ShieldIcon s={22} c="var(--blue)" /><span style={{ fontSize: 14, fontWeight: 600 }}>WhatsApp 89-294-546-47 (24/7)</span>
          </a>
        </InfoPage>
      );
    case "about":
    default:
      return (
        <InfoPage title="About Us" onBack={onBack}>
          <div style={{ ...card, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Zavtoo Paani Filter Pvt Ltd</p>
            <p style={small}>India&apos;s trusted name in RO water purifier sales, service and spare parts since 2004 — 20+ years, 50,000+ happy customers, 500+ genuine parts and pan-India delivery. Any brand, any model, anywhere.</p>
            <p style={small}>K-15, Raja Puri, Dwarka Road, New Delhi – 110059 · Mon–Sun 8 AM – 8 PM · Paanifilter9@gmail.com</p>
          </div>
        </InfoPage>
      );
  }
}
