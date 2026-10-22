"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import PurifierArt from "../components/PurifierArt";
import ProductImage, { ProductGallery } from "../components/ProductImage";
import { BrandMark, Wordmark } from "../components/Brand";
import { BagIcon, BoxIcon, CartIcon, CheckIcon, ChevronDown, ChevronRight, CloseIcon, DropIcon, HeartIcon, MinusIcon, PhoneIcon, PinIcon, PlusIcon, SearchIcon, ShieldIcon, StarIcon, StoreIcon, TechnicianIcon, WrenchIcon } from "../components/icons";
import { PRODUCTS, PIN_AREAS, SERVICE_CATALOG, SITE_IMAGES, couponByCode, couponDiscount, couponError, inr, type Product, type ServiceOffering } from "../lib/data";
import { useCatalog } from "../lib/catalog";
import { Advantages, AboutPage, Brands, ContactPage, HomeServices, HowItWorks, PartsShowcase, PolicyPage, ServicesPage, StartToday, Testimonials, WhatsAppFab } from "./InfoPages";
import { COMPANY, HELPLINES } from "./content";
import { PRIVACY, TERMS } from "./policies";
import s from "./storefront.module.css";
import n from "./neo.module.css";
import ServiceBooking, { ServiceBookings } from "./ServiceBooking";
import PurifierShowcase from "./PurifierShowcase";

type View = "home" | "shop" | "product" | "cart" | "checkout" | "orders" | "services" | "booking" | "about" | "contact" | "privacy" | "terms";
const INFO_VIEWS: View[] = ["services", "about", "contact", "privacy", "terms"];
const VIEW_LABEL: Partial<Record<View, string>> = { services: "Services", about: "About us", contact: "Contact us", privacy: "Privacy policy", terms: "Terms & conditions" };
type Line = { id: string; qty: number };
type Receipt = { id: string; date: string; total: number; lines: Line[] };
type Saved = { cart: Line[]; wish: string[]; orders: Receipt[]; coupon: string };
const KEY = "zavtoo:storefront:v1";
const empty: Saved = { cart: [], wish: [], orders: [], coupon: "" };
const categories = [{ id: "all", title: "All products" }, { id: "domestic", title: "Home purifiers" }, { id: "commercial", title: "Commercial RO" }, { id: "spare", title: "Filters & spares" }];

function validLines(value: unknown): Line[] {
  if (!Array.isArray(value)) return [];
  return value.filter((l): l is Line => !!l && typeof l === "object" && PRODUCTS.some(p => p.id === l.id) && Number.isInteger(l.qty) && l.qty > 0 && l.qty <= 9);
}
function readSaved(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!v || typeof v !== "object") return empty;
    return { cart: validLines(v.cart), wish: Array.isArray(v.wish) ? v.wish.filter((id: unknown) => PRODUCTS.some(p => p.id === id)) : [], coupon: typeof v.coupon === "string" ? v.coupon : "", orders: Array.isArray(v.orders) ? v.orders.filter((o: Receipt) => o && typeof o.id === "string" && typeof o.date === "string" && Number.isFinite(o.total) && Array.isArray(o.lines)).map((o: Receipt) => ({ ...o, lines: validLines(o.lines) })) : [] };
  } catch { return empty; }
}
const BADGES: Record<string, string> = {
  pro: "Best Seller", "membrane-75": "Best Seller", "sediment-5": "New Arrival", "cto-carbon": "Top Rated", "service-kit-7": "Combo Deal", "valve-kit": "Hot Deal",
};
const PhoneOutline = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18.2h2" /></svg>;
const sale = (p: Product) => Math.round((1 - p.price / p.mrp) * 100);
const CATEGORY_HINT: Record<Product["category"], string> = { domestic: "Home purifier", commercial: "Commercial RO", spare: "Genuine spare" };
const FAQS = [["Which brands do you service?", "All major brands — Kent RO, Aquaguard, Pureit, LG Puricare, Livpure, A.O. Smith, Eureka Forbes, HUL, Havells, Blue Star, Whirlpool and more. Our spare parts are compatible across brands too."], ["How quickly can a technician reach me?", "Usually within 2–4 hours of booking, with same-day service available. You get the technician's details once your booking is confirmed."], ["What does an AMC plan include?", "2 to 6 service visits a year, free filter & membrane replacements, priority technician dispatch, up to 30% off spare parts, 24/7 WhatsApp support and an annual water test. Plans: Silver ₹999, Gold ₹1,799 and Platinum ₹2,999 per year."], ["Do you deliver spare parts across India?", "Yes. We stock 500+ genuine RO parts and ship them pan India in secure packaging."], ["How do I place an order?", "Add products to your cart and tap Continue to checkout. You'll finish in the Zavtoo app — log in or sign up, pick your address, and pay online or on delivery."]] as const;

/** Five stars, filled up to the rounded rating. */
function Stars({ rating, reviews }: { rating: number; reviews: number }) {
  const full = Math.round(rating);
  return <div className={n.stars} aria-label={reviews ? `Rated ${rating} out of 5 from ${reviews} reviews` : "New, no reviews yet"}>
    <span aria-hidden="true">{"★".repeat(full)}<i>{"★".repeat(5 - full)}</i></span>
    <span>{reviews ? <>{rating} ({reviews})</> : "New"}</span>
  </div>;
}

/** Horizontal, swipeable product row with previous / next buttons. */
function Rail({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const step = (dir: number) => { const el = ref.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" }); };
  return <div className={n.railWrap}>
    <div ref={ref} className={n.rail} role="list" aria-label={label}>{children}</div>
    <div className={n.railNav}>
      <button type="button" aria-label={`Previous ${label}`} onClick={() => step(-1)}><span style={{ display: "grid", transform: "rotate(180deg)" }}><ChevronRight s={20} /></span></button>
      <button type="button" aria-label={`More ${label}`} onClick={() => step(1)}><ChevronRight s={20} /></button>
    </div>
  </div>;
}

export default function Storefront({ view, product: initialProduct, filters, service }: { view: View; product?: Product; service?: ServiceOffering; filters?: { category?: string; q?: string; saved?: string } }) {
  const [saved, setSaved] = useState<Saved>(empty);
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState(filters?.q || "");
  const [category, setCategory] = useState(filters?.category || "all");
  const [sort, setSort] = useState("featured");
  const [onlySaved, setOnlySaved] = useState(filters?.saved === "1");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [code, setCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [pin, setPin] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [placed, setPlaced] = useState<Receipt | null>(null);
  const submitting = useRef(false);
  // Live prices, stock and product photos replace the built-in catalogue once loaded.
  useCatalog("store", null);
  const product = initialProduct && (PRODUCTS.find((p) => p.id === initialProduct.id) ?? initialProduct);

  useEffect(() => {
    setSaved(readSaved()); setReady(true);
    const sync = (e: StorageEvent) => { if (e.key === KEY) setSaved(readSaved()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    setQuery(filters?.q || "");
    setCategory(categories.some(c => c.id === filters?.category) ? filters!.category! : "all");
    setOnlySaved(filters?.saved === "1");
  }, [filters?.q, filters?.category, filters?.saved]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);
  function save(next: Saved) {
    setSaved(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { setStorageError("Your browser cannot save this basket. Enable browser storage before continuing to checkout."); }
  }
  function add(p: Product) {
    const existing = saved.cart.find(l => l.id === p.id);
    if (existing?.qty === 9) { setNotice("You can add up to 9 of each product."); return; }
    save({ ...saved, cart: existing ? saved.cart.map(l => l.id === p.id ? { ...l, qty: l.qty + 1 } : l) : [...saved.cart, { id: p.id, qty: 1 }] });
    setNotice(`${p.name} added to your cart`);
  }
  function quantity(id: string, qty: number) { save({ ...saved, cart: qty < 1 ? saved.cart.filter(l => l.id !== id) : saved.cart.map(l => l.id === id ? { ...l, qty: Math.min(9, qty) } : l) }); }
  function wish(id: string) { save({ ...saved, wish: saved.wish.includes(id) ? saved.wish.filter(x => x !== id) : [...saved.wish, id] }); }
  const count = saved.cart.reduce((n, l) => n + l.qty, 0);
  const subtotal = saved.cart.reduce((n, l) => n + PRODUCTS.find(p => p.id === l.id)!.price * l.qty, 0);
  const coupon = couponByCode(saved.coupon);
  function discountError() {
    if (!coupon) return "Coupon not found.";
    const expiry = new Date(`${coupon.expires} 23:59:59 GMT+0530`).getTime();
    if (!Number.isFinite(expiry) || expiry < Date.now()) return "This coupon has expired.";
    if (coupon.code === "FILTER150" && saved.cart.some(l => PRODUCTS.find(p => p.id === l.id)?.category !== "spare")) return "FILTER150 is for filters and spares only.";
    if (coupon.code === "PURE10" && saved.cart.some(l => PRODUCTS.find(p => p.id === l.id)?.category === "spare")) return "PURE10 is for purifier orders only.";
    return couponError(coupon, subtotal, "product");
  }
  const discount = coupon && !discountError() ? couponDiscount(coupon, subtotal) : 0;
  const total = subtotal - discount;
  const filtered = PRODUCTS.filter(p => (category === "all" || p.category === category) && (!onlySaved || saved.wish.includes(p.id)) && `${p.name} ${p.spec} ${p.description}`.toLowerCase().includes(query.toLowerCase().trim())).sort((a, b) => sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : sort === "rating" ? b.rating - a.rating : 0);
  function browseFilter(cat: string) {
    setCategory(cat);
    const params = new URLSearchParams(window.location.search);
    if (cat === "all") params.delete("category"); else params.set("category", cat);
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }
  function applyCoupon(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const c = couponByCode(code);
    if (!c) { setCouponMessage("That code wasn't found. Try PURE10 or ZAVTOO5."); return; }
    const err = couponError(c, subtotal, "product");
    if (err) { setCouponMessage(err); return; }
    save({ ...saved, coupon: c.code }); setCouponMessage(""); setCode("");
  }
  function placeOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current || !saved.cart.length) return;
    const form = new FormData(e.currentTarget);
    if (!PIN_AREAS[String(form.get("pincode"))]) { setPinMessage("Technician visits aren't available at this pincode yet — spare parts still ship pan India. Call 89-294-546-47 to check."); return; }
    submitting.current = true;
    const receipt: Receipt = { id: `WEB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, date: new Date().toISOString(), total, lines: saved.cart };
    const next = { ...saved, cart: [], coupon: "", orders: [receipt, ...saved.orders] };
    try { localStorage.setItem(KEY, JSON.stringify(next)); setSaved(next); setPlaced(receipt); window.scrollTo({ top: 0 }); }
    catch { setStorageError("Your browser could not save this demo order. Please enable browser storage and try again."); }
    submitting.current = false;
  }
  function renderProductCard({ p }: { p: Product }) {
    const saved_ = saved.wish.includes(p.id);
    return <article className={n.card} key={p.id} role="listitem">
      <div className={n.media}>
        {BADGES[p.id] ? <span className={n.badge}>{BADGES[p.id]}</span> : sale(p) > 0 && <span className={`${n.badge} ${n.badgeSoft}`}>{sale(p)}% off</span>}
        <button className={n.heart} aria-label={`${saved_ ? "Unsave" : "Save"} ${p.name}`} aria-pressed={saved_} onClick={() => wish(p.id)} disabled={!ready}><HeartIcon filled={saved_} s={18} /></button>
        <Link href={`/products/${p.id}`} aria-label={`View ${p.name}`}><ProductImage product={p} size={220} /></Link>
      </div>
      <div className={n.body}>
        <Link href={`/products/${p.id}`} className={n.name}>{p.name}</Link>
        <Stars rating={p.rating} reviews={p.reviews} />
        <div className={n.priceRow}><strong>{inr(p.price)}</strong>{p.mrp > p.price && <><del>{inr(p.mrp)}</del><span className={n.save}>Save {inr(p.mrp - p.price)}</span></>}</div>
        <p className={n.hint}>{CATEGORY_HINT[p.category]} · {p.spec}</p>
        {p.category === "commercial"
          ? <a className={`${n.add} ${n.quote}`} href={`https://wa.me/918929454647?text=${encodeURIComponent(`Hi Paani Filter, please share a quote for ${p.name}.`)}`} target="_blank" rel="noopener noreferrer">Get a quote</a>
          : <button className={n.add} onClick={() => add(p)} disabled={!ready}><CartIcon s={18} /> Add to cart</button>}
      </div>
    </article>;
  }
  // Homepage rails: purifiers first, then the spares people reorder most.
  const bestSellers = [...PRODUCTS.filter(p => p.category !== "spare"), ...PRODUCTS.filter(p => BADGES[p.id] && p.category === "spare")];
  const spares = PRODUCTS.filter(p => p.category === "spare");
  const bestDeal = Math.max(0, ...PRODUCTS.map(sale));
  const from = (cat: Product["category"]) => Math.min(...PRODUCTS.filter(p => p.category === cat).map(p => p.price));
  const serviceFrom = Math.min(...SERVICE_CATALOG.map(sv => sv.price).filter(v => v > 0));
  function renderSummary({ checkout = false }: { checkout?: boolean }) {
    return <aside className={s.summary}><h2>Order summary</h2><div><span>Subtotal ({count} {count === 1 ? "item" : "items"})</span><strong>{inr(subtotal)}</strong></div><div><span>Delivery</span><span className={s.green}>Included</span></div>{discount > 0 && <div><span>Coupon savings</span><span className={s.green}>−{inr(discount)}</span></div>}
      <form className={s.couponForm} onSubmit={applyCoupon}><input aria-label="Coupon code" placeholder="Enter coupon code" value={code} onChange={e => setCode(e.target.value)} /><button type="submit">Apply</button></form>
      {couponMessage && <p role="status" className={s.formNote}>{couponMessage}</p>}
      {saved.coupon && <p className={s.formNote}>{discountError() || `${saved.coupon} applied`} <button onClick={() => save({ ...saved, coupon: "" })}>Remove</button></p>}
      <div className={s.total}><span>Total</span><strong>{inr(total)}</strong></div><p className={s.formNote}>All prices include taxes.</p>
      {!checkout && <Link className={s.primary} href="/checkout">Continue to checkout</Link>}
      <p className={s.demoNote}><ShieldIcon s={18} /> Final prices, coupons and stock are confirmed at checkout</p>
    </aside>;
  }
  const title = view === "shop" ? onlySaved ? "Your saved favourites." : "Find your everyday pure." : view === "cart" ? "Your shopping cart." : view === "orders" ? "Your orders." : view === "services" ? "Care that keeps water pure." : "One step closer to pure water.";

  const nav = [
    { href: "/shop?category=domestic", label: "Water purifiers", on: view === "shop" && category === "domestic" },
    { href: "/shop?category=commercial", label: "Commercial RO", on: view === "shop" && category === "commercial" },
    { href: "/shop?category=spare", label: "Filters & spares", on: view === "shop" && category === "spare" },
    { href: "/services", label: "Service & AMC", on: view === "services" || view === "booking" },
    { href: "/about-us", label: "About", on: view === "about" },
  ];
  const cartLabel = `Cart, ${count} ${count === 1 ? "item" : "items"}`;

  return <div className={`${s.site} ${n.site}`}>
    <a className={s.skip} href="#main">Skip to content</a>
    <div className={n.promo}>{COMPANY.offer.text}<b>{COMPANY.offer.code}</b></div>
    <div className={n.util}><div className={n.wide}>
      <nav aria-label="Apps"><Link href="/app"><PhoneOutline /> Customer app</Link><Link href="/technician"><TechnicianIcon s={16} /> Technician app</Link><Link href="/dealer"><StoreIcon s={16} /> Dealer app</Link></nav>
      <strong>Pure water · Pure life · Since 2004</strong>
      <nav aria-label="Help"><Link href="/orders">Track order</Link><Link href="/contact-us">Help</Link><a href={COMPANY.phoneHref}><PhoneIcon s={14} /> {COMPANY.phone}</a></nav>
    </div></div>
    <header className={n.header}><div className={`${n.wide} ${n.headerRow}`}>
      <button className={n.burger} aria-expanded={menu} aria-controls="store-drawer" aria-label="Open menu" onClick={() => setMenu(true)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" /></svg></button>
      <Link className={n.logo} href="/" aria-label="Zavtoo home"><BrandMark size={42} /><Wordmark size={19} tagSpacing="0.22em" /></Link>
      <nav className={n.menu} aria-label="Main navigation">{nav.map(l => <Link key={l.href} href={l.href} aria-current={l.on ? "page" : undefined}>{l.label}</Link>)}<Link href="/services#amc" className={n.hot}>AMC offers</Link></nav>
      <form className={n.search} action="/shop" role="search"><SearchIcon s={18} /><input name="q" type="search" enterKeyHint="search" aria-label="Search products" placeholder="Search products" defaultValue={query} key={query} /></form>
      <div className={n.actions}>
        <Link href="/app" className={n.action} aria-label="Account"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></svg><span>Account</span></Link>
        <Link href="/shop?saved=1" className={`${n.action} ${n.optional}`} aria-label="Wishlist"><HeartIcon s={22} /><span>Wishlist</span></Link>
        <Link href="/cart" className={n.action} aria-label={cartLabel}><CartIcon s={22} /><span>Cart</span>{count > 0 && <b className={n.count}>{count}</b>}</Link>
      </div>
    </div></header>
    <div id="store-drawer" className={n.drawer} hidden={!menu} onClick={e => { if (e.target === e.currentTarget) setMenu(false); }}>
      <nav aria-label="Menu">
        <div><Link href="/" className={n.logo} onClick={() => setMenu(false)}><BrandMark size={36} /><Wordmark size={17} /></Link><button aria-label="Close menu" onClick={() => setMenu(false)}><CloseIcon s={22} /></button></div>
        <Link href="/" aria-current={view === "home" ? "page" : undefined} onClick={() => setMenu(false)}>Home</Link>
        {nav.map(l => <Link key={l.href} href={l.href} aria-current={l.on ? "page" : undefined} onClick={() => setMenu(false)}>{l.label}</Link>)}
        <Link href="/orders" onClick={() => setMenu(false)}>Track order</Link>
        <Link href="/shop?saved=1" onClick={() => setMenu(false)}>Wishlist</Link>
        <Link href="/contact-us" aria-current={view === "contact" ? "page" : undefined} onClick={() => setMenu(false)}>Contact us</Link>
        <Link href="/app" onClick={() => setMenu(false)}>Open customer app</Link>
        <a href={COMPANY.phoneHref}>Call {COMPANY.phone}</a>
      </nav>
    </div>
    {storageError && <p role="alert" className={`${n.wrap} ${s.warning}`}>{storageError}</p>}
    <main id="main">
      {view === "home" ? <>
        <div className={n.wide}>
          <section className={n.hero} aria-labelledby="hero-title">
            <nav className={n.segments} aria-label="Shop by">
              <Link href="/shop?category=domestic" className={n.segOn}>Purifiers</Link>
              <Link href="/shop?category=spare">Spare parts</Link>
              <Link href="/services"><small>{COMPANY.offer.code} · 30% off</small>Service</Link>
            </nav>
            <div className={n.heroGrid}>
              <Link href="/shop?category=domestic" className={n.heroPhoto} aria-label="Shop water purifiers">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {SITE_IMAGES.hero.images[0] && <img src={SITE_IMAGES.hero.images[0]} alt={SITE_IMAGES.hero.captions[0] || "Zavtoo water purifier"} fetchPriority="high" />}
                <span><DropIcon s={16} /> RO + UV + UF purification</span>
              </Link>
              <i className={n.heroRule} aria-hidden="true" />
              <div className={n.heroCopy}>
                <span className={n.live}>Pure water. Better living.</span>
                <h1 id="hero-title" className={n.display}>Pure water,<br />a better everyday</h1>
                {bestDeal > 0 && <div className={`${n.offerBox} ${n.display}`}><span>Up to</span><strong>{bestDeal}%</strong><span>off</span></div>}
                <div className={n.heroButtons}>
                  <Link className={n.btnCta} href="/shop">Shop all products <ChevronRight s={18} /></Link>
                  <Link className={n.btnDark} href="/services"><WrenchIcon s={18} /> Book a service</Link>
                </div>
              </div>
            </div>
          </section>
          <section className={n.trust} aria-label="Why families choose Zavtoo">
            <h2 className={n.display}>Loved by <em>50,000+</em> families</h2>
            {([[ShieldIcon, "20+ years of expertise", "Trusted for pure water since 2004"], [WrenchIcon, "Technician in 2–4 hours", "Same-day RO service at your door"], [BoxIcon, "500+ genuine parts", "For every major brand, shipped pan India"], [StarIcon, "Rated 4.9 by customers", "Real reviews from verified buyers"]] as const).map(([Icon, title, detail]) => (
              <div key={title}><Icon s={24} /><span><strong>{title}</strong><small>{detail}</small></span></div>
            ))}
          </section>
        </div>

        <section className={`${n.band} ${n.bandBrand}`} aria-labelledby="best-title">
          <div className={n.wrap}>
            <div className={n.head}><h2 id="best-title" className={n.display}>Best sellers</h2><p>The purifiers and spares our customers come back for.</p></div>
            <Rail label="best sellers">{bestSellers.map(p => renderProductCard({ p }))}</Rail>
            <div className={n.more}><Link className={n.btnGhost} href="/shop">View all products <ChevronRight s={18} /></Link></div>
          </div>
        </section>

        <section className={n.band} aria-labelledby="cat-title">
          <div className={n.wrap}>
            <div className={n.head}><h2 id="cat-title" className={n.display}>Find what you need</h2><p>Purifiers, parts and service for every brand.</p></div>
            <div className={n.tiles}>
              {[
                { href: "/shop?category=domestic", title: "Home RO", price: from("domestic"), photo: SITE_IMAGES["tile-domestic"].images[0], art: "classic" as const },
                { href: "/shop?category=commercial", title: "Commercial", price: from("commercial"), photo: SITE_IMAGES["tile-commercial"].images[0], art: "commercial" as const },
                { href: "/shop?category=spare", title: "Spare parts", price: from("spare"), photo: SITE_IMAGES["tile-spare"].images[0], art: "cartridge" as const },
                { href: "/services", title: "Service & AMC", price: serviceFrom, photo: SITE_IMAGES["tile-service"].images[0], art: "spare" as const },
              ].map(t => <Link key={t.href} href={t.href} className={n.tile}>
                <h3 className={n.display}>{t.title}</h3>
                {Number.isFinite(t.price) && <p>Starting at {inr(t.price)}</p>}
                <i aria-hidden="true"><ChevronRight s={18} /></i>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className={n.tileArt}>{t.photo ? <img src={t.photo} alt="" loading="lazy" /> : <PurifierArt kind={t.art} size={150} />}</div>
              </Link>)}
            </div>
          </div>
        </section>

        <div className={n.wrap}><PurifierShowcase /></div>

        {spares.length > 0 && <section className={`${n.band} ${n.bandSand}`} aria-labelledby="spares-title">
          <div className={n.wrap}>
            <div className={n.head}><h2 id="spares-title" className={n.display}>Filters & spares</h2><p>Genuine parts that fit Kent, Aquaguard, Pureit, Livpure and more.</p></div>
            <Rail label="filters and spares">{spares.map(p => renderProductCard({ p }))}</Rail>
            <div className={n.more}><Link className={n.btnLight} href="/shop?category=spare">Shop all spares <ChevronRight s={18} /></Link></div>
          </div>
        </section>}

        <div className={n.wrap}><HomeServices /></div>
        <div className={n.bandMist}><div className={n.wrap}><Advantages /></div></div>
        <div className={n.wrap}><HowItWorks /><Testimonials /></div>
        <div className={n.bandMint}><div className={n.wrap}><StartToday /></div></div>
        <div className={n.wrap}><Brands /></div>
        <section className={`${n.wrap} ${n.band} ${n.faq}`} aria-labelledby="faq-title">
          <div className={n.head}><h2 id="faq-title" className={n.display}>Questions? Answered.</h2><p>Still unsure? Call or WhatsApp us on {COMPANY.phone}.</p></div>
          <div>{FAQS.map(([q, a]) => <details key={q}><summary>{q}<PlusIcon s={18} /></summary><p>{a}</p></details>)}</div>
        </section>
      </> : <div className={`${n.wrap} ${s.innerPage}`}>
        <div className={s.breadcrumb}><Link href="/">Home</Link><span>/</span>{view === "product" ? <><Link href="/shop">Shop</Link><span>/</span>{product?.name}</> : <span>{view === "shop" ? "Shop" : VIEW_LABEL[view] ?? view[0].toUpperCase() + view.slice(1)}</span>}</div>
        {view !== "product" && view !== "booking" && !INFO_VIEWS.includes(view) && !placed && <div className={s.pageHeading}><span className={s.kicker}>ZAVTOO · MADE FOR YOUR EVERYDAY</span><h1>{title}</h1><p>{view === "shop" ? "From home essentials to hardworking commercial systems. Find your fit." : view === "services" ? "Installation, maintenance and a helping hand whenever you need it." : view === "orders" ? "Your orders and service visits live in your Zavtoo account." : "A few simple steps to your everyday essential."}</p></div>}
        {view === "shop" && <>{!onlySaved && !query && (category === "all" || category === "domestic") && <PurifierShowcase compact />}<div className={s.shopTools}><div className={s.tabs}>{categories.map(c => <button key={c.id} aria-pressed={category === c.id} className={category === c.id ? s.selected : ""} onClick={() => browseFilter(c.id)}>{c.title}</button>)}</div><label className={s.sort}>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Top rated</option></select><ChevronDown s={15} /></label></div><div className={s.resultsBar}><span>{filtered.length} products{query && ` matching “${query}”`}</span><button aria-pressed={onlySaved} onClick={() => setOnlySaved(!onlySaved)}><HeartIcon s={17} filled={onlySaved} /> Saved only</button></div>{filtered.length ? <div className={n.grid} role="list">{filtered.map(p => renderProductCard({ p }))}</div> : <div className={s.empty}><SearchIcon s={40} /><h2>No products found.</h2><p>Try another search or explore the full collection.</p><button className={s.primary} onClick={() => { setQuery(""); browseFilter("all"); setOnlySaved(false); window.history.replaceState(null, "", "/shop"); }}>Show all products</button></div>}{(category === "all" || category === "spare") && !onlySaved && <PartsShowcase />}</>}
        {view === "product" && product && <><div className={s.productDetail}><div className={s.detailArt}><span className={s.sale}>SAVE {inr(product.mrp - product.price)}</span><ProductGallery product={product} size={410} />{!product.images?.length && <span>Product illustration</span>}</div><div className={s.detailCopy}><span className={s.kicker}>{categories.find(c => c.id === product.category)?.title}</span><h1>{product.name}</h1>{product.soldBy && <p className={s.formNote}>Sold by {product.soldBy} · {product.techId ? "verified technician, delivers in their service area only" : "verified Zavtoo dealer, delivers in their area only"}</p>}<p className={s.rating}><StarIcon s={18} /> {product.reviews ? <>{product.rating} <span>· {product.reviews} reviews</span></> : <span>New · no reviews yet</span>}</p><p>{product.description}</p><div className={s.detailPrice}><strong>{inr(product.price)}</strong><del>{inr(product.mrp)}</del><span>{sale(product)}% off</span></div><small>Inclusive of all taxes</small><div className={s.specGrid}><div><DropIcon /><strong>{product.stages}</strong><span>Purification / filters</span></div><div><ShieldIcon /><strong>{product.warranty}</strong><span>Product warranty</span></div></div><div className={s.detailActions}><button className={s.primary} onClick={() => add(product)} disabled={!ready}><CartIcon s={19} /> Add to cart</button><button className={s.secondary} aria-pressed={saved.wish.includes(product.id)} onClick={() => wish(product.id)} disabled={!ready}><HeartIcon filled={saved.wish.includes(product.id)} /> Save</button></div><form className={s.pinForm} onSubmit={e => { e.preventDefault(); setPinMessage(PIN_AREAS[pin] ? `Available in ${PIN_AREAS[pin]}. Technician visits and delivery are available — exact timing is confirmed with your order.` : "Technician visits aren't available at this pincode yet — spare parts still ship pan India. Call 89-294-546-47 to check."); }}><label htmlFor="delivery-pin"><PinIcon s={18} /> Check your delivery area</label><div><input id="delivery-pin" aria-label="Delivery pincode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} placeholder="Enter 6-digit pincode" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required /><button>Check</button></div><p role="status">{pinMessage}</p></form></div></div><section className={s.section}><div className={s.sectionHeading}><h2>Also worth a look.</h2><Link href="/shop" className={s.textLink}>View collection</Link></div><div className={n.grid} role="list">{PRODUCTS.filter(p => p.id !== product.id).slice(0, 4).map(p => renderProductCard({ p }))}</div></section></>}
        {(view === "cart" || view === "checkout") && !placed && (!ready ? <p role="status">Loading your basket…</p> : !saved.cart.length ? <div className={s.empty}><CartIcon s={46} /><h2>Your cart is waiting.</h2><p>Bring a little more purity to your everyday.</p><Link className={s.primary} href="/shop">Explore products</Link></div> : <div className={s.checkoutGrid}>{view === "cart" ? <div>{saved.cart.map(l => { const p = PRODUCTS.find(p => p.id === l.id)!; return <article className={s.cartItem} key={l.id}><Link className={s.cartArt} href={`/products/${p.id}`}><ProductImage product={p} size={100} /></Link><div><Link href={`/products/${p.id}`}><h3>{p.name}</h3></Link><p>{p.spec}</p><strong>{inr(p.price)}</strong><div className={s.quantity}><button aria-label={`Decrease ${p.name} quantity`} onClick={() => quantity(p.id, l.qty - 1)}><MinusIcon s={14} /></button><span>{l.qty}</span><button disabled={l.qty === 9} aria-label={`Increase ${p.name} quantity`} onClick={() => quantity(p.id, l.qty + 1)}><PlusIcon s={14} /></button></div></div><div className={s.lineTotal}><strong>{inr(p.price * l.qty)}</strong><button onClick={() => quantity(p.id, 0)} aria-label={`Remove ${p.name}`}><CloseIcon s={18} /> Remove</button></div></article>; })}<Link className={s.textLink} href="/shop">Continue shopping</Link></div> : <div className={s.checkoutForm}><h2>Secure checkout</h2><p className={s.formNote}>You&apos;ll finish your order in the Zavtoo customer app: log in or create an account, choose your delivery address, apply coupons or wallet balance, and pay online or on delivery. Your cart comes with you.</p><button type="button" className={s.primary} onClick={() => { try { localStorage.setItem("zavtoo:cart", JSON.stringify(saved.cart)); } catch { /* storage blocked */ } window.location.href = "/app?screen=cart"; }}>Continue to checkout · {inr(total)}</button><Link className={s.textLink} href="/cart">Back to cart</Link></div>}{renderSummary({ checkout: view === "checkout" })}</div>)}
        {placed && <div className={s.empty}><span className={s.successIcon}><CheckIcon s={34} /></span><span className={s.kicker}>THANK YOU FOR TRYING ZAVTOO</span><h1>Your demo order is saved.</h1><p>Order {placed.id} · {inr(placed.total)}</p><p>No payment was taken. This order will not be fulfilled.</p><Link className={s.primary} href="/orders">View my demo orders</Link><Link className={s.textLink} href="/shop">Continue shopping</Link></div>}
        {view === "booking" && service && <ServiceBooking key={service.type} service={service} />}
        {view === "orders" && <div className={s.empty}><BagIcon s={46} /><h2>Track everything in the Zavtoo app.</h2><p>Log in to see your orders, service bookings, live technician tracking and invoices.</p><Link className={s.primary} href="/app?screen=orders">Open my orders</Link></div>}
        {view === "services" && <ServicesPage catalog={SERVICE_CATALOG} />}
        {view === "about" && <AboutPage />}
        {view === "contact" && <ContactPage />}
        {view === "privacy" && <PolicyPage policy={PRIVACY} related={[{ href: "/terms-and-condition", label: "Terms & Conditions" }, { href: "/contact-us", label: "Contact us" }, { href: "/about-us", label: "About us" }]} />}
        {view === "terms" && <PolicyPage policy={TERMS} related={[{ href: "/privacy-policy", label: "Privacy Policy" }, { href: "/contact-us", label: "Contact us" }, { href: "/about-us", label: "About us" }]} />}
      </div>}
    </main>
    <footer className={n.footer}>
      <div className={`${n.wrap} ${n.footTop}`}>
        <div><Link href="/" className={n.footBrand} aria-label="Zavtoo home"><BrandMark size={34} /><Wordmark size={16} /></Link><p>{COMPANY.about}</p><span>{COMPANY.address}</span><span>{COMPANY.hours}</span></div>
        <div><h3 className={n.display}>Shop</h3><Link href="/shop?category=domestic">Water purifiers</Link><Link href="/shop?category=commercial">Commercial RO</Link><Link href="/shop?category=spare">Filters & spares</Link><Link href="/shop?saved=1">Wishlist</Link><Link href="/orders">Track order</Link><Link href="/app">Login / Register</Link></div>
        <div><h3 className={n.display}>Services</h3><Link href="/services/repair">RO repair</Link><Link href="/services/installation">Installation</Link><Link href="/services/filter-change">Filter replacement</Link><Link href="/services#amc">AMC plans</Link><Link href="/services/deep-cleaning">Deep cleaning</Link><Link href="/services/water-test">Water testing</Link></div>
        <div><h3 className={n.display}>Get in touch</h3>{HELPLINES.map(h => <a key={h.label} href={h.href}>{h.label}: {h.number}</a>)}<a href={COMPANY.whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp: {COMPANY.whatsapp}</a><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></div>
      </div>
      <div className={`${n.wrap} ${n.footBottom}`}><span>© {new Date().getFullYear()} {COMPANY.name}. All rights reserved.</span><span><Link href="/about-us">About us</Link> · <Link href="/contact-us">Contact us</Link> · <Link href="/privacy-policy">Privacy policy</Link> · <Link href="/terms-and-condition">Terms & conditions</Link> · <Link href="/delete-account">Delete account</Link></span></div>
    </footer>
    <WhatsAppFab />
    <nav className={s.tabBar} aria-label="App navigation">
      <Link href="/" aria-current={view === "home" ? "page" : undefined}><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.5 10.6 12 3.5l8.5 7.1V20a1 1 0 0 1-1 1H15v-6.2H9V21H4.5a1 1 0 0 1-1-1z" /></svg>Home</Link>
      <Link href="/shop" aria-current={view === "shop" || view === "product" ? "page" : undefined}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" /></svg>Shop</Link>
      <Link href="/services" aria-current={view === "services" || view === "booking" ? "page" : undefined}><WrenchIcon s={24} />Service</Link>
      <Link href="/app"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></svg>Account</Link>
    </nav>
    {notice && <div className={s.toast} role="status"><CheckIcon s={19} /><span>{notice}</span><Link href="/cart">View cart</Link><button aria-label="Dismiss notification" onClick={() => setNotice("")}><CloseIcon s={16} /></button></div>}
  </div>;
}
