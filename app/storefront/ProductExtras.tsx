"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CloseIcon, ShieldIcon } from "../components/icons";
import type { Product } from "../lib/data";
import s from "./productExtras.module.css";

/* Product page extras, all edited in Admin → Products & Stock: the 360° view,
 * the specification table, warranty terms and Amazon / Flipkart links. */

/** Below this many frames a "spin" looks jumpy, so the 360° button stays hidden. */
export const MIN_SPIN_FRAMES = 8;
const CATEGORY: Record<Product["category"], string> = { domestic: "Home water purifier", commercial: "Commercial RO plant", spare: "Spare part / filter" };

/* ─────── 360° view ─────── */

export function SpinButton({ product, onOpen }: { product: Product; onOpen: () => void }) {
  if ((product.spinImages?.length ?? 0) < MIN_SPIN_FRAMES) return null;
  return (
    <button type="button" className={s.spinButton} onClick={onOpen} aria-label={`Open 360° view of ${product.name}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><ellipse cx="12" cy="12" rx="9.5" ry="4" /><path d="M16 17.5l2.5-1.6-1.4-2.6" /><path d="M12 3v3M12 18v3" /></svg>
      360° view
    </button>
  );
}

/** Drag, swipe or use the arrow keys to turn the product; it turns slowly until touched. */
export function SpinViewer({ frames, name, onClose }: { frames: string[]; name: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [auto, setAuto] = useState(true);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const n = frames.length;
  const wrap = (i: number) => ((i % n) + n) % n;

  useEffect(() => {
    let count = 0;
    const imgs = frames.map((src) => { const img = new Image(); img.onload = img.onerror = () => setLoaded(++count); img.src = src; return img; });
    return () => imgs.forEach((img) => { img.onload = img.onerror = null; });
  }, [frames]);
  useEffect(() => {
    if (!auto || loaded < n) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % n), 110);
    return () => clearInterval(t);
  }, [auto, loaded, n]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") { setAuto(false); setIndex((i) => wrap(i - 1)); }
      if (e.key === "ArrowRight") { setAuto(false); setIndex((i) => wrap(i + 1)); }
    };
    window.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, onClose]);

  const down = (e: React.PointerEvent<HTMLDivElement>) => { setAuto(false); drag.current = { x: e.clientX, start: index }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    // One frame per ~10px of drag, so a full swipe across turns it all the way round.
    const step = Math.max(4, Math.min(12, e.currentTarget.clientWidth / n / 1.2));
    setIndex(wrap(drag.current.start - Math.round((e.clientX - drag.current.x) / step)));
  };
  const up = () => { drag.current = null; };

  return (
    <div className={s.spinOverlay} role="dialog" aria-modal="true" aria-label={`360° view of ${name}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.spinCard}>
        <div className={s.spinHead}><strong>{name} · 360° view</strong><button type="button" onClick={onClose} aria-label="Close 360° view"><CloseIcon s={22} /></button></div>
        <div className={s.spinStage} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frames[index]} alt={`${name}, angle ${index + 1} of ${n}`} draggable={false} />
          {loaded < n && <span className={s.spinLoading}>Loading {Math.round((loaded / n) * 100)}%</span>}
        </div>
        <input className={s.spinSlider} type="range" min={0} max={n - 1} value={index} aria-label="Turn the product"
          onChange={(e) => { setAuto(false); setIndex(Number(e.target.value)); }} />
        <p className={s.spinHint}>Drag or swipe the photo to turn it · ← → keys work too{!auto && <> · <button type="button" onClick={() => setAuto(true)}>Auto-rotate</button></>}</p>
      </div>
    </div>
  );
}

/* ─────── Also on Amazon & Flipkart ─────── */

export function MarketplaceBox({ product }: { product: Product }) {
  if (!product.amazonUrl && !product.flipkartUrl) return null;
  return (
    <div className={s.market}>
      <span>Also available on</span>
      <div>
        {product.amazonUrl && <a className={s.amazon} href={product.amazonUrl} target="_blank" rel="noopener noreferrer nofollow">Amazon</a>}
        {product.flipkartUrl && <a className={s.flipkart} href={product.flipkartUrl} target="_blank" rel="noopener noreferrer nofollow">Flipkart</a>}
      </div>
    </div>
  );
}

/* ─────── Specifications + warranty terms ─────── */

const DEFAULT_TERMS = [
  "Warranty starts from the date of delivery or installation shown on your invoice.",
  "Covers manufacturing defects in material and workmanship.",
  "Not covered: normal wear and tear, filters and membranes as consumables, damage from improper installation, very high TDS, power surges, physical or water damage, or changes made after purchase.",
  "Repair or service by anyone other than a Zavtoo technician voids the warranty.",
  "To claim, call or WhatsApp 89-294-546-47 with your invoice number.",
];

export function ProductDetails({ product }: { product: Product }) {
  const base = [
    { label: "Category", value: CATEGORY[product.category] },
    { label: "Model", value: product.spec },
    { label: product.category === "spare" ? "Size / pack" : "Purification", value: product.stages },
    { label: "Warranty", value: product.warranty },
  ];
  const custom = (product.specs ?? []).filter((r) => r.label?.trim() && r.value?.trim());
  const taken = new Set(custom.map((r) => r.label.trim().toLowerCase()));
  const rows = [...base.filter((r) => r.value && !taken.has(r.label.toLowerCase())), ...custom];
  const terms = (product.warrantyTerms ?? "").split("\n").map((t) => t.trim()).filter(Boolean);

  return (
    <section className={s.details} aria-label="Specifications and warranty">
      <div className={s.box}>
        <h2>Specifications</h2>
        <table className={s.specs}>
          <tbody>{rows.map((r) => <tr key={r.label}><th scope="row">{r.label}</th><td>{r.value}</td></tr>)}</tbody>
        </table>
      </div>
      <div className={`${s.box} ${s.warranty}`}>
        <h2><ShieldIcon s={22} /> Warranty terms</h2>
        {product.warranty && <p className={s.period}>{product.warranty} warranty</p>}
        <ul>{(terms.length ? terms : DEFAULT_TERMS).map((t) => <li key={t}>{t}</li>)}</ul>
        <Link href="/terms-and-condition" className={s.policyLink}>Full warranty policy →</Link>
      </div>
    </section>
  );
}
