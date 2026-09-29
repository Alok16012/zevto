"use client";

import { useState } from "react";
import { ArrowRight, CheckIcon, ChevronDown, ChevronRight, ChatIcon, PhoneIcon, StarIcon } from "./icons";
import PurifierArt from "./PurifierArt";
import { Footer, PageHeader, PrimaryButton, StatusBadge, Tabs, card, field, label } from "./ui";
import { CouponApply } from "./Offers";
import { RateServiceCard, ServiceRatedCard } from "./Reviews";
import { SERVICE_ICON } from "./ServicesHub";
import {
  PRODUCTS, SERVICE_CATALOG, TIME_SLOTS, couponByCode, couponDiscount, couponError, fmtDate, inr,
  type Order, type ServiceRating, type ServiceRequest, type ServiceType,
} from "../lib/data";

/* ───────────────────────── Book service ───────────────────────── */

export interface BookingRequest {
  type: ServiceType; product: string; date: string; slot: string; description: string;
  price: number; coupon: string | null; discount: number;
}

export function BookServiceScreen({ initialType = "Installation", onBack, onSubmit }: {
  initialType?: ServiceType; onBack?: () => void;
  onSubmit: (req: BookingRequest) => void;
}) {
  const [type, setType] = useState<ServiceType>(initialType);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [product, setProduct] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [desc, setDesc] = useState("");
  const [touched, setTouched] = useState(false);

  // Tomorrow is the earliest bookable day.
  const min = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const ok = product && date && slot;
  const offering = SERVICE_CATALOG.find((o) => o.type === type)!;
  const price = offering.price;
  // Switching service type can make an applied coupon invalid — drop it quietly.
  const hit = coupon ? couponByCode(coupon) : undefined;
  const valid = hit && !couponError(hit, price, "service") ? hit : undefined;
  const discount = valid ? couponDiscount(valid, price) : 0;

  const submit = () => {
    setTouched(true);
    if (!ok) return;
    onSubmit({ type, product, date: fmtDate(new Date(`${date}T00:00`)), slot, description: desc.trim(), price, coupon: valid?.code ?? null, discount });
  };

  const err = (v: string) => touched && !v ? { border: "1.5px solid var(--error-text)" } : {};

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Book Service" onBack={onBack} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        <div className="no-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -16px", padding: "2px 16px 4px" }}>
          {SERVICE_CATALOG.map((o) => {
            const on = o.type === type;
            const ic = SERVICE_ICON[o.type];
            return (
              <button key={o.type} onClick={() => setType(o.type)} aria-pressed={on} style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 14px 8px 10px",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: on ? "var(--blue)" : "var(--surface)", color: on ? "white" : "var(--text-secondary)",
                border: "none", boxShadow: on ? "0 4px 12px rgba(11,92,255,0.28)" : "var(--shadow-card)",
              }}><ic.Icon s={16} c={on ? "white" : ic.fg} /> {o.type}</button>
            );
          })}
        </div>

        <div style={{
          marginTop: 14, borderRadius: 16, padding: "12px 14px",
          background: "linear-gradient(135deg,var(--blue-dark),var(--blue))", color: "white",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{type}</p>
            <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.75)" }}>{offering.tagline} · {offering.priceNote}</p>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)", whiteSpace: "nowrap" }}>{price ? inr(price) : "FREE"}</span>
        </div>

        <div style={{ marginTop: 20 }}>
          <label style={label} htmlFor="svc-product">Select Product</label>
          <div style={{ position: "relative" }}>
            <select id="svc-product" value={product} onChange={(e) => setProduct(e.target.value)}
              style={{ ...field, appearance: "none", color: product ? "var(--ink)" : "var(--ink-mute)", paddingRight: 40, ...err(product) }}>
              <option value="" disabled>Choose your product</option>
              {PRODUCTS.filter((p) => p.category !== "spare").map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              <option value="Other brand purifier">Other brand purifier</option>
            </select>
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}><ChevronDown s={18} c="var(--ink-soft)" /></span>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={label} htmlFor="svc-date">Preferred Date</label>
          <input id="svc-date" type="date" min={min} value={date} onChange={(e) => setDate(e.target.value)}
            style={{ ...field, color: date ? "var(--ink)" : "var(--ink-mute)", ...err(date) }} />
        </div>

        <div style={{ marginTop: 18 }}>
          <span style={label}>Preferred Time</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TIME_SLOTS.map((s) => {
              const on = s === slot;
              return (
                <button key={s} onClick={() => setSlot(s)} aria-pressed={on} style={{
                  padding: "9px 12px", borderRadius: 12, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                  background: on ? "var(--blue-tint)" : "var(--surface)",
                  color: on ? "var(--blue)" : "var(--text-secondary)",
                  border: on ? "1.5px solid var(--blue)" : touched && !slot ? "1.5px solid var(--error-text)" : "1.5px solid var(--line)",
                }}>{s}</button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 18, marginBottom: 12 }}>
          <label style={label} htmlFor="svc-desc">Problem Description <span style={{ fontWeight: 400, color: "var(--ink-mute)" }}>(optional)</span></label>
          <textarea id="svc-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={300}
            placeholder="Write a short description..." style={{ ...field, resize: "none" }} />
        </div>
        {price > 0 && (
          <div style={{ marginBottom: 12 }}>
            <CouponApply amount={price} on="service" applied={valid?.code ?? null} onApply={setCoupon} />
            {discount > 0 && (
              <p style={{ margin: "8px 4px 0", fontSize: 13, color: "var(--ink-soft)", display: "flex", justifyContent: "space-between" }}>
                <span>Payable after service</span>
                <span><s style={{ color: "var(--ink-mute)", marginRight: 6 }}>{inr(price)}</s><b style={{ color: "var(--ink)" }}>{inr(price - discount)}</b></span>
              </p>
            )}
          </div>
        )}
        {touched && !ok && <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--error-text)" }}>Please choose a product, date and time slot.</p>}
      </div>
      <Footer><PrimaryButton onClick={submit}>Book {type}{price ? ` · ${inr(price - discount)}` : ""}</PrimaryButton></Footer>
    </div>
  );
}

/* ───────────────────────── My orders ───────────────────────── */

type OrderTab = "all" | "product" | "service";

export function OrdersScreen({ orders, onBack, onOpen }: { orders: Order[]; onBack?: () => void; onOpen: (o: Order) => void }) {
  const [tab, setTab] = useState<OrderTab>("all");
  const rows = orders.filter((o) => tab === "all" || o.kind === tab);
  return (
    <div>
      <PageHeader title="My Orders" onBack={onBack} />
      <div style={{ padding: "0 16px 24px" }}>
        <Tabs<OrderTab> value={tab} onChange={setTab} tabs={[{ id: "all", label: "All" }, { id: "product", label: "Products" }, { id: "service", label: "Services" }]} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          {rows.map((o) => (
            <button key={o.id} onClick={() => onOpen(o)} className="press" style={{ ...card, border: "none", padding: 12, cursor: "pointer", textAlign: "left", display: "flex", gap: 12 }}>
              <div style={{ width: 76, height: 76, flexShrink: 0, borderRadius: 14, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PurifierArt kind={o.art} size={68} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>Order #{o.id}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.title}</p>
                <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{o.amount ? inr(o.amount) : "FREE"}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{o.date}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", display: "flex", alignItems: "center", gap: 3 }}>
                    {o.serviceId ? "Track" : "View Details"} <ArrowRight s={13} c="var(--blue)" w={2.2} />
                  </span>
                </div>
              </div>
            </button>
          ))}
          {rows.length === 0 && <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 14, padding: "40px 0" }}>Nothing here yet.</p>}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Order details (products) ───────────────────────── */

export function OrderDetailPage({ order, onBack, onHelp, onReview }: {
  order: Order; onBack: () => void; onHelp: () => void; onReview: (productId: string) => void;
}) {
  const steps = ["Placed", "Shipped", "Delivered"];
  const at = Math.max(0, steps.indexOf(order.status));
  return (
    <div>
      <PageHeader title={`Order #${order.id}`} onBack={onBack} />
      <div style={{ padding: "0 16px 24px" }}>
        <div style={{ ...card, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 76, height: 76, borderRadius: 14, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}><PurifierArt kind={order.art} size={68} /></div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{order.title}</p>
            <p style={{ margin: "2px 0 6px", fontSize: 12, color: "var(--ink-soft)" }}>Ordered on {order.date}</p>
            <StatusBadge status={order.status} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{inr(order.amount)}</span>
        </div>
        <div style={{ ...card, padding: "18px 16px", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {steps.map((s, i) => (
              <div key={s} style={{ flex: i < steps.length - 1 ? 1 : "0 0 auto", display: "flex", alignItems: "center" }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: i <= at ? "var(--blue)" : "var(--line)" }}>
                  {i <= at && <CheckIcon s={14} c="white" />}
                </span>
                {i < steps.length - 1 && <span style={{ flex: 1, height: 3, margin: "0 4px", borderRadius: 2, background: i < at ? "var(--blue)" : "var(--line)" }} />}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {steps.map((s, i) => <span key={s} style={{ fontSize: 11.5, fontWeight: i === at ? 700 : 500, color: i <= at ? "var(--ink)" : "var(--ink-mute)" }}>{s}</span>)}
          </div>
        </div>
        {(order.discount || order.walletUsed) ? (
          <div style={{ ...card, padding: "6px 14px", marginTop: 12 }}>
            {([
              ["Order value", inr(order.amount + (order.discount ?? 0) + (order.walletUsed ?? 0))],
              order.discount ? [`Coupon ${order.coupon ?? ""}`, "− " + inr(order.discount)] : null,
              order.walletUsed ? ["Paid from wallet", "− " + inr(order.walletUsed)] : null,
            ].filter(Boolean) as string[][]).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, color: "var(--ink-soft)" }}>
                <span>{k}</span><span style={{ fontWeight: 600, color: v.startsWith("−") ? "var(--success-text)" : "var(--ink)" }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px dashed var(--line-strong)", fontSize: 14, fontWeight: 700 }}>
              <span>Amount paid</span><span>{inr(order.amount)}</span>
            </div>
          </div>
        ) : null}
        {order.status === "Delivered" && order.productIds?.map((pid) => {
          const p = PRODUCTS.find((x) => x.id === pid);
          return p ? (
            <button key={pid} onClick={() => onReview(pid)} className="press" style={{ ...card, width: "100%", border: "1.5px solid var(--gold)", marginTop: 12, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
              <StarIcon s={22} />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Rate &amp; review</span>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.name}</span>
              </span>
              <ChevronRight s={16} c="var(--ink-mute)" />
            </button>
          ) : null;
        })}
        <button onClick={onHelp} className="press" style={{ ...card, width: "100%", border: "none", marginTop: 12, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
          <ChatIcon s={22} c="var(--blue)" />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Need help with this order?</span>
          <ArrowRight s={16} c="var(--ink-soft)" />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Track service ───────────────────────── */

export function TrackServicePage({ service, onBack, onChat, onRate, onOpenTech }: {
  service: ServiceRequest; onBack: () => void; onChat: () => void; onRate: (r: ServiceRating) => void; onOpenTech: (id: string) => void;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const tech = service.technician;
  const awaitingFeedback = service.current === 4 && !service.timeline[4].at;

  return (
    <div>
      <PageHeader title="Track Service" onBack={onBack} />
      <div style={{ padding: "0 16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 2px 12px" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>Request #{service.id}</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{service.type} · {service.product}</p>
          </div>
        </div>

        {/* Step tracker */}
        <div style={{ ...card, padding: "18px 16px" }}>
          {service.timeline.map((step, i) => {
            // A stamped step is done — except "In Progress", which stays live until the job closes.
            const done = step.at !== null && !(i === 2 && service.current === 2);
            const active = i === service.current && !done;
            const lastRow = i === service.timeline.length - 1;
            return (
              <div key={step.label} style={{ display: "flex", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? "var(--blue)" : active ? "var(--surface)" : "var(--line)",
                    border: active ? "2.5px solid var(--blue)" : "none",
                    boxShadow: active ? "0 0 0 5px var(--blue-tint)" : "none",
                  }}>
                    {done && <CheckIcon s={14} c="white" />}
                    {active && <span className="animate-pulse-dot" style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--blue)" }} />}
                  </span>
                  {!lastRow && <span style={{ width: 2.5, flex: 1, minHeight: 28, background: done ? "var(--blue)" : "var(--line)", borderRadius: 2, margin: "3px 0" }} />}
                </div>
                <div style={{ paddingBottom: lastRow ? 0 : 16, paddingTop: 2 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: done || active ? 600 : 500, color: active ? "var(--blue)" : done ? "var(--ink)" : "var(--ink-mute)" }}>{step.label}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--ink-mute)" }}>{step.at ?? (active ? (i === 4 ? "Waiting for your rating" : "Happening now") : "Pending")}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Technician */}
        {tech ? (
          <div style={{ ...card, padding: 14, marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 50, height: 50, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg,var(--blue),var(--blue-dark))", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700,
              border: "2.5px solid white", boxShadow: "0 2px 8px rgba(11,92,255,0.3)",
            }}>{tech.initials}</div>
            <button onClick={() => onOpenTech(tech.id)} style={{ flex: 1, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{tech.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>View profile &amp; reviews</p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}><StarIcon s={13} /><span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{tech.rating}</span></div>
            </button>
            <a href={`tel:${tech.phone}`} aria-label="Call technician" className="press" style={circleBtn("var(--success)")}><PhoneIcon s={19} c="var(--success-text)" /></a>
            <button onClick={onChat} aria-label="Chat with support" className="press" style={{ ...circleBtn("var(--blue-tint)"), border: "none", cursor: "pointer" }}><ChatIcon s={19} c="var(--blue)" /></button>
          </div>
        ) : (
          <div style={{ ...card, padding: 14, marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 26 }}>⏳</span>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>We&apos;re assigning the nearest technician. You&apos;ll get an SMS within 2 hours.</p>
          </div>
        )}

        {awaitingFeedback && <RateServiceCard techName={tech?.name} onSubmit={onRate} />}
        {service.rating && <ServiceRatedCard rating={service.rating} />}

        <button onClick={() => setShowInfo((s) => !s)} className="press" style={{
          width: "100%", marginTop: 14, background: "transparent", border: "2px solid var(--blue)", borderRadius: 999,
          padding: 13, cursor: "pointer", color: "var(--blue)", fontSize: 14.5, fontWeight: 600,
        }}>{showInfo ? "Hide Details" : "View Details"}</button>

        {showInfo && (
          <div className="fade-up" style={{ ...card, padding: "6px 14px", marginTop: 12 }}>
            {[["Service", service.type], ["Product", service.product], ["Date", service.date], ["Time slot", service.slot], ["Problem", service.description || "—"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span style={{ color: "var(--ink-soft)" }}>{k}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const circleBtn = (bg: string): React.CSSProperties => ({
  width: 42, height: 42, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
});

