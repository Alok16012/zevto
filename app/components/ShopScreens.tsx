"use client";

import { useMemo, useState } from "react";
import { CartIcon, CheckIcon, FilterIcon, HeartIcon, LayersIcon, MinusIcon, PlusIcon, SearchIcon, ShareIcon, ShieldIcon, StarIcon, SunIcon, TrashIcon, PinIcon, CardIcon, WalletIcon } from "./icons";
import PurifierArt from "./PurifierArt";
import ProductImage, { ProductGallery } from "./ProductImage";
import { Footer, PageHeader, PrimaryButton, Tabs, Toggle, card, iconBtn } from "./ui";
import { CouponApply } from "./Offers";
import { ProductReviewsSection } from "./Reviews";
import { PRODUCTS, couponByCode, couponDiscount, couponError, inr, productById, type Address, type Category, type Review } from "../lib/data";

/* ───────────────────────── Product listing ───────────────────────── */

type Filter = "all" | Category;
type Sort = "popular" | "low" | "high";
const SORT_LABEL: Record<Sort, string> = { popular: "Popular", low: "Price ↑", high: "Price ↓" };
const SORT_NEXT: Record<Sort, Sort> = { popular: "low", low: "high", high: "popular" };

export function ProductListPage({ onBack, initialQuery = "", onOpen, onAdd, cartCount, onOpenCart }: {
  onBack: () => void; initialQuery?: string; onOpen: (id: string) => void; onAdd: (id: string) => void;
  cartCount: number; onOpenCart: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState<Sort>("popular");
  const [added, setAdded] = useState<string | null>(null);

  const list = useMemo(() => {
    const needle = q.toLowerCase();
    const rows = PRODUCTS.filter((p) =>
      (filter === "all" || p.category === filter) &&
      (!needle || `${p.name} ${p.spec}`.toLowerCase().includes(needle)));
    if (sort === "low") rows.sort((a, b) => a.price - b.price);
    if (sort === "high") rows.sort((a, b) => b.price - a.price);
    return rows;
  }, [filter, q, sort]);

  const add = (id: string) => {
    onAdd(id);
    setAdded(id);
    setTimeout(() => setAdded((a) => (a === id ? null : a)), 1200);
  };

  return (
    <div>
      <PageHeader title="RO Purifiers" onBack={onBack} right={
        <button aria-label="Cart" onClick={onOpenCart} className="press" style={iconBtn}>
          <CartIcon s={24} c="var(--text-secondary)" w={1.7} />
          {cartCount > 0 && <span style={{ position: "absolute", top: -6, right: -8, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 10, background: "var(--red)", color: "white", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
        </button>
      } />

      <div style={{ padding: "0 16px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderRadius: 16, padding: "11px 14px", boxShadow: "var(--shadow-card)" }}>
          <SearchIcon s={19} c="var(--ink-mute)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search purifiers, filters..."
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)" }} />
        </label>
        <div style={{ marginTop: 12 }}>
          <Tabs<Filter> value={filter} onChange={setFilter} tabs={[
            { id: "all", label: "All" }, { id: "domestic", label: "Domestic" }, { id: "commercial", label: "Commercial" }, { id: "spare", label: "Spares" },
          ]} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 2px 10px" }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{list.length} products</span>
          <button onClick={() => setSort(SORT_NEXT[sort])} aria-label="Change sort order"
            style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "var(--blue)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            <FilterIcon s={15} c="var(--blue)" /> {SORT_LABEL[sort]}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 24 }}>
          {list.map((p) => (
            <div key={p.id} role="button" tabIndex={0} aria-label={p.name} onClick={() => onOpen(p.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(p.id)} className="press" style={{ ...card, display: "flex", gap: 14, padding: 12, cursor: "pointer" }}>
              <div style={{ width: 104, flexShrink: 0, borderRadius: 14, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ProductImage product={p} size={92} />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{p.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>{p.spec}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <StarIcon s={12} /><span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>{p.rating}</span>
                  <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>({p.reviews})</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{inr(p.price)}</span>
                  <span style={{ fontSize: 11.5, color: "var(--ink-mute)", textDecoration: "line-through" }}>{inr(p.mrp)}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); add(p.id); }} className="press" style={{
                  marginTop: 10, border: "none", borderRadius: 12, padding: "9px", cursor: "pointer",
                  fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: added === p.id ? "var(--success)" : "var(--blue)",
                  color: added === p.id ? "var(--success-text)" : "white",
                  transition: "background 0.2s",
                }}>
                  {added === p.id ? <><CheckIcon s={14} c="var(--success-text)" /> Added</> : "Add to Cart"}
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 14, padding: "40px 0" }}>No products match “{q}”.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Product details ───────────────────────── */

export function ProductDetailPage({ id, onBack, onAdd, onBuyNow, wished, onToggleWish, reviews, onSeeReviews, onWriteReview }: {
  id: string; onBack: () => void; onAdd: (id: string, qty: number) => void; onBuyNow: (id: string, qty: number) => void;
  wished: boolean; onToggleWish: () => void;
  reviews: Review[]; onSeeReviews: () => void; onWriteReview: () => void;
}) {
  const p = productById(id)!;
  const [qty, setQty] = useState(1);
  const [shared, setShared] = useState(false);
  const off = Math.round((1 - p.price / p.mrp) * 100);

  const share = async () => {
    const text = `${p.name} — ${inr(p.price)} on Zavtoo`;
    try {
      if (navigator.share) await navigator.share({ title: p.name, text });
      else { await navigator.clipboard.writeText(text); setShared(true); setTimeout(() => setShared(false), 1500); }
    } catch { /* share sheet dismissed */ }
  };

  const features = [
    { Icon: LayersIcon, label: `${p.stages}\nPurification` },
    { Icon: SunIcon, label: "UV\nProtection" },
    { Icon: ShieldIcon, label: `${p.warranty}\nWarranty` },
  ];

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* Image stage */}
      <div style={{ position: "relative", margin: "12px 16px 0", borderRadius: 24, overflow: "hidden", background: "linear-gradient(160deg,var(--blue-tint),var(--surface))", minHeight: 280, padding: "56px 0 12px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,0.22), transparent 70%)" }} />
        <ProductGallery product={p} size={(p.images?.length ?? 0) > 1 ? 200 : 230} />
        <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", justifyContent: "space-between" }}>
          <RoundBtn label="Back" onClick={onBack}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg></RoundBtn>
          <div style={{ display: "flex", gap: 8 }}>
            <RoundBtn label="Wishlist" onClick={onToggleWish}><HeartIcon s={19} c="var(--ink)" filled={wished} /></RoundBtn>
            <RoundBtn label="Share" onClick={share}>{shared ? <CheckIcon s={18} c="var(--success-text)" /> : <ShareIcon s={19} c="var(--ink)" />}</RoundBtn>
          </div>
        </div>
        <span style={{ position: "absolute", left: 14, bottom: 14, background: "var(--gold)", color: "var(--blue-dark)", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>{off}% OFF</span>
      </div>

      <div style={{ padding: "18px 16px 0", flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{p.name}</h1>
        <p style={{ margin: "2px 0 0", fontSize: 13.5, color: "var(--ink-soft)" }}>{p.spec}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "var(--blue-dark)" }}>{inr(p.price)}</span>
            <span style={{ fontSize: 13, color: "var(--ink-mute)", textDecoration: "line-through" }}>{inr(p.mrp)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <StarIcon s={15} /><span style={{ fontSize: 13.5, fontWeight: 700 }}>{p.rating}</span>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>({p.reviews} reviews)</span>
          </div>
        </div>

        <div style={{ ...card, display: "flex", marginTop: 16, padding: "14px 8px" }}>
          {features.map(({ Icon, label }, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon s={21} c="var(--blue)" /></div>
              <span style={{ fontSize: 11.5, color: "var(--ink-soft)", textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.35 }}>{label}</span>
            </div>
          ))}
        </div>

        <h3 style={{ margin: "20px 0 6px", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>Description</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.65 }}>{p.description}</p>

        <div style={{ ...card, marginTop: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚚</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Free delivery &amp; installation</p>
            <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-soft)" }}>Delivered in 2–3 days · 1st year AMC free</p>
          </div>
        </div>

        <ProductReviewsSection productId={p.id} reviews={reviews} onSeeAll={onSeeReviews} onWrite={onWriteReview} />
        <div style={{ height: 12 }} />
      </div>

      <Footer>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Stepper qty={qty} setQty={setQty} />
          <button onClick={() => onAdd(p.id, qty)} aria-label="Add to Cart" className="press" style={{
            width: 52, height: 52, flexShrink: 0, borderRadius: 16, cursor: "pointer",
            background: "var(--surface)", border: "2px solid var(--blue)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><CartIcon s={22} c="var(--blue)" w={2} /></button>
          <PrimaryButton onClick={() => onBuyNow(p.id, qty)} style={{ flex: 1, whiteSpace: "nowrap" }}>Buy Now</PrimaryButton>
        </div>
      </Footer>
    </div>
  );
}

function RoundBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="press" style={{
      width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "var(--shadow-md)",
    }}>{children}</button>
  );
}

export function Stepper({ qty, setQty, small }: { qty: number; setQty: (n: number) => void; small?: boolean }) {
  const b: React.CSSProperties = {
    width: small ? 28 : 34, height: small ? 28 : 34, border: "none", borderRadius: 10, cursor: "pointer",
    background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: small ? 8 : 10, background: small ? "transparent" : "var(--surface)", borderRadius: 14, padding: small ? 0 : 6, boxShadow: small ? "none" : "var(--shadow-card)" }}>
      <button aria-label="Decrease" onClick={() => setQty(Math.max(small ? 0 : 1, qty - 1))} style={b}><MinusIcon s={15} c="var(--blue)" /></button>
      <span style={{ minWidth: 16, textAlign: "center", fontSize: 15, fontWeight: 700 }}>{qty}</span>
      <button aria-label="Increase" onClick={() => setQty(Math.min(9, qty + 1))} style={b}><PlusIcon s={15} c="var(--blue)" /></button>
    </div>
  );
}

/* ───────────────────────── Cart & checkout ───────────────────────── */

export type CartLine = { id: string; qty: number };

export interface CheckoutTotals { subtotal: number; coupon: string | null; discount: number; walletUsed: number; toPay: number }

export function CartPage({ lines, onBack, setQty, onCheckout, onShop, coupon, onCoupon, walletBalance, useWallet, onUseWallet, address, onChangeAddress, userName }: {
  lines: CartLine[]; onBack: () => void; setQty: (id: string, qty: number) => void;
  onCheckout: (pay: "online" | "cod", totals: CheckoutTotals) => void; onShop: () => void;
  coupon: string | null; onCoupon: (code: string | null) => void;
  walletBalance: number; useWallet: boolean; onUseWallet: (v: boolean) => void;
  address: Address | undefined; onChangeAddress: () => void; userName: string;
}) {
  const [pay, setPay] = useState<"online" | "cod">("online");
  const rows = lines.map((l) => ({ ...l, p: productById(l.id)! }));
  const subtotal = rows.reduce((s, r) => s + r.p.price * r.qty, 0);
  const mrp = rows.reduce((s, r) => s + r.p.mrp * r.qty, 0);
  // A coupon stays "applied" while the cart changes, but only counts while it's still valid.
  const hit = coupon ? couponByCode(coupon) : undefined;
  const couponWhy = hit ? couponError(hit, subtotal, "product") : null;
  const couponOff = hit && !couponWhy ? couponDiscount(hit, subtotal) : 0;
  const walletUsed = useWallet ? Math.min(walletBalance, subtotal - couponOff) : 0;
  const toPay = subtotal - couponOff - walletUsed;
  const totals: CheckoutTotals = { subtotal, coupon: couponOff ? hit!.code : null, discount: couponOff, walletUsed, toPay };

  if (rows.length === 0) {
    return (
      <div>
        <PageHeader title="My Cart" onBack={onBack} />
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "var(--blue-tint)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}><CartIcon s={44} c="var(--blue)" w={1.5} /></div>
          <p style={{ margin: "18px 0 4px", fontSize: 17, fontWeight: 700 }}>Your cart is empty</p>
          <p style={{ margin: "0 0 22px", fontSize: 13.5, color: "var(--ink-soft)" }}>Add a purifier or spares to get started.</p>
          <PrimaryButton onClick={onShop} style={{ maxWidth: 240, margin: "0 auto" }}>Browse Products</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title={`My Cart (${rows.length})`} onBack={onBack} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ ...card, display: "flex", gap: 12, padding: 10, alignItems: "center" }}>
              <div style={{ width: 70, height: 70, borderRadius: 12, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ProductImage product={r.p} size={62} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{r.p.name}</p>
                <p style={{ margin: "1px 0 6px", fontSize: 11.5, color: "var(--ink-soft)" }}>{r.p.spec}</p>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{inr(r.p.price * r.qty)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <button aria-label="Remove" onClick={() => setQty(r.id, 0)} style={{ ...iconBtn }}><TrashIcon s={18} c="var(--ink-mute)" /></button>
                <Stepper small qty={r.qty} setQty={(n) => setQty(r.id, n)} />
              </div>
            </div>
          ))}
        </div>

        <h3 style={sectionH}>Offers &amp; wallet</h3>
        <CouponApply amount={subtotal} on="product" applied={coupon} onApply={onCoupon} />
        {couponWhy && <p style={{ margin: "6px 4px 0", fontSize: 12, color: "var(--error-text)", fontWeight: 600 }}>{coupon}: {couponWhy}</p>}
        <div style={{ ...card, padding: 14, marginTop: 8, display: "flex", alignItems: "center", gap: 12, opacity: walletBalance ? 1 : 0.6 }}>
          <WalletIcon s={22} c="var(--blue)" />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>Use Zavtoo wallet</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>Balance {inr(walletBalance)}{walletUsed ? ` · using ${inr(walletUsed)}` : ""}</p>
          </div>
          <Toggle on={useWallet && walletBalance > 0} onChange={(v) => walletBalance > 0 && onUseWallet(v)} label="Use wallet balance" />
        </div>

        <h3 style={sectionH}>Deliver to</h3>
        <div style={{ ...card, padding: 14, display: "flex", gap: 12 }}>
          <PinIcon s={22} c="var(--blue)" />
          <div style={{ flex: 1 }}>
            {address ? (
              <>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{address.label} · {userName}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>{address.line} {address.pincode}</p>
              </>
            ) : <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--error-text)" }}>Add a delivery address</p>}
          </div>
          <button onClick={onChangeAddress} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>{address ? "CHANGE" : "ADD"}</button>
        </div>

        <h3 style={sectionH}>Payment</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {([["online", "UPI / Card / Netbanking", "Secure payment via Razorpay"], ["cod", "Cash on Delivery", "Pay when your order arrives"]] as const).map(([id, t, s]) => (
            <button key={id} onClick={() => setPay(id)} style={{
              ...card, display: "flex", alignItems: "center", gap: 12, padding: 14, cursor: "pointer", textAlign: "left",
              border: pay === id ? "2px solid var(--blue)" : "2px solid transparent",
            }}>
              <CardIcon s={22} c={pay === id ? "var(--blue)" : "var(--ink-mute)"} />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{t}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)" }}>{s}</span>
              </span>
              <span style={{ width: 20, height: 20, borderRadius: "50%", border: pay === id ? "6px solid var(--blue)" : "2px solid var(--line-strong)" }} />
            </button>
          ))}
        </div>

        <h3 style={sectionH}>Bill details</h3>
        <div style={{ ...card, padding: "6px 14px", marginBottom: 12 }}>
          {([
            ["Item total (MRP)", inr(mrp)], ["Discount", "− " + inr(mrp - subtotal)],
            couponOff ? [`Coupon (${hit!.code})`, "− " + inr(couponOff)] : null,
            walletUsed ? ["Wallet", "− " + inr(walletUsed)] : null,
            ["Delivery & installation", "FREE"],
          ].filter(Boolean) as string[][]).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", fontSize: 13.5, color: "var(--ink-soft)" }}>
              <span>{k}</span><span style={{ color: v === "FREE" || v.startsWith("−") ? "var(--success-text)" : "var(--ink)", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px dashed var(--line-strong)", fontSize: 15, fontWeight: 700 }}>
            <span>To pay</span><span>{inr(toPay)}</span>
          </div>
        </div>
        {mrp - toPay > 0 && <p style={{ margin: "0 0 12px", textAlign: "center", fontSize: 12.5, fontWeight: 600, color: "var(--success-text)" }}>🎉 You&apos;re saving {inr(mrp - toPay)} on this order</p>}
      </div>
      <Footer>
        <PrimaryButton disabled={!address} onClick={() => onCheckout(toPay === 0 ? "online" : pay, totals)}>{toPay === 0 ? "Place Order" : pay === "cod" ? "Place Order" : "Pay"} · {inr(toPay)}</PrimaryButton>
      </Footer>
    </div>
  );
}

const sectionH: React.CSSProperties = { margin: "20px 2px 10px", fontSize: 15, fontWeight: 700, color: "var(--ink)" };

export function OrderPlacedPage({ orderId, title, onTrack, onHome }: { orderId: string; title: string; onTrack: () => void; onHome: () => void }) {
  return (
    <div className="fade-up" style={{ minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
      <div style={{ width: 104, height: 104, borderRadius: "50%", background: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 12px rgba(34,197,94,0.10)" }}>
        <CheckIcon s={52} c="var(--success-text)" w={3} />
      </div>
      <h1 style={{ margin: "26px 0 6px", fontSize: 24, fontWeight: 800 }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>Reference number</p>
      <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "var(--blue)" }}>#{orderId}</p>
      <p style={{ margin: "14px 0 28px", fontSize: 13.5, color: "var(--ink-soft)", maxWidth: 280, lineHeight: 1.6 }}>We&apos;ve sent the details on SMS. You can follow every step from My Orders.</p>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        <PrimaryButton onClick={onTrack}>View Details</PrimaryButton>
        <button onClick={onHome} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 14.5, fontWeight: 600, padding: 12, cursor: "pointer" }}>Back to Home</button>
      </div>
    </div>
  );
}
