"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import PurifierArt from "../components/PurifierArt";
import ProductImage, { ProductGallery } from "../components/ProductImage";
import { BrandMark, Wordmark } from "../components/Brand";
import { BagIcon, BoxIcon, CartIcon, CheckIcon, ChevronDown, CloseIcon, DropIcon, GearIcon, HeartIcon, LayersIcon, MinusIcon, PinIcon, PlusIcon, SearchIcon, ShieldIcon, StarIcon, SunIcon, WrenchIcon } from "../components/icons";
import { PRODUCTS, PIN_AREAS, SERVICE_CATALOG, couponByCode, couponDiscount, couponError, inr, type Product, type ServiceOffering } from "../lib/data";
import { useCatalog } from "../lib/catalog";
import { Advantages, AboutPage, Brands, ContactPage, HomeServices, HowItWorks, PartsShowcase, PolicyPage, ServicesPage, StartToday, Testimonials, WhatsAppFab } from "./InfoPages";
import { COMPANY } from "./content";
import { PRIVACY, TERMS } from "./policies";
import s from "./storefront.module.css";
import ServiceBooking, { ServiceBookings } from "./ServiceBooking";

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
const ArrowRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const PhoneOutline = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18.2h2" /></svg>;
const sale = (p: Product) => Math.round((1 - p.price / p.mrp) * 100);

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
    if (!PIN_AREAS[String(form.get("pincode"))]) { setPinMessage("Technician visits aren't available at this pincode yet — spare parts still ship pan India. Call +91 97117 78855 to check."); return; }
    submitting.current = true;
    const receipt: Receipt = { id: `WEB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, date: new Date().toISOString(), total, lines: saved.cart };
    const next = { ...saved, cart: [], coupon: "", orders: [receipt, ...saved.orders] };
    try { localStorage.setItem(KEY, JSON.stringify(next)); setSaved(next); setPlaced(receipt); window.scrollTo({ top: 0 }); }
    catch { setStorageError("Your browser could not save this demo order. Please enable browser storage and try again."); }
    submitting.current = false;
  }
  function renderProductCard({ p }: { p: Product }) {
    return <article className={s.productCard} key={p.id}>
      <div className={`${s.productArt} ${p.art === "premium" ? s.premiumArt : ""}`}>
        <span className={s.sale}>{sale(p)}% OFF</span>
        <button className={s.wish} aria-label={`${saved.wish.includes(p.id) ? "Unsave" : "Save"} ${p.name}`} aria-pressed={saved.wish.includes(p.id)} onClick={() => wish(p.id)} disabled={!ready}><HeartIcon filled={saved.wish.includes(p.id)} s={19} /></button>
        <Link href={`/products/${p.id}`} aria-label={`View ${p.name}`}><ProductImage product={p} size={200} /></Link>
      </div>
      <div className={s.productBody}><div className={s.productMeta}><span>{p.category === "domestic" ? "HOME PURIFIER" : p.category === "commercial" ? "COMMERCIAL" : "GENUINE SPARES"}</span><span><StarIcon s={14} /> {p.reviews ? p.rating : "New"}</span></div>
        <Link href={`/products/${p.id}`} className={s.productName}>{p.name}</Link><p>{p.spec}</p>
        <div className={s.price}><strong>{inr(p.price)}</strong> <del>{inr(p.mrp)}</del></div>
        <button className={s.addButton} onClick={() => add(p)} disabled={!ready}><PlusIcon s={17} /> Add to cart</button>
      </div>
    </article>;
  }
  // Homepage picks: a purifier, the best-selling membrane and the service kit (falls back if any is missing).
  const picks = ["pro", "premium", "commercial-50"].map(id => PRODUCTS.find(p => p.id === id)).filter((p): p is Product => !!p);
  const featured = picks.length === 3 ? picks : PRODUCTS.slice(0, 3);
  function renderFeatureCard(p: Product) {
    const about = `${p.spec} ${p.stages} ${p.description}`;
    const chips = p.category === "commercial"
      ? [{ Icon: LayersIcon, label: "High capacity" }, { Icon: GearIcon, label: "Custom solutions" }]
      : p.category === "spare"
      ? [{ Icon: ShieldIcon, label: "Genuine part" }, { Icon: GearIcon, label: "All brands" }]
      : ([["RO", DropIcon], ["UV", SunIcon], ["UF", LayersIcon], ["Mineral", DropIcon]] as const).filter(([k]) => new RegExp(`\\b${k}`, "i").test(about)).map(([label, Icon]) => ({ Icon, label: label === "Mineral" ? "Mineral care" : label }));
    const blurb = p.description.split(/(?<=\.)\s/)[0];
    return <article className={s.featureCard} key={p.id}>
      <Link href={`/products/${p.id}`} className={s.featureImage} aria-label={`View ${p.name}`}>
        {BADGES[p.id] && <span className={s.bestSeller}>{BADGES[p.id]}</span>}
        <ProductImage product={p} size={170} />
      </Link>
      <div className={s.featureBody}>
        <Link href={`/products/${p.id}`}><h3>{p.name}</h3></Link>
        <p>{blurb}</p>
        {chips.length > 0 && <ul className={s.featureChips}>{chips.map(({ Icon, label }) => <li key={label}><Icon s={16} />{label}</li>)}</ul>}
        <div className={s.featurePrice}><strong>{inr(p.price)}</strong><del>{inr(p.mrp)}</del></div>
        <div className={s.featureActions}>
          {p.category === "commercial"
            ? <a className={s.featureAdd} href={`https://wa.me/919711778855?text=${encodeURIComponent(`Hi Paani Filter, please share a quote for ${p.name}.`)}`} target="_blank" rel="noopener noreferrer">Get quote</a>
            : <button className={s.featureAdd} onClick={() => add(p)} disabled={!ready}>Add to cart</button>}
          <Link className={s.featureView} href={`/products/${p.id}`}>View details</Link>
        </div>
      </div>
    </article>;
  }
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

  return <div className={s.site}>
    <a className={s.skip} href="#main">Skip to content</a>
    <div className={s.topBar}><WrenchIcon s={15} /><span className={s.topBarLong}>India&apos;s trusted water purifier brand · Call or WhatsApp <a href="tel:+919711778855">+91 97117 78855</a></span><span className={s.topBarShort}>India&apos;s trusted water purifier brand</span></div>
    <header className={s.header}><div className={`${s.container} ${s.headerInner}`}>
      <button className={s.phoneMenu} aria-expanded={menu} aria-controls="store-navigation" aria-label="Menu" onClick={() => setMenu(!menu)}>{menu ? <CloseIcon s={22} /> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" /></svg>}</button>
      <Link className={s.logo} href="/" aria-label="Zavtoo home"><BrandMark size={54} /><Wordmark size={24} tagSpacing="0.28em" /></Link>
      <form className={s.search} action="/shop"><SearchIcon s={19} /><input name="q" type="search" enterKeyHint="search" aria-label="Search products" placeholder="Search purifiers, filters & more" defaultValue={query} key={query} /></form>
      <div className={s.headerActions}><Link href="/orders" className={s.account} aria-label="My orders"><BoxIcon s={22} /><span>My orders</span></Link><Link href="/shop?saved=1" aria-label="Wishlist" className={s.savedLink}><HeartIcon s={22} /><span className={s.cartText}>Wishlist</span></Link><Link href="/cart" className={s.cartLink} aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}><CartIcon s={24} /><span className={s.cartText}>Cart</span><b>{count}</b></Link><button className={s.menuButton} aria-expanded={menu} aria-controls="store-navigation" aria-label="Toggle menu" onClick={() => setMenu(!menu)}>{menu ? <CloseIcon /> : <span aria-hidden="true">☰</span>}</button></div>
    </div></header>
    <div className={s.navWrap}><nav id="store-navigation" aria-label="Main navigation" className={`${s.container} ${s.nav} ${menu ? s.navOpen : ""}`}><Link href="/" aria-current={view === "home" ? "page" : undefined}>Home</Link><Link href="/shop?category=domestic">Water purifiers</Link><Link href="/shop?category=commercial">Commercial RO</Link><Link href="/shop?category=spare">Filters & spares</Link><Link href="/services" aria-current={view === "services" ? "page" : undefined}>Service & AMC</Link><Link href="/about-us" aria-current={view === "about" ? "page" : undefined}>About us</Link><Link href="/contact-us" aria-current={view === "contact" ? "page" : undefined}>Contact us</Link><Link className={s.navApp} href="/app"><PhoneOutline /> Open customer app</Link></nav></div>
    <nav className={s.phoneCats} aria-label="Shop by category">
      <Link href="/shop?category=domestic" className={view === "home" || (view === "shop" && category === "domestic") ? s.catOn : ""}>Purifiers</Link>
      <Link href="/shop?category=commercial" className={view === "shop" && category === "commercial" ? s.catOn : ""}>Commercial RO</Link>
      <Link href="/shop?category=spare" className={view === "shop" && category === "spare" ? s.catOn : ""}>Filters</Link>
      <Link href="/services" className={view === "services" || view === "booking" ? s.catOn : ""}>Service</Link>
    </nav>
    {storageError && <p role="alert" className={`${s.container} ${s.warning}`}>{storageError}</p>}
    <main id="main">
      {view === "home" ? <>
        <section className={s.heroBanner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.heroImage} src="/hero-kitchen-branded.jpg" alt="" fetchPriority="high" />
          <span className={s.heroChipPhone}><DropIcon s={18} /> RO + UV + UF</span>
          <div className={`${s.container} ${s.heroBannerInner}`}>
            <div className={s.heroText}>
              <div className={s.heroEyebrow}><span /> PURE WATER. BETTER LIVING.</div>
              <h1>Pure water.<br />A better<br /><em>everyday.</em></h1>
              <p>Find the right purifier for your home,<br className={s.desktopBreak} /> with expert care at every step.</p>
              <div className={s.heroButtons}>
                <Link className={s.heroPrimary} href="/shop?category=domestic">Shop water purifiers <ArrowRight /></Link>
                <Link className={s.heroOutline} href="/services">Book a service</Link>
              </div>
            </div>
            <div className={s.heroSpot}>
              <span className={s.heroChip}><DropIcon s={18} /> RO + UV + UF</span>
              <Link href="/products/pro" className={s.heroSpotCaption}><strong>AquaPure<br />RO Pro</strong><i /><span>Pure water<br />for a healthier<br />everyday.</span></Link>
            </div>
          </div>
        </section>
        <div className={`${s.container} ${s.benefitCard}`}>
          {([[BoxIcon, "Free delivery", "Pan India express shipping"], [WrenchIcon, "Quick service", "Technician in 2–4 hours"], [ShieldIcon, "500+ genuine parts", "All brands available"], [GearIcon, "24/7 support", "Call, WhatsApp & chat"]] as const).map(([Icon, title, detail]) => (
            <div key={title}><span className={s.benefitIcon}><Icon s={22} /></span><span><strong>{title}</strong><small>{detail}</small></span></div>
          ))}
        </div>
        <section className={`${s.container} ${s.section}`}>
          <div className={s.featureHeading}><div><h2>Find your perfect purifier</h2><p>Advanced purification. Thoughtful designs. For every need.</p></div><Link className={s.featureAll} href="/shop">View all products <ArrowRight /></Link></div>
          <div className={s.featureGrid}>{featured.map(p => renderFeatureCard(p))}</div>
        </section>
        <div className={s.container}><HomeServices /></div>
        <div className={s.container}><PartsShowcase /></div>
        <section className={`${s.container} ${s.section}`}><div className={s.sectionHeading}><div><span className={s.kicker}>SHOP BY CATEGORY</span><h2>What do you need today?</h2></div><p>Purifiers, parts and service for every brand.</p></div><div className={s.categoryGrid}>{[{ id: "domestic", title: "RO water purifiers", detail: "Pure water for every Indian home", art: "classic" as const }, { id: "commercial", title: "Commercial RO", detail: "High-capacity systems for business", art: "commercial" as const }, { id: "spare", title: "Spare parts", detail: "500+ genuine parts for all brands", art: "cartridge" as const, photo: "/products/parts/osmo-housing-1.jpg" }].map((c, i) => <Link key={c.id} href={`/shop?category=${c.id}`} className={s.categoryCard}><div><span>0{i + 1}</span><h3>{c.title}</h3><p>{c.detail}</p><b>Explore collection <PlusIcon s={16} /></b></div>{"photo" in c && c.photo ? <img className={s.categoryPhoto} src={c.photo} alt="" width={150} height={150} loading="lazy" /> : <PurifierArt kind={c.art} size={100} />}</Link>)}</div></section>
        <div className={s.container}><Advantages /><HowItWorks /><Testimonials /><StartToday /><Brands /></div>
        <section className={`${s.container} ${s.faq} ${s.section}`}><div><span className={s.kicker}>LET'S CLEAR THINGS UP</span><h2>A few good questions.</h2></div><div>{[["Which brands do you service?", "All major brands — Kent RO, Aquaguard, Pureit, LG Puricare, Livpure, A.O. Smith, Eureka Forbes, HUL, Havells, Blue Star, Whirlpool and more. Our spare parts are compatible across brands too."], ["How quickly can a technician reach me?", "Usually within 2–4 hours of booking, with same-day service available. You get the technician's details once your booking is confirmed."], ["What does an AMC plan include?", "2 to 6 service visits a year, free filter & membrane replacements, priority technician dispatch, up to 30% off spare parts, 24/7 WhatsApp support and an annual water test. Plans: Silver ₹999, Gold ₹1,799 and Platinum ₹2,999 per year."], ["Do you deliver spare parts across India?", "Yes. We stock 500+ genuine RO parts and ship them pan India in secure packaging."], ["How do I place an order?", "Add products to your cart and tap Continue to checkout. You'll finish in the Zavtoo app — log in or sign up, pick your address, and pay online or on delivery."]].map(([q, a]) => <details key={q}><summary>{q}<PlusIcon s={18} /></summary><p>{a}</p></details>)}</div></section>
      </> : <div className={`${s.container} ${s.innerPage}`}>
        <div className={s.breadcrumb}><Link href="/">Home</Link><span>/</span>{view === "product" ? <><Link href="/shop">Shop</Link><span>/</span>{product?.name}</> : <span>{view === "shop" ? "Shop" : VIEW_LABEL[view] ?? view[0].toUpperCase() + view.slice(1)}</span>}</div>
        {view !== "product" && view !== "booking" && !INFO_VIEWS.includes(view) && !placed && <div className={s.pageHeading}><span className={s.kicker}>ZAVTOO · MADE FOR YOUR EVERYDAY</span><h1>{title}</h1><p>{view === "shop" ? "From home essentials to hardworking commercial systems. Find your fit." : view === "services" ? "Installation, maintenance and a helping hand whenever you need it." : view === "orders" ? "Your orders and service visits live in your Zavtoo account." : "A few simple steps to your everyday essential."}</p></div>}
        {view === "shop" && <><div className={s.shopTools}><div className={s.tabs}>{categories.map(c => <button key={c.id} aria-pressed={category === c.id} className={category === c.id ? s.selected : ""} onClick={() => browseFilter(c.id)}>{c.title}</button>)}</div><label className={s.sort}>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Top rated</option></select><ChevronDown s={15} /></label></div><div className={s.resultsBar}><span>{filtered.length} products{query && ` matching “${query}”`}</span><button aria-pressed={onlySaved} onClick={() => setOnlySaved(!onlySaved)}><HeartIcon s={17} filled={onlySaved} /> Saved only</button></div>{filtered.length ? <div className={s.productGrid}>{filtered.map(p => renderProductCard({ p }))}</div> : <div className={s.empty}><SearchIcon s={40} /><h2>No products found.</h2><p>Try another search or explore the full collection.</p><button className={s.primary} onClick={() => { setQuery(""); browseFilter("all"); setOnlySaved(false); window.history.replaceState(null, "", "/shop"); }}>Show all products</button></div>}{(category === "all" || category === "spare") && !onlySaved && <PartsShowcase />}</>}
        {view === "product" && product && <><div className={s.productDetail}><div className={s.detailArt}><span className={s.sale}>SAVE {inr(product.mrp - product.price)}</span><ProductGallery product={product} size={410} />{!product.images?.length && <span>Product illustration</span>}</div><div className={s.detailCopy}><span className={s.kicker}>{categories.find(c => c.id === product.category)?.title}</span><h1>{product.name}</h1><p className={s.rating}><StarIcon s={18} /> {product.reviews ? <>{product.rating} <span>· {product.reviews} reviews</span></> : <span>New · no reviews yet</span>}</p><p>{product.description}</p><div className={s.detailPrice}><strong>{inr(product.price)}</strong><del>{inr(product.mrp)}</del><span>{sale(product)}% off</span></div><small>Inclusive of all taxes</small><div className={s.specGrid}><div><DropIcon /><strong>{product.stages}</strong><span>Purification / filters</span></div><div><ShieldIcon /><strong>{product.warranty}</strong><span>Product warranty</span></div></div><div className={s.detailActions}><button className={s.primary} onClick={() => add(product)} disabled={!ready}><CartIcon s={19} /> Add to cart</button><button className={s.secondary} aria-pressed={saved.wish.includes(product.id)} onClick={() => wish(product.id)} disabled={!ready}><HeartIcon filled={saved.wish.includes(product.id)} /> Save</button></div><form className={s.pinForm} onSubmit={e => { e.preventDefault(); setPinMessage(PIN_AREAS[pin] ? `Available in ${PIN_AREAS[pin]}. Technician visits and delivery are available — exact timing is confirmed with your order.` : "Technician visits aren't available at this pincode yet — spare parts still ship pan India. Call +91 97117 78855 to check."); }}><label htmlFor="delivery-pin"><PinIcon s={18} /> Check your delivery area</label><div><input id="delivery-pin" aria-label="Delivery pincode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} placeholder="Enter 6-digit pincode" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required /><button>Check</button></div><p role="status">{pinMessage}</p></form></div></div><section className={s.section}><div className={s.sectionHeading}><h2>Also worth a look.</h2><Link href="/shop" className={s.textLink}>View collection</Link></div><div className={s.productGrid}>{PRODUCTS.filter(p => p.id !== product.id).slice(0, 4).map(p => renderProductCard({ p }))}</div></section></>}
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
    <footer className={s.footer}><div className={`${s.container} ${s.footerGrid}`}><div><Link href="/" className={s.logo}><BrandMark size={40} /><Wordmark /></Link><p>{COMPANY.about}</p><span>{COMPANY.name}</span></div><div><h3>Quick links</h3><Link href="/">Home</Link><Link href="/services">Services</Link><Link href="/about-us">About us</Link><Link href="/contact-us">Contact us</Link><Link href="/app">Login / Register</Link><Link href="/privacy-policy">Privacy policy</Link><Link href="/terms-and-condition">Terms & conditions</Link></div><div><h3>Our services</h3><Link href="/services/repair">RO repair</Link><Link href="/services/installation">Installation</Link><Link href="/services/filter-change">Filter replacement</Link><Link href="/services#amc">AMC plans</Link><Link href="/services/deep-cleaning">Deep cleaning</Link><Link href="/services/water-test">Water testing</Link><Link href="/shop?category=spare">Spare parts</Link></div><div><h3>Contact info</h3><span>{COMPANY.address}</span><a href={COMPANY.phoneHref}>{COMPANY.phone}</a><a href={COMPANY.phone2Href}>{COMPANY.phone2}</a><a href={COMPANY.whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp: {COMPANY.whatsapp}</a><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a><span>{COMPANY.hours}</span></div></div><div className={`${s.container} ${s.footerBottom}`}><span>© {new Date().getFullYear()} {COMPANY.name}. All rights reserved.</span><span><Link href="/privacy-policy">Privacy policy</Link> · <Link href="/terms-and-condition">Terms & conditions</Link> · <Link href="/contact-us">Support</Link></span><span>Pure Water, Pure Life.</span></div></footer>
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
