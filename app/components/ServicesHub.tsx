"use client";

import { useState } from "react";
import { ArrowRight, CheckIcon, ChevronDown, ClockIcon, DropIcon, FilterIcon, PinIcon, SearchIcon, ShieldIcon, StarIcon, WrenchIcon } from "./icons";
import TechAvatar from "./TechAvatar";
import { Footer, PageHeader, PrimaryButton, card, sectionTitle } from "./ui";
import { ReviewCard } from "./Reviews";
import {
  SERVICE_CATALOG, TECHNICIANS, inr, offeringOf,
  type Review, type ServiceRequest, type ServiceType,
} from "../lib/data";

type IconC = (p: { s?: number; c?: string; w?: number }) => React.ReactElement;

export const SERVICE_ICON: Record<ServiceType, { Icon: IconC; bg: string; fg: string }> = {
  Installation: { Icon: DropIcon, bg: "var(--blue-tint)", fg: "var(--blue)" },
  Repair: { Icon: WrenchIcon, bg: "var(--error)", fg: "var(--error-text)" },
  AMC: { Icon: ShieldIcon, bg: "var(--gold-tint)", fg: "var(--gold-dark)" },
  "Filter Change": { Icon: FilterIcon, bg: "var(--teal-bg)", fg: "var(--teal-text)" },
  "Water Test": { Icon: SearchIcon, bg: "var(--purple-tint)", fg: "var(--purple)" },
  Uninstall: { Icon: PinIcon, bg: "var(--orange-bg)", fg: "var(--orange-text)" },
};

const FAQ = [
  ["How soon can a technician come?", "Book before 2 PM and we can usually visit the next morning. AMC customers get priority within 24 hours."],
  ["Do you service other brands?", "Yes — Kent, Aquaguard, Pureit, Livpure and most local brands. Spare parts are charged at MRP."],
  ["What if the problem comes back?", "Every repair has a 30-day warranty. Raise it from Track Service and we'll revisit free."],
  ["How do I pay?", "Pay the technician by UPI or cash after the job, or apply your wallet balance while booking."],
];

/* ───────────────────────── Service tab / hub ───────────────────────── */

export function ServicesHubScreen({ services, onOpen, onTrack, onOpenTech }: {
  services: ServiceRequest[]; onOpen: (t: ServiceType) => void; onTrack: (id: string) => void; onOpenTech: (id: string) => void;
}) {
  const [faq, setFaq] = useState<number | null>(0);
  const active = services.filter((s) => s.current < 3);

  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="Services" />
      <div style={{ padding: "0 16px" }}>
        {/* Hero */}
        <div style={{
          borderRadius: 22, padding: "18px 18px", color: "white", position: "relative", overflow: "hidden",
          background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", boxShadow: "0 10px 28px rgba(11,92,255,0.28)",
        }}>
          <div style={{ position: "absolute", right: -40, top: -60, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,0.3), transparent 70%)" }} />
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.25, position: "relative" }}>Expert RO service<br /><span style={{ color: "var(--gold)" }}>at your doorstep</span></p>
          <div style={{ display: "flex", gap: 14, marginTop: 12, position: "relative" }}>
            {[["4.8★", "Avg rating"], ["30k+", "Visits"], ["30 day", "Warranty"]].map(([v, l]) => (
              <div key={l}><p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--gold)" }}>{v}</p><p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.75)" }}>{l}</p></div>
            ))}
          </div>
        </div>

        {/* Running jobs */}
        {active.map((s) => (
          <button key={s.id} onClick={() => onTrack(s.id)} className="press" style={{ ...card, width: "100%", border: "1.5px solid var(--blue-ghost)", marginTop: 12, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
            <span className="animate-pulse-dot" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{s.type} · {s.timeline[s.current].label}</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>#{s.id} · {s.date}</span>
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--blue)" }}>Track →</span>
          </button>
        ))}

        {/* Catalogue */}
        <h3 style={sectionTitle}>What do you need?</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {SERVICE_CATALOG.map((o) => {
            const ic = SERVICE_ICON[o.type];
            return (
              <button key={o.type} onClick={() => onOpen(o.type)} className="press" style={{ ...card, border: "none", padding: 14, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: ic.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><ic.Icon s={22} c={ic.fg} /></div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{o.type}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.4, minHeight: 32 }}>{o.tagline}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: o.price ? "var(--ink)" : "var(--success-text)" }}>{o.price ? inr(o.price) : "FREE"}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11.5, fontWeight: 600 }}><StarIcon s={11} />{o.rating}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* How it works */}
        <h3 style={sectionTitle}>How it works</h3>
        <div style={{ ...card, padding: "14px 10px", display: "flex" }}>
          {["Book a slot", "Technician assigned", "Service done", "Rate & pay"].map((t, i) => (
            <div key={t} style={{ flex: 1, textAlign: "center", position: "relative" }}>
              <span style={{ width: 30, height: 30, margin: "0 auto", borderRadius: "50%", background: "var(--blue)", color: "white", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.35 }}>{t}</p>
            </div>
          ))}
        </div>

        {/* Top technicians */}
        <h3 style={sectionTitle}>Top-rated technicians</h3>
        <div className="no-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px", padding: "0 16px 4px" }}>
          {TECHNICIANS.map((t) => (
            <button key={t.id} onClick={() => onOpenTech(t.id)} className="press" style={{ ...card, flex: "0 0 140px", border: "none", padding: 14, cursor: "pointer", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center" }}><TechAvatar id={t.id} name={t.name} size={56} /></div>
              <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}><StarIcon s={11} />{t.rating} · {t.years} yrs</p>
            </button>
          ))}
        </div>

        {/* FAQ */}
        <h3 style={sectionTitle}>FAQs</h3>
        <div style={{ ...card, padding: "2px 14px" }}>
          {FAQ.map(([q, a], i) => (
            <div key={q} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
              <button onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i} style={{ width: "100%", background: "none", border: "none", padding: "13px 0", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left" }}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{q}</span>
                <span style={{ display: "flex", transform: faq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><ChevronDown s={16} c="var(--ink-mute)" /></span>
              </button>
              {faq === i && <p className="fade-up" style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Service detail ───────────────────────── */

export function ServiceDetailPage({ type, reviews, onBack, onBook }: {
  type: ServiceType; reviews: Review[]; onBack: () => void; onBook: () => void;
}) {
  const o = offeringOf(type);
  const ic = SERVICE_ICON[type];
  // Technician reviews double as service testimonials in the demo.
  const quotes = reviews.filter((r) => r.techId).slice(0, 2);

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title={type} onBack={onBack} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: ic.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><ic.Icon s={28} c={ic.fg} /></div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{o.type}</p>
              <p style={{ margin: "1px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>{o.tagline}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {[[<StarIcon key="s" s={13} />, `${o.rating} · ${o.bookings} booked`], [<ClockIcon key="c" s={14} c="var(--blue)" />, o.duration]].map(([i, t], k) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, background: "var(--bg-secondary)", padding: "6px 10px", borderRadius: 999 }}>{i}{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 14 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: o.price ? "var(--blue-dark)" : "var(--success-text)" }}>{o.price ? inr(o.price) : "FREE"}</span>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{o.priceNote}</span>
          </div>
        </div>

        <h3 style={sectionTitle}>What&apos;s included</h3>
        <div style={{ ...card, padding: "4px 14px" }}>
          {o.includes.map((t, i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckIcon s={12} c="var(--success-text)" /></span>
              <span style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>{t}</span>
            </div>
          ))}
        </div>

        <div style={{ ...card, padding: 14, marginTop: 12, display: "flex", gap: 12, alignItems: "center", background: "var(--gold-tint)", boxShadow: "none" }}>
          <ShieldIcon s={24} c="var(--gold-dark)" />
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}><b>Zavtoo promise:</b> verified technicians, genuine parts and a 30-day re-visit guarantee.</p>
        </div>

        {quotes.length > 0 && (
          <>
            <h3 style={sectionTitle}>What customers say</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              {quotes.map((r) => <ReviewCard key={r.id} r={r} />)}
            </div>
          </>
        )}
      </div>
      <Footer>
        <PrimaryButton onClick={onBook}>Book {type} <ArrowRight s={17} c="white" w={2.2} /></PrimaryButton>
      </Footer>
    </div>
  );
}

