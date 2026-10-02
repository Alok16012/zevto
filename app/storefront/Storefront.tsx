"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import PurifierArt from "../components/PurifierArt";
import { BrandMark, Wordmark } from "../components/Brand";
import { BagIcon, CartIcon, CheckIcon, ChevronDown, CloseIcon, DropIcon, HeartIcon, MinusIcon, PinIcon, PlusIcon, SearchIcon, ShieldIcon, StarIcon, WrenchIcon } from "../components/icons";
import { PRODUCTS, PIN_AREAS, SERVICE_CATALOG, couponByCode, couponDiscount, couponError, inr, type Product, type ServiceOffering } from "../lib/data";
import s from "./storefront.module.css";
import ServiceBooking, { ServiceBookings } from "./ServiceBooking";

type View = "home" | "shop" | "product" | "cart" | "checkout" | "orders" | "services" | "booking";
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
const sale = (p: Product) => Math.round((1 - p.price / p.mrp) * 100);

export default function Storefront({ view, product, filters, service }: { view: View; product?: Product; service?: ServiceOffering; filters?: { category?: string; q?: string; saved?: string } }) {
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
    if (!PIN_AREAS[String(form.get("pincode"))]) { setPinMessage("This pincode is outside our current demo service areas. Try 201301 for Noida."); return; }
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
        <Link href={`/products/${p.id}`} aria-label={`View ${p.name}`}><PurifierArt kind={p.art} size={200} /></Link>
      </div>
      <div className={s.productBody}><div className={s.productMeta}><span>{p.category === "domestic" ? "HOME PURIFIER" : p.category === "commercial" ? "COMMERCIAL" : "GENUINE SPARES"}</span><span><StarIcon s={14} /> {p.rating}</span></div>
        <Link href={`/products/${p.id}`} className={s.productName}>{p.name}</Link><p>{p.spec}</p>
        <div className={s.price}><strong>{inr(p.price)}</strong> <del>{inr(p.mrp)}</del></div>
        <button className={s.addButton} onClick={() => add(p)} disabled={!ready}><PlusIcon s={17} /> Add to cart</button>
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
    <div className={s.announcement}><span>Good water. Better living.</span><span>Complimentary installation with every Zavtoo purifier <span aria-hidden="true">✦</span></span><Link href="/services">Explore our services</Link></div>
    <header className={s.header}><div className={`${s.container} ${s.headerInner}`}>
      <Link className={s.logo} href="/" aria-label="Zavtoo home"><BrandMark size={42} /><Wordmark /></Link>
      <form className={s.search} action="/shop"><SearchIcon s={19} /><input name="q" aria-label="Search products" placeholder="Search purifiers, filters & more…" defaultValue={query} key={query} /><button type="submit" aria-label="Search"><span className={s.searchLabel}>Search</span><SearchIcon s={18} /></button></form>
      <div className={s.headerActions}><Link href="/orders" className={s.account} aria-label="My orders"><BagIcon s={21} /><span>My orders</span></Link><Link href="/shop?saved=1" aria-label="Saved products" className={s.savedLink}><HeartIcon s={22} /></Link><Link href="/cart" className={s.cartLink} aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}><CartIcon s={24} /><span className={s.cartText}>Cart</span><b>{count}</b></Link><button className={s.menuButton} aria-expanded={menu} aria-controls="store-navigation" aria-label="Toggle menu" onClick={() => setMenu(!menu)}>{menu ? <CloseIcon /> : <span aria-hidden="true">☰</span>}</button></div>
    </div></header>
    <div className={s.navWrap}><nav id="store-navigation" aria-label="Main navigation" className={`${s.container} ${s.nav} ${menu ? s.navOpen : ""}`}><Link href="/" aria-current={view === "home" ? "page" : undefined}>Home</Link><Link href="/shop?category=domestic">Water purifiers</Link><Link href="/shop?category=commercial">Commercial RO</Link><Link href="/shop?category=spare">Filters & spares</Link><Link href="/services" aria-current={view === "services" ? "page" : undefined}>Service & AMC</Link><Link href="/#why-zavtoo">Why Zavtoo</Link><Link className={s.navApp} href="/app">Open customer app</Link></nav></div>
    {storageError && <p role="alert" className={`${s.container} ${s.warning}`}>{storageError}</p>}
    <main id="main">
      {view === "home" ? <>
        <section className={`${s.container} ${s.hero}`}>
          <div className={s.heroCopy}><div className={s.eyebrow}><span /> THE EVERYDAY ESSENTIAL, REIMAGINED</div><h1>Pure water.<br />A better<br /><em>everyday.</em></h1><p>From the first sip to the last cup of the day.<br className={s.desktopBreak} /> Find a water purifier that feels right at home.</p><div className={s.heroActions}><Link className={s.primary} href="/shop">Shop water purifiers</Link><Link className={s.textLink} href="/services">Book a service</Link></div><div className={s.heroNote}><ShieldIcon s={19} /><span>Genuine products. Expert care. One trusted name.</span></div></div>
          <div className={s.heroVisual}><span className={s.heroVertical}>DESIGNED FOR YOUR EVERYDAY</span><div className={s.orbit} /><div className={s.heroProduct}><PurifierArt kind="pro" size={430} /></div><div className={s.heroTag}><span><DropIcon s={20} /></span><div><strong>Purity, in every drop.</strong><small>RO + UV + UF purification</small></div></div><div className={s.heroCaption}><span>MEET YOUR NEW DAILY ESSENTIAL</span><strong>AquaPure RO Pro</strong><Link href="/products/pro">Discover the purifier <PlusIcon s={16} /></Link></div><span className={s.heroEdition}>01 / 03</span></div>
        </section>
        <div className={`${s.container} ${s.benefits}`}><div><WrenchIcon /><span><strong>Expert installation</strong><small>Included with your purifier</small></span></div><div><ShieldIcon /><span><strong>Genuine assurance</strong><small>Product-specific warranties</small></span></div><div><DropIcon /><span><strong>Care beyond purchase</strong><small>Filters, repairs & AMC</small></span></div><div><PinIcon /><span><strong>Local service support</strong><small>Noida, Gurugram & Ghaziabad</small></span></div></div>
        <section className={`${s.container} ${s.section}`}><div className={s.sectionHeading}><div><span className={s.kicker}>A LITTLE PURE FOR EVERY SPACE</span><h2>What brings you here?</h2></div><p>Good water starts with the right choice.</p></div><div className={s.categoryGrid}>{[{ id: "domestic", title: "For your home", detail: "Everyday purity for the whole family", art: "classic" as const }, { id: "commercial", title: "For your business", detail: "More capacity. The same care.", art: "commercial" as const }, { id: "spare", title: "For a fresh start", detail: "Genuine filters & replacement parts", art: "cartridge" as const }].map((c, i) => <Link key={c.id} href={`/shop?category=${c.id}`} className={s.categoryCard}><div><span>0{i + 1}</span><h3>{c.title}</h3><p>{c.detail}</p><b>Explore collection <PlusIcon s={16} /></b></div><PurifierArt kind={c.art} size={140} /></Link>)}</div></section>
        <section className={`${s.container} ${s.section}`}><div className={s.sectionHeading}><div><span className={s.kicker}>YOUR NEXT KITCHEN ESSENTIAL</span><h2>Find your perfect purifier.</h2></div><Link className={s.textLink} href="/shop">View all products <PlusIcon s={16} /></Link></div><div className={s.productGrid}>{PRODUCTS.slice(0, 4).map(p => renderProductCard({ p }))}</div><p className={s.catalogueNote}>Illustrative product images · sample catalogue and ratings</p></section>
        <section className={`${s.container} ${s.careBanner}`}><div className={s.careIcon}><WrenchIcon s={68} /></div><div><span className={s.kicker}>WE'RE HERE AFTER THE FIRST SIP, TOO</span><h2>A little care.<br />A lot of peace of mind.</h2><p>From a filter change to an annual care plan,<br />keep your purifier in good hands.</p></div><div className={s.careCta}><Link className={s.primary} href="/services">Explore service & AMC</Link><span>Repairs · Maintenance · Installation</span></div></section>
        <section id="why-zavtoo" className={`${s.container} ${s.section} ${s.why}`}><div><span className={s.kicker}>THE ZAVTOO PROMISE</span><h2>Better water.<br />Thoughtfully taken care of.</h2><p>A purifier is just the beginning. We bring products, replacement parts and service together to make looking after your water simpler.</p></div><div className={s.promiseGrid}><article><span>01</span><h3>A fit for every space</h3><p>From domestic RO purifiers to commercial systems, choose the capacity your day needs.</p></article><article><span>02</span><h3>Parts you can count on</h3><p>Find matching filter kits and replacement cartridges in one place.</p></article><article><span>03</span><h3>People, when you need them</h3><p>Book installation, maintenance and repairs directly on our website.</p></article><article><span>04</span><h3>Everything, together</h3><p>Keep your product orders and service bookings together on the website.</p></article></div></section>
        <section className={`${s.container} ${s.faq} ${s.section}`}><div><span className={s.kicker}>LET'S CLEAR THINGS UP</span><h2>A few good questions.</h2></div><div>{[["Which purifier is right for my home?", "Compare purification stages, storage needs and warranty on each product page. If you're unsure about your water source, book a water test through our service catalogue before choosing."], ["Is installation included?", "The current Zavtoo catalogue includes standard installation with a purifier purchase. Check your pincode before checkout; additional parts or non-standard work can require a separate quote."], ["Can I book a service for an existing purifier?", "Yes. Explore repairs, filter changes, water testing and annual maintenance on the Services page, then choose your address, preferred date and time without leaving the website."], ["How do I place an order?", "Add products to your cart and tap Continue to checkout. You'll finish in the Zavtoo app — log in or sign up, pick your address, and pay online or on delivery."]].map(([q, a]) => <details key={q}><summary>{q}<PlusIcon s={18} /></summary><p>{a}</p></details>)}</div></section>
      </> : <div className={`${s.container} ${s.innerPage}`}>
        <div className={s.breadcrumb}><Link href="/">Home</Link><span>/</span>{view === "product" ? <><Link href="/shop">Shop</Link><span>/</span>{product?.name}</> : <span>{view === "shop" ? "Shop" : view[0].toUpperCase() + view.slice(1)}</span>}</div>
        {view !== "product" && view !== "booking" && !placed && <div className={s.pageHeading}><span className={s.kicker}>ZAVTOO · MADE FOR YOUR EVERYDAY</span><h1>{title}</h1><p>{view === "shop" ? "From home essentials to hardworking commercial systems. Find your fit." : view === "services" ? "Installation, maintenance and a helping hand whenever you need it." : view === "orders" ? "Your orders and service visits live in your Zavtoo account." : "A few simple steps to your everyday essential."}</p></div>}
        {view === "shop" && <><div className={s.shopTools}><div className={s.tabs}>{categories.map(c => <button key={c.id} aria-pressed={category === c.id} className={category === c.id ? s.selected : ""} onClick={() => browseFilter(c.id)}>{c.title}</button>)}</div><label className={s.sort}>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Top rated</option></select><ChevronDown s={15} /></label></div><div className={s.resultsBar}><span>{filtered.length} products{query && ` matching “${query}”`}</span><button aria-pressed={onlySaved} onClick={() => setOnlySaved(!onlySaved)}><HeartIcon s={17} filled={onlySaved} /> Saved only</button></div>{filtered.length ? <div className={s.productGrid}>{filtered.map(p => renderProductCard({ p }))}</div> : <div className={s.empty}><SearchIcon s={40} /><h2>No products found.</h2><p>Try another search or explore the full collection.</p><button className={s.primary} onClick={() => { setQuery(""); browseFilter("all"); setOnlySaved(false); window.history.replaceState(null, "", "/shop"); }}>Show all products</button></div>}<p className={s.catalogueNote}>Illustrative product images · sample catalogue and ratings</p></>}
        {view === "product" && product && <><div className={s.productDetail}><div className={s.detailArt}><span className={s.sale}>SAVE {inr(product.mrp - product.price)}</span><PurifierArt kind={product.art} size={410} /><span>Product illustration</span></div><div className={s.detailCopy}><span className={s.kicker}>{categories.find(c => c.id === product.category)?.title}</span><h1>{product.name}</h1><p className={s.rating}><StarIcon s={18} /> {product.rating} <span>· {product.reviews} sample ratings</span></p><p>{product.description}</p><div className={s.detailPrice}><strong>{inr(product.price)}</strong><del>{inr(product.mrp)}</del><span>{sale(product)}% off</span></div><small>Inclusive of all taxes</small><div className={s.specGrid}><div><DropIcon /><strong>{product.stages}</strong><span>Purification / filters</span></div><div><ShieldIcon /><strong>{product.warranty}</strong><span>Product warranty</span></div></div><div className={s.detailActions}><button className={s.primary} onClick={() => add(product)} disabled={!ready}><CartIcon s={19} /> Add to cart</button><button className={s.secondary} aria-pressed={saved.wish.includes(product.id)} onClick={() => wish(product.id)} disabled={!ready}><HeartIcon filled={saved.wish.includes(product.id)} /> Save</button></div><form className={s.pinForm} onSubmit={e => { e.preventDefault(); setPinMessage(PIN_AREAS[pin] ? `Available in ${PIN_AREAS[pin]}. Delivery timing is confirmed after a real order is enabled.` : "Outside our current service areas. We currently cover selected Noida, Gurugram and Ghaziabad pincodes."); }}><label htmlFor="delivery-pin"><PinIcon s={18} /> Check your delivery area</label><div><input id="delivery-pin" aria-label="Delivery pincode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} placeholder="Enter 6-digit pincode" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required /><button>Check</button></div><p role="status">{pinMessage}</p></form></div></div><section className={s.section}><div className={s.sectionHeading}><h2>Also worth a look.</h2><Link href="/shop" className={s.textLink}>View collection</Link></div><div className={s.productGrid}>{PRODUCTS.filter(p => p.id !== product.id).slice(0, 4).map(p => renderProductCard({ p }))}</div></section></>}
        {(view === "cart" || view === "checkout") && !placed && (!ready ? <p role="status">Loading your basket…</p> : !saved.cart.length ? <div className={s.empty}><CartIcon s={46} /><h2>Your cart is waiting.</h2><p>Bring a little more purity to your everyday.</p><Link className={s.primary} href="/shop">Explore products</Link></div> : <div className={s.checkoutGrid}>{view === "cart" ? <div>{saved.cart.map(l => { const p = PRODUCTS.find(p => p.id === l.id)!; return <article className={s.cartItem} key={l.id}><Link className={s.cartArt} href={`/products/${p.id}`}><PurifierArt kind={p.art} size={100} /></Link><div><Link href={`/products/${p.id}`}><h3>{p.name}</h3></Link><p>{p.spec}</p><strong>{inr(p.price)}</strong><div className={s.quantity}><button aria-label={`Decrease ${p.name} quantity`} onClick={() => quantity(p.id, l.qty - 1)}><MinusIcon s={14} /></button><span>{l.qty}</span><button disabled={l.qty === 9} aria-label={`Increase ${p.name} quantity`} onClick={() => quantity(p.id, l.qty + 1)}><PlusIcon s={14} /></button></div></div><div className={s.lineTotal}><strong>{inr(p.price * l.qty)}</strong><button onClick={() => quantity(p.id, 0)} aria-label={`Remove ${p.name}`}><CloseIcon s={18} /> Remove</button></div></article>; })}<Link className={s.textLink} href="/shop">Continue shopping</Link></div> : <div className={s.checkoutForm}><h2>Secure checkout</h2><p className={s.formNote}>You&apos;ll finish your order in the Zavtoo customer app: log in or create an account, choose your delivery address, apply coupons or wallet balance, and pay online or on delivery. Your cart comes with you.</p><button type="button" className={s.primary} onClick={() => { try { localStorage.setItem("zavtoo:cart", JSON.stringify(saved.cart)); } catch { /* storage blocked */ } window.location.href = "/app?screen=cart"; }}>Continue to checkout · {inr(total)}</button><Link className={s.textLink} href="/cart">Back to cart</Link></div>}{renderSummary({ checkout: view === "checkout" })}</div>)}
        {placed && <div className={s.empty}><span className={s.successIcon}><CheckIcon s={34} /></span><span className={s.kicker}>THANK YOU FOR TRYING ZAVTOO</span><h1>Your demo order is saved.</h1><p>Order {placed.id} · {inr(placed.total)}</p><p>No payment was taken. This order will not be fulfilled.</p><Link className={s.primary} href="/orders">View my demo orders</Link><Link className={s.textLink} href="/shop">Continue shopping</Link></div>}
        {view === "booking" && service && <ServiceBooking key={service.type} service={service} />}
        {view === "orders" && <div className={s.empty}><BagIcon s={46} /><h2>Track everything in the Zavtoo app.</h2><p>Log in to see your orders, service bookings, live technician tracking and invoices.</p><Link className={s.primary} href="/app?screen=orders">Open my orders</Link></div>}
        {view === "services" && <><div className={s.serviceIntro}><ShieldIcon s={35} /><p>Choose your service and book it in the Zavtoo app — pick a technician who serves your pincode and track them live on the day.</p></div><div className={s.serviceGrid}>{SERVICE_CATALOG.map(service => <article className={s.serviceCard} key={service.type}><WrenchIcon s={27} /><h2>{service.type === "AMC" ? "Annual maintenance" : service.type}</h2><p>{service.tagline}</p><div className={s.servicePrice}><strong>{service.price ? inr(service.price) : "Included"}</strong><span>{service.priceNote}</span></div><ul>{service.includes.map(item => <li key={item}><CheckIcon s={16} />{item}</li>)}</ul><Link className={s.secondary} href={`/services/${service.type.toLowerCase().replaceAll(" ", "-")}`}>Book {service.type.toLowerCase()}</Link></article>)}</div></>}
      </div>}
    </main>
    <footer className={s.footer}><div className={`${s.container} ${s.footerGrid}`}><div><Link href="/" className={s.logo}><BrandMark size={40} /><Wordmark /></Link><p>Pure water for real life.<br />And care for everything that comes after.</p><span>Zavtoo Pani Filter Pvt Ltd</span></div><div><h3>Find your pure</h3><Link href="/shop?category=domestic">Home water purifiers</Link><Link href="/shop?category=commercial">Commercial systems</Link><Link href="/shop?category=spare">Filters & spare parts</Link></div><div><h3>We're here to help</h3><Link href="/services">Service & AMC</Link><Link href="/app?screen=orders">My orders</Link><Link href="/app?screen=chat">Customer support</Link></div><div><h3>The Zavtoo family</h3><Link href="/app">Customer app</Link><Link href="/technician">Technician partners</Link><Link href="/#why-zavtoo">About Zavtoo</Link></div></div><div className={`${s.container} ${s.footerBottom}`}><span>© {new Date().getFullYear()} Zavtoo Pani Filter Pvt Ltd</span><span>Secure ordering through the Zavtoo app</span><span>Made for a better everyday.</span></div></footer>
    {notice && <div className={s.toast} role="status"><CheckIcon s={19} /><span>{notice}</span><Link href="/cart">View cart</Link><button aria-label="Dismiss notification" onClick={() => setNotice("")}><CloseIcon s={16} /></button></div>}
  </div>;
}
