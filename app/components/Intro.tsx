"use client";

import { useRef, useState } from "react";
import { ArrowRight, ShieldIcon, WrenchIcon } from "./icons";
import PurifierArt from "./PurifierArt";
import { PrimaryButton } from "./ui";

/** Brand splash — deep navy so the Zavtoo gradient logo reads the way it was drawn. */
export function SplashScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 200,
      background: "linear-gradient(165deg,#04246b 0%,#020b24 100%)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", right: -80, top: -90, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,184,207,0.32), transparent 70%)" }} />
      <div style={{ position: "absolute", left: -70, bottom: 120, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)" }} />
      {/* Soft wave, echoing water */}
      <svg viewBox="0 0 400 160" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: 200 }} aria-hidden="true">
        <path d="M0 70 C 90 20, 170 120, 260 70 S 380 30, 400 60 V160 H0z" fill="rgba(255,255,255,0.06)" />
        <path d="M0 100 C 110 60, 190 150, 290 100 S 380 80, 400 95 V160 H0z" fill="rgba(124,235,84,0.10)" />
      </svg>

      <div className="fade-up" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/zavtoo-logo.png" alt="Zavtoo Pani Filter Pvt Ltd" style={{ width: 250, maxWidth: "70%", height: "auto", display: "block" }} />
        <p style={{ margin: "18px 0 0", fontSize: 15, color: "rgba(255,255,255,0.75)" }}>Pure Water. Better Life.</p>
      </div>

      <div style={{ padding: "0 20px calc(28px + env(safe-area-inset-bottom))", position: "relative", zIndex: 1 }}>
        <PrimaryButton tone="gold" onClick={onStart}>Get Started <ArrowRight s={18} c="var(--blue-dark)" /></PrimaryButton>
      </div>
    </div>
  );
}

const SLIDES = [
  {
    title: "Pure Water", accent: "for a Healthier Life",
    body: "RO purifiers, service & AMC — all in one place.",
    art: <PurifierArt kind="premium" size={220} />,
  },
  {
    title: "Book a Technician", accent: "in under a minute",
    body: "Installation, repair or AMC visit — pick a date and slot, we handle the rest.",
    art: <div style={{ width: 170, height: 170, borderRadius: "50%", background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}><WrenchIcon s={84} c="var(--blue)" w={1.4} /></div>,
  },
  {
    title: "Stay Protected", accent: "with AMC plans",
    body: "Timely filter changes and free visits. We remind you before your plan runs out.",
    art: <div style={{ width: 170, height: 170, borderRadius: "50%", background: "var(--gold-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}><ShieldIcon s={84} c="var(--gold-dark)" w={1.4} /></div>,
  },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const next = () => {
    if (last) return onDone();
    const el = trackRef.current;
    el?.scrollTo({ left: (index + 1) * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 190, background: "var(--app-bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "18px 20px 0" }}>
        <button onClick={onDone} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", fontSize: 14, fontWeight: 600 }}>Skip</button>
      </div>

      <div ref={trackRef} className="no-scroll"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        style={{ flex: 1, display: "flex", overflowX: "auto", scrollSnapType: "x mandatory" }}>
        {SLIDES.map((s, i) => (
          <div key={i} style={{ flex: "0 0 100%", scrollSnapAlign: "start", padding: "26px 24px 0", display: "flex", flexDirection: "column" }}>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "var(--ink)", lineHeight: 1.2 }}>
              {s.title}<br /><span style={{ color: "var(--blue)" }}>{s.accent}</span>
            </h1>
            <p style={{ margin: "12px 0 0", fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.55, maxWidth: 300 }}>{s.body}</p>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240 }}>{s.art}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "8px 0 20px" }}>
        {SLIDES.map((_, i) => (
          <span key={i} style={{
            width: i === index ? 20 : 7, height: 7, borderRadius: 999,
            background: i === index ? "var(--blue)" : "rgba(11,92,255,0.22)",
            transition: "width 0.3s, background 0.3s",
          }} />
        ))}
      </div>

      <div style={{ padding: "0 20px calc(28px + env(safe-area-inset-bottom))" }}>
        <PrimaryButton onClick={next}>{last ? "Let's go" : "Next"} <ArrowRight s={18} c="white" /></PrimaryButton>
      </div>
    </div>
  );
}
