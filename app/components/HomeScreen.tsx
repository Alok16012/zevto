"use client";

import { useEffect, useRef, useState } from "react";
import { BellIcon, CartIcon, SearchIcon, ArrowRight, ShieldIcon, GiftIcon } from "./icons";
import { BrandMark, Wordmark } from "./Brand";
import PurifierArt from "./PurifierArt";
import { ViewAll, iconBtn } from "./ui";
import { SERVICE_ICON } from "./ServicesHub";
import { COUPONS, PRODUCTS, REFERRAL_REWARD, SERVICE_CATALOG, inr, type Product, type ServiceType } from "../lib/data";

interface HomeProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenProducts: (query?: string) => void;
  onOpenProduct: (id: string) => void;
  onBookService: () => void;
  onRenewAmc: () => void;
  onSupport: () => void;
  onAddToCart: (id: string) => void;
  unreadNotifs: number;
  onOpenNotifications: () => void;
  onOpenOffers: () => void;
  onOpenService: (t: ServiceType) => void;
  onOpenServices: () => void;
  onRefer: () => void;
  /** Days left on the customer's AMC, or null if they don't have one. */
  amcDaysLeft: number | null;
}

/* ── Quick-action artwork — flat two-tone tiles, straight from the student
      app's "Tools" row. ── */
const BuyArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <path d="M7 12h28l-3 17H10z" fill="var(--blue-soft)" />
    <path d="M10 16h25l-3 15H13z" fill="var(--blue)" />
    <circle cx="15" cy="35" r="2.6" fill="var(--blue-dark)" />
    <circle cx="29" cy="35" r="2.6" fill="var(--blue-dark)" />
    <path d="M20 19.5s-3 3.4-3 5.3a3 3 0 0 0 6 0c0-1.9-3-5.3-3-5.3z" fill="white" />
  </svg>
);
const BookArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <rect x="7" y="9" width="26" height="26" rx="6" fill="var(--teal-light)" />
    <rect x="10" y="12" width="26" height="26" rx="6" fill="var(--teal)" />
    <path d="M10 19h26" stroke="white" strokeWidth="2.4" />
    <path d="M16 8v6M30 8v6" stroke="var(--teal)" strokeWidth="3" strokeLinecap="round" />
    <path d="M18 28l3 3 6-6" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AmcArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <path d="M19 5l13 5v9c0 8-5.6 14.3-13 16.5C11.6 33.3 6 27 6 19v-9z" fill="#F0A44A" />
    <path d="M23 7l13 5v9c0 8-5.6 14.3-13 16.5z" fill="#E07B1F" />
    <path d="M14 20l4 4 8-8" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SupportArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <path d="M6 18c0-7 5.5-11 12.5-11S31 11 31 18s-5.5 11-12.5 11c-1.4 0-2.8-.2-4-.6L8 31l1.6-5C7.4 24 6 21.2 6 18z" fill="var(--purple-400)" />
    <path d="M14 22c0-6 4.8-9.5 11-9.5S36 16 36 22c0 3-1.3 5.4-3.3 7.1L34 34l-5.3-2.4c-1.2.3-2.4.4-3.7.4-6.2 0-11-3.5-11-10z" fill="var(--purple-600)" />
    <circle cx="20.5" cy="22" r="1.7" fill="white" /><circle cx="25" cy="22" r="1.7" fill="white" /><circle cx="29.5" cy="22" r="1.7" fill="white" />
  </svg>
);

const SLIDE_MS = 4000;

export default function HomeScreen(p: HomeProps) {
  const [q, setQ] = useState("");
  const popular = PRODUCTS.filter((x) => ["classic", "spares", "pro", "cartridges"].includes(x.id));

  const actions = [
    { Art: BuyArt, label: "Buy\nPurifier", onClick: () => p.onOpenProducts() },
    { Art: BookArt, label: "Book\nService", onClick: p.onBookService },
    { Art: AmcArt, label: "AMC\nRenewal", onClick: p.onRenewAmc },
    { Art: SupportArt, label: "Support", onClick: p.onSupport },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Top bar: brand + bell + cart ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BrandMark size={38} />
          <Wordmark />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button aria-label={`Notifications${p.unreadNotifs ? `, ${p.unreadNotifs} unread` : ""}`} onClick={p.onOpenNotifications} className="press" style={iconBtn}>
            <BellIcon s={25} c="var(--text-secondary)" w={1.7} />
            {p.unreadNotifs > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -7, minWidth: 17, height: 17, padding: "0 4px",
                borderRadius: 10, background: "var(--red)", border: "1.5px solid var(--app-bg)",
                color: "white", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
              }}>{p.unreadNotifs}</span>
            )}
          </button>
          <button aria-label="Cart" onClick={p.onOpenCart} className="press" style={iconBtn}>
            <CartIcon s={25} c="var(--text-secondary)" w={1.7} />
            {p.cartCount > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -8, minWidth: 17, height: 17, padding: "0 4px",
                borderRadius: 10, background: "var(--red)", border: "1.5px solid var(--app-bg)",
                color: "white", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
              }}>{p.cartCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <form onSubmit={(e) => { e.preventDefault(); p.onOpenProducts(q.trim()); }} style={{ padding: "4px 16px 14px" }}>
        <label style={{
          display: "flex", alignItems: "center", gap: 10, background: "var(--surface)",
          borderRadius: 16, padding: "12px 14px", boxShadow: "var(--shadow-card)",
        }}>
          <SearchIcon s={20} c="var(--ink-mute)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for products, services..."
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)" }} />
        </label>
      </form>

      <HeroCarousel onShop={() => p.onOpenProducts()} onAmc={p.onRenewAmc} />

      {/* ── Quick actions ── */}
      <div style={{ padding: "22px 14px 0", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {actions.map(({ Art, label, onClick }) => (
          <button key={label} onClick={onClick} className="press" style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
          }}>
            <div style={{
              width: "100%", maxWidth: 70, aspectRatio: "1 / 1", background: "var(--surface)", borderRadius: "28%",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 10px -2px rgba(15,23,41,0.16), 0 2px 4px rgba(15,23,41,0.06)",
            }}><Art /></div>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", textAlign: "center", lineHeight: 1.35, whiteSpace: "pre-line" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Offers ── */}
      <SectionHead kicker="Save more" title="Offers for you" onAll={p.onOpenOffers} />
      <div className="no-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", padding: "12px 16px 4px" }}>
        {COUPONS.slice(0, 4).map((c) => (
          <button key={c.code} onClick={p.onOpenOffers} className="press" style={{
            flex: "0 0 210px", border: "1.5px dashed var(--gold-dark)", borderRadius: 16, padding: "12px 14px", cursor: "pointer", textAlign: "left",
            background: "linear-gradient(135deg,var(--gold-tint),var(--surface))",
          }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--blue-dark)" }}>{c.kind === "flat" ? `₹${c.value} OFF` : `${c.value}% OFF`}</p>
            <p style={{ margin: "2px 0 6px", fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</p>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.05em", color: "var(--gold-dark)" }}>{c.code}</span>
          </button>
        ))}
      </div>

      {/* ── Services ── */}
      <SectionHead kicker="Doorstep experts" title="Our Services" onAll={p.onOpenServices} />
      <div style={{ padding: "12px 16px 0", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {SERVICE_CATALOG.map((o) => {
          const ic = SERVICE_ICON[o.type];
          return (
            <button key={o.type} onClick={() => p.onOpenService(o.type)} className="press" style={{
              background: "var(--surface)", border: "none", borderRadius: 16, padding: "12px 6px", cursor: "pointer",
              boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: ic.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><ic.Icon s={21} c={ic.fg} /></div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{o.type}</span>
              <span style={{ fontSize: 11, color: o.price ? "var(--ink-soft)" : "var(--success-text)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                {o.price ? `from ${inr(o.price)}` : "FREE"}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Popular products ── */}
      <div style={{ padding: "26px 16px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 500 }}>Most loved</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Popular Products</p>
        </div>
        <button onClick={() => p.onOpenProducts()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue)", fontSize: 13.5, fontWeight: 600 }}>View All</button>
      </div>
      <div className="no-scroll" style={{ display: "flex", gap: 12, overflowX: "auto", padding: "14px 16px 6px" }}>
        {popular.map((x) => <MiniCard key={x.id} product={x} onOpen={() => p.onOpenProduct(x.id)} onAdd={() => p.onAddToCart(x.id)} />)}
      </div>

      {/* ── AMC reminder strip ── */}
      <div style={{ padding: "18px 16px 0" }}>
        <div style={{
          background: "var(--surface)", borderRadius: 18, padding: 14, border: "1px solid var(--line)",
          display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow-card)",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg,var(--gold),var(--gold-dark))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(245,166,35,0.3)",
          }}><ShieldIcon s={24} c="white" w={2} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                {p.amcDaysLeft == null ? "Get 1-year AMC" : p.amcDaysLeft <= 30 ? `AMC ends in ${p.amcDaysLeft} days` : "AMC active"}
              </p>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ink-soft)" }}>
              {p.amcDaysLeft == null ? "3 visits, 2 filter sets & priority repairs" : `${p.amcDaysLeft} days of cover left`}
            </p>
          </div>
          <button onClick={p.onRenewAmc} style={{
            background: "linear-gradient(135deg,var(--gold),var(--gold-dark))", color: "var(--blue-dark)", border: "none",
            borderRadius: 12, padding: "11px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(245,166,35,0.35)", whiteSpace: "nowrap",
          }}>{p.amcDaysLeft == null ? "Get AMC →" : "Renew →"}</button>
        </div>
      </div>

      {/* ── Refer & earn ── */}
      <div style={{ padding: "12px 16px 0" }}>
        <button onClick={p.onRefer} className="press" style={{
          width: "100%", border: "none", cursor: "pointer", textAlign: "left", borderRadius: 18, padding: 14,
          background: "linear-gradient(135deg,var(--blue-dark),var(--blue))", color: "white",
          display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 20px rgba(11,92,255,0.25)",
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><GiftIcon s={25} c="var(--gold)" /></div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Refer a friend, earn {inr(REFERRAL_REWARD)}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.75)" }}>Wallet credit for every friend who buys</p>
          </div>
          <ArrowRight s={18} c="var(--gold)" w={2.2} />
        </button>
      </div>
    </div>
  );
}

function SectionHead({ kicker, title, onAll }: { kicker: string; title: string; onAll: () => void }) {
  return (
    <div style={{ padding: "26px 16px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <div>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 500 }}>{kicker}</p>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{title}</p>
      </div>
      <ViewAll onClick={onAll} />
    </div>
  );
}

function MiniCard({ product, onOpen, onAdd }: { product: Product; onOpen: () => void; onAdd: () => void }) {
  return (
    <div role="button" tabIndex={0} aria-label={product.name} onClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()} className="press" style={{
      flex: "0 0 150px", background: "var(--surface)", borderRadius: 18, padding: 12,
      boxShadow: "var(--shadow-card)", cursor: "pointer",
    }}>
      <div style={{ height: 100, borderRadius: 14, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PurifierArt kind={product.art} size={86} />
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{inr(product.price)}</span>
        <button aria-label={`Add ${product.name} to cart`} onClick={(e) => { e.stopPropagation(); onAdd(); }} className="press" style={{
          width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 10px rgba(11,92,255,0.3)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
    </div>
  );
}

function HeroCarousel({ onShop, onAmc }: { onShop: () => void; onAmc: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const held = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      const el = trackRef.current;
      if (!el || Date.now() < held.current || document.hidden) return;
      const cur = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({ left: ((cur + 1) % 2) * el.clientWidth, behavior: "smooth" });
    }, SLIDE_MS);
    return () => clearInterval(t);
  }, []);

  const slide = (children: React.ReactNode, key: number) => (
    <div key={key} style={{ flex: "0 0 100%", scrollSnapAlign: "start", padding: "0 16px" }}>
      <div style={{
        height: "100%", borderRadius: 24, padding: "20px 18px", position: "relative", overflow: "hidden",
        background: "linear-gradient(150deg,var(--blue-dark) 0%,var(--blue-dark) 55%,var(--blue) 100%)",
        boxShadow: "0 10px 28px rgba(11,92,255,0.28)",
      }}>
        <div style={{ position: "absolute", right: -50, top: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,0.30), transparent 70%)" }} />
        <div style={{ position: "absolute", left: -40, bottom: -70, width: 170, height: 170, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)" }} />
        {children}
      </div>
    </div>
  );

  return (
    <div>
      <div ref={trackRef} className="no-scroll"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        onPointerDown={() => { held.current = Date.now() + 7000; }}
        style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 14, marginBottom: -14 }}>
        {slide(
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={{ display: "inline-block", background: "#CFFB6B", color: "var(--blue-dark)", fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>Up to 20% off</span>
              <p style={{ margin: "10px 0 0", fontSize: 23, fontWeight: 800, color: "white", lineHeight: 1.2 }}>
                Clean Water<br /><span style={{ color: "var(--gold)" }}>Healthy Life</span>
              </p>
              <p style={{ margin: "6px 0 14px", fontSize: 12.5, color: "rgba(255,255,255,0.72)" }}>RO Purifiers for Home &amp; Office</p>
              <button onClick={onShop} className="press" style={{
                background: "linear-gradient(135deg,var(--gold),var(--gold-dark))", color: "var(--blue-dark)", border: "none",
                borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 6px 16px rgba(245,166,35,0.40)", display: "inline-flex", alignItems: "center", gap: 6,
              }}>Shop Now <ArrowRight s={15} c="var(--blue-dark)" w={2.2} /></button>
            </div>
            <div style={{ flexShrink: 0, filter: "drop-shadow(0 10px 18px rgba(4,36,107,0.45))" }}><PurifierArt kind="pro" size={120} /></div>
          </div>, 0,
        )}
        {slide(
          <div style={{ position: "relative", zIndex: 1 }}>
            <span style={{ display: "inline-block", background: "var(--gold)", color: "var(--blue-dark)", fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>AMC PLAN</span>
            <p style={{ margin: "10px 0 0", fontSize: 23, fontWeight: 800, color: "white", lineHeight: 1.2 }}>
              1 Year Worry-free<br />Service @ <span style={{ color: "var(--gold)" }}>₹1,999</span>
            </p>
            <div style={{
              display: "flex", gap: 14, margin: "12px 0 14px", background: "rgba(255,255,255,0.09)",
              border: "1px solid rgba(255,255,255,0.16)", borderRadius: 14, padding: "10px 12px",
            }}>
              {[["3", "Visits"], ["2", "Filter sets"], ["24h", "Response"]].map(([v, l]) => (
                <div key={l}><p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--gold)" }}>{v}</p><p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.7)" }}>{l}</p></div>
              ))}
            </div>
            <button onClick={onAmc} className="press" style={{
              background: "white", color: "var(--blue-dark)", border: "none",
              borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Get AMC →</button>
          </div>, 1,
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
        {[0, 1].map((i) => (
          <span key={i} style={{ width: i === index ? 20 : 7, height: 7, borderRadius: 999, background: i === index ? "var(--blue)" : "rgba(11,92,255,0.22)", transition: "width 0.3s" }} />
        ))}
      </div>
    </div>
  );
}
