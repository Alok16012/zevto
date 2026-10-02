"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckIcon, ShieldIcon, WrenchIcon } from "../components/icons";
import { PIN_AREAS, PRODUCTS, SERVICE_CATALOG, TIME_SLOTS, inr, type ServiceOffering } from "../lib/data";
import s from "./storefront.module.css";

const KEY = "zavtoo:website-service-bookings:v1";
type Booking = { id: string; service: string; product: string; date: string; slot: string; pincode: string; total: number };
function readBookings(): Booking[] {
  const raw: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is Booking => !!b && typeof b === "object" &&
    typeof b.id === "string" && SERVICE_CATALOG.some(s => s.type === b.service) &&
    typeof b.product === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date) &&
    TIME_SLOTS.includes(b.slot) && typeof b.pincode === "string" && Number.isFinite(b.total));
}
function indiaDate(offset = 0) {
  const now = new Date(Date.now() + offset * 86400000);
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(p => p.type === type)!.value).join("-");
}
function dateLabel(date: string) {
  return new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" });
}
export function ServiceBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const load = () => {
      try { setBookings(readBookings()); setError(""); }
      catch { setError("Saved service bookings could not be read in this browser."); }
      setLoaded(true);
    };
    load();
    const sync = (e: StorageEvent) => { if (e.key === KEY || e.key === null) load(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return <section id="service-bookings" className={s.bookingHistory}>
    <div className={s.sectionHeading}><h2>Service bookings</h2><Link href="/services" className={s.textLink}>Book a service</Link></div>
    {error ? <p role="alert" className={s.warning}>{error}</p> : !loaded ? <p role="status">Loading bookings…</p> : !bookings.length ? <p>No service bookings yet. Choose a service to arrange a visit.</p> :
      <div className={s.orderList}>{bookings.map(b => <article key={b.id}>
        <div className={s.orderHead}><div><strong>{b.service} · {b.id}</strong><span>{dateLabel(b.date)} · {b.slot} IST</span></div><span className={s.demoBadge}>Demo request saved</span></div>
        <div className={s.orderLine}><WrenchIcon /><div>{b.product}<small>{PIN_AREAS[b.pincode] || b.pincode} · {b.pincode}</small></div></div>
        <div className={s.orderTotal}><span>Service charge</span><strong>{b.total ? inr(b.total) : "Included"}</strong></div>
      </article>)}</div>}
  </section>;
}

export default function ServiceBooking({ service }: { service: ServiceOffering }) {
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Booking | null>(null);
  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const busy = useRef(false);
  useEffect(() => { setMinDate(indiaDate(1)); setMaxDate(indiaDate(30)); }, []);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    setError("");
    if (!PIN_AREAS[pincode]) { setError("This pincode is outside our current service area. We cover selected areas in Noida, Ghaziabad and Gurugram."); return; }
    if (!date || date < indiaDate(1) || date > indiaDate(30) || !TIME_SLOTS.includes(slot)) { setError("Choose an appointment from tomorrow through the next 30 days and select a time slot."); return; }
    const form = new FormData(e.currentTarget);
    const product = String(form.get("product") || "").trim();
    if (!product || !String(form.get("name") || "").trim() || String(form.get("address") || "").trim().length < 8) { setError("Please enter your name, purifier and a complete service address."); return; }
    busy.current = true;
    const booking: Booking = { id: `SVC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, service: service.type, product, date, slot, pincode, total: service.price };
    try {
      localStorage.setItem(KEY, JSON.stringify([booking, ...readBookings()]));
      setReceipt(booking);
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch { setError("We couldn't save your booking. Enable browser storage and try again. Your request has not been placed."); }
    finally { busy.current = false; }
  }
  if (receipt) return <div className={s.empty}>
    <span className={s.successIcon}><CheckIcon s={34} /></span>
    <h1>Your demo service request is saved.</h1>
    <p>{receipt.service} · {receipt.id}</p>
    <p>{dateLabel(receipt.date)} · {receipt.slot} IST<br />{PIN_AREAS[receipt.pincode]} · {receipt.pincode}</p>
    <p>No payment was taken and no technician has been dispatched. You can find this request in your website bookings.</p>
    <Link href="/orders#service-bookings" className={s.primary}>View my service bookings</Link>
    <Link href="/services" className={s.textLink}>Explore other services</Link>
  </div>;
  return <>
    <div className={s.pageHeading}><span className={s.kicker}>CARE, RIGHT AT YOUR DOORSTEP</span><h1>Book {service.type === "AMC" ? "annual maintenance" : service.type.toLowerCase()}.</h1><p>{service.tagline}. Choose your preferred appointment below.</p></div>
    <div className={s.checkoutGrid}>
      <form className={s.checkoutForm} onSubmit={submit}>
        <h2>Your purifier & contact details</h2>
        <p className={s.formNote}>Demo booking: use sample contact and address details. These details are not stored or sent.</p>
        <div className={s.formGrid}>
          <label className={s.full}>Purifier / model<select name="product" required defaultValue=""><option value="" disabled>Select your purifier</option>{PRODUCTS.filter(p => p.category !== "spare").map(p => <option key={p.id}>{p.name}</option>)}{service.type !== "Installation" && <option>Other purifier</option>}</select></label>
          <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>
          <label>Mobile number<input name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required pattern="[6-9][0-9]{9}" maxLength={10} title="Enter a 10-digit Indian mobile number starting with 6–9" /></label>
          <label className={s.full}>Service address<input name="address" autoComplete="street-address" required minLength={8} maxLength={200} placeholder="House / flat, street and locality" /></label>
          <label>City<input name="city" autoComplete="address-level2" required maxLength={80} /></label>
          <label>Pincode<input name="pincode" autoComplete="postal-code" inputMode="numeric" required pattern="[1-9][0-9]{5}" maxLength={6} value={pincode} onChange={e => { setPincode(e.target.value.replace(/\D/g, "")); setError(""); }} /></label>
        </div>
        {pincode.length === 6 && <p role="status" className={PIN_AREAS[pincode] ? s.formNote : s.warning}>{PIN_AREAS[pincode] ? `Service area: ${PIN_AREAS[pincode]}` : "This pincode is outside our current service area."}</p>}
        <h2>Choose your appointment</h2>
        <p className={s.formNote}>Select a preferred slot in the next 30 days. All times are India Standard Time.</p>
        <div className={s.formGrid}>
          <label>Preferred date<input name="date" type="date" required min={minDate} max={maxDate} value={date} onInput={e => { setDate(e.currentTarget.value); setError(""); }} /></label>
          <label>Preferred time<select name="slot" required value={slot} onChange={e => setSlot(e.target.value)}><option value="" disabled>Select a time slot</option>{TIME_SLOTS.map(time => <option key={time}>{time}</option>)}</select></label>
          <label className={s.full}>Notes for the technician (optional)<textarea name="notes" rows={3} maxLength={1000} placeholder="Tell us about the purifier or any issue you are facing" /></label>
        </div>
        {service.type === "Installation" && <label className={s.consent}><input type="checkbox" required /> This installation is for a Zavtoo purifier. Standard installation is included; additional parts or work may need a separate quote.</label>}
        <label className={s.consent}><input type="checkbox" required /> I understand this is a demo service request and no real visit is scheduled.</label>
        {error && <p className={s.warning} role="alert">{error}</p>}
        <button className={s.primary} disabled={!minDate} type="submit">Confirm demo booking{service.price ? ` · ${inr(service.price)}` : " · Included"}</button>
        <Link href="/services" className={s.textLink}>Back to services</Link>
      </form>
      <aside className={`${s.summary} ${s.bookingSummary}`}>
        <h2>{service.type === "AMC" ? "Annual maintenance" : service.type}</h2>
        <p>{service.tagline}</p>
        <ul>{service.includes.map(item => <li key={item}><CheckIcon s={16} />{item}</li>)}</ul>
        <div><span>Duration</span><strong>{service.duration}</strong></div>
        <div><span>Preferred date</span><strong>{date ? dateLabel(date) : "Choose a date"}</strong></div>
        <div><span>Time slot</span><strong>{slot || "Choose a slot"}</strong></div>
        <div className={s.total}><span>Service charge</span><strong>{service.price ? inr(service.price) : "Included"}</strong></div>
        <p className={s.formNote}>{service.priceNote}. {service.type === "Repair" ? "Replacement parts are charged separately." : ""}</p>
        <p className={s.demoNote}><ShieldIcon s={18} /> Demo booking · no payment collected</p>
      </aside>
    </div>
  </>;
}
