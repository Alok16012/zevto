"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { inr, type ServiceOffering } from "../lib/data";
import { CheckIcon, PlusIcon } from "../components/icons";
import { HELPLINES,
  ABOUT, ADVANTAGES, AMC, BOOKING_SERVICES, BRANDS, COMPANY, CONTACT, HOME_SERVICES, PARTS_SHOWCASE, REVIEW_STATS, SERVICE_BADGES, SERVICE_TITLES,
  STEPS, TESTIMONIALS, VALUE_PROPS, whatsappWith,
} from "./content";
import type { Block, Policy } from "./policies";
import s from "./info.module.css";

/* Website sections and pages built from the Zavtoo Paani Filter content (content.ts, policies.ts). */

const slug = (type: string) => type.toLowerCase().replaceAll(" ", "-");
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2);

export function SectionHead({ kicker, title, text, action }: { kicker: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className={s.head}>
      <div><span className={s.kicker}>{kicker}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>
      {action}
    </div>
  );
}

function Ticks({ items }: { items: string[] }) {
  return <ul className={s.ticks}>{items.map((i) => <li key={i}><CheckIcon s={15} />{i}</li>)}</ul>;
}

/* ───────────── Homepage sections ───────────── */

export function ValueStrip() {
  return <div className={s.valueStrip}>{VALUE_PROPS.map((v) => <div key={v.title}><strong>{v.title}</strong><span>{v.detail}</span></div>)}</div>;
}

export function HomeServices() {
  return (
    <section className={s.section}>
      <SectionHead kicker="OUR SERVICES" title="Complete water purifier solutions for you"
        text="From installation to repair, spare parts to AMC — we cover everything for your water purifier needs across India."
        action={<Link className={s.textLink} href="/services">All services →</Link>} />
      <div className={s.grid3}>
        {HOME_SERVICES.map((sv) => (
          <article key={sv.title} className={s.card}>
            <h3>{sv.title}</h3><p>{sv.text}</p><Ticks items={sv.points} />
            <Link className={s.cardCta} href={sv.href}>{sv.cta} →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Advantages() {
  return (
    <section id="why-zavtoo" className={s.section}>
      <SectionHead kicker="WHY CHOOSE US" title="The Paani Filter advantage"
        text="Decades of expertise, thousands of satisfied customers, and a commitment to delivering pure water to every Indian household." />
      <div className={s.grid4}>
        {ADVANTAGES.map((a) => <article key={a.title} className={s.card}><span className={s.emoji} aria-hidden="true">{a.icon}</span><h3>{a.title}</h3><p>{a.text}</p></article>)}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className={s.section}>
      <SectionHead kicker="HOW IT WORKS" title="Book service in 4 simple steps"
        text="Getting your water purifier serviced has never been easier. Follow these simple steps to get expert help at your doorstep." />
      <ol className={s.steps}>
        {STEPS.map((st, i) => (
          <li key={st.title}><span className={s.stepNo}>{String(i + 1).padStart(2, "0")}</span><span className={s.emoji} aria-hidden="true">{st.icon}</span><h3>{st.title}</h3><p>{st.text}</p></li>
        ))}
      </ol>
      <div className={s.center}><Link className={s.btnPrimary} href="/services">Book service now — it&apos;s easy!</Link></div>
    </section>
  );
}

export function Testimonials({ limit = TESTIMONIALS.length, stats = true }: { limit?: number; stats?: boolean }) {
  return (
    <section className={s.section}>
      <SectionHead kicker="CUSTOMER REVIEWS" title="What our customers say about us"
        text="Don't take our word for it. See what 50,000+ satisfied customers say about Zavtoo Paani Filter." />
      <div className={s.grid3}>
        {TESTIMONIALS.slice(0, limit).map((t) => (
          <figure key={t.name} className={s.card}>
            <span className={s.stars} aria-label="5 out of 5 stars">★★★★★</span>
            <blockquote>“{t.text}”</blockquote>
            <figcaption><span className={s.avatar}>{initials(t.name)}</span><span><strong>{t.name}</strong><small>📍 {t.place} · Verified Purchase</small></span></figcaption>
          </figure>
        ))}
      </div>
      {stats && <div className={s.statRow}>{REVIEW_STATS.map((st) => <div key={st.label}><strong>{st.value}</strong><span>{st.label}</span></div>)}</div>}
    </section>
  );
}

export function Brands({ title = "We service all major brands" }: { title?: string }) {
  return (
    <section className={s.brands} aria-label={title}>
      <h2>{title}</h2>
      <ul>{BRANDS.map((b) => <li key={b}>{b}</li>)}</ul>
    </section>
  );
}

export function OfferBanner() {
  return (
    <p className={s.offer}>🎉 <strong>Special offer:</strong> {COMPANY.offer.text} Use code <b>{COMPANY.offer.code}</b></p>
  );
}

/** "Quick Service Booking": sends the request to the business on WhatsApp (no account needed). */
export function QuickBooking() {
  const [form, setForm] = useState({ name: "", phone: "", city: "", service: "" });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => { setForm({ ...form, [k]: e.target.value }); setErr(""); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const phone = form.phone.replace(/\D/g, "").slice(-10);
    if (form.name.trim().length < 2) return setErr("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setErr("Please enter a valid 10-digit mobile number.");
    if (!form.city.trim()) return setErr("Please enter your city or area.");
    if (!form.service) return setErr("Please choose the service you need.");
    const msg = `Hi Paani Filter, I'd like to book a service.\nName: ${form.name.trim()}\nMobile: ${phone}\nCity / Area: ${form.city.trim()}\nService: ${form.service}`;
    window.open(whatsappWith(msg), "_blank", "noopener");
  };
  return (
    <form className={s.booking} onSubmit={submit} noValidate>
      <h3>🚀 Quick service booking</h3>
      <p>Fill this form and we&apos;ll call you back within 30 minutes!</p>
      <label>Your name<input value={form.name} onChange={set("name")} autoComplete="name" /></label>
      <label>Mobile number<input value={form.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" /></label>
      <label>City / Area<input value={form.city} onChange={set("city")} autoComplete="address-level2" /></label>
      <label>Service required
        <select value={form.service} onChange={set("service")}>
          <option value="">Select service type</option>
          {BOOKING_SERVICES.map((o) => <option key={o}>{o}</option>)}
        </select>
      </label>
      {err && <p role="alert" className={s.formErr}>{err}</p>}
      <button className={s.btnPrimary} type="submit">Book my service now</button>
      <small>Sends your request on WhatsApp · or call <a href={COMPANY.phoneHref}>{COMPANY.phone}</a></small>
    </form>
  );
}

export function StartToday() {
  return (
    <section className={`${s.section} ${s.startToday}`}>
      <div>
        <span className={s.kicker}>GET STARTED TODAY</span>
        <h2>Your pure water journey starts right here</h2>
        <p>Whether you need a quick repair, spare parts, or a complete water purifier installation — we&apos;ve got you covered. Book your service now and experience the difference.</p>
        <div className={s.btnRow}><Link className={s.btnPrimary} href="/services">Book service now</Link><a className={s.btnOutline} href={COMPANY.phoneHref}>Call now: {COMPANY.phone}</a></div>
        <Ticks items={["No hidden charges", "90-day warranty", "Certified technicians"]} />
        <OfferBanner />
      </div>
      <QuickBooking />
    </section>
  );
}

/* ───────────── Spare parts showcase ───────────── */

function PartCard({ part }: { part: (typeof PARTS_SHOWCASE)[number] }) {
  const [active, setActive] = useState(0);
  return (
    <article className={`${s.card} ${s.partCard}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.partPhoto} src={part.photos[active]} alt={`${part.name} — photo ${active + 1}`} loading="lazy" width={600} height={600} />
      <div className={s.partThumbs}>
        {part.photos.map((src, i) => (
          <button key={src} type="button" onClick={() => setActive(i)} aria-label={`Show photo ${i + 1} of ${part.name}`} aria-pressed={i === active}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" width={64} height={64} />
          </button>
        ))}
      </div>
      <h3>{part.name}</h3>
      <p>{part.text}</p>
      <ul className={s.partTags}>{part.tags.map((t) => <li key={t}>{t}</li>)}</ul>
      <div className={s.partActions}>
        {"productId" in part && part.productId
          ? <Link className={s.btnPrimary} href={`/products/${part.productId}`}>View &amp; buy</Link>
          : <a className={s.btnPrimary} href={whatsappWith(`Hi Paani Filter, please share the price and availability of: ${part.name}`)} target="_blank" rel="noopener noreferrer">Get price on WhatsApp</a>}
        <a className={s.btnOutline} href={COMPANY.phoneHref}>Call</a>
      </div>
    </article>
  );
}

export function PartsShowcase() {
  return (
    <section id="spare-parts" className={s.section}>
      <SectionHead kicker="GENUINE SPARE PARTS" title="Spare parts we supply"
        text="Real photos of parts from our store. Housings, cartridges and filters for all major RO brands — ask us for the price and we'll confirm availability right away."
        action={<Link className={s.textLink} href="/shop?category=spare">Shop all spare parts →</Link>} />
      <div className={s.grid3}>{PARTS_SHOWCASE.map((p) => <PartCard key={p.id} part={p} />)}</div>
    </section>
  );
}

/* ───────────── Services page ───────────── */

export function ServicesPage({ catalog }: { catalog: ServiceOffering[] }) {
  return (
    <>
      <div className={s.pageHero}>
        <span className={s.kicker}>OUR SERVICES</span>
        <h1>Complete RO water purifier services & spare parts</h1>
        <p>From expert repair & installation to genuine spare parts delivery pan India — Zavtoo Paani Filter has every solution for your water purifier needs. Any brand, any model, anywhere.</p>
        <div className={s.btnRow}><a className={s.btnPrimary} href="#book">Book a service now</a><Link className={s.btnOutline} href="/shop?category=spare">Shop spare parts</Link></div>
        <div className={s.statRow}>{[["50K+", "Services done"], ["20+", "Years exp."], ["500+", "Spare parts"], ["2 Hr", "Response"], ["Pan India", "Delivery"]].map(([v, l]) => <div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div>
      </div>
      <ValueStrip />

      <section id="book" className={s.section}>
        <SectionHead kicker="PROFESSIONAL WATER PURIFIER SERVICES" title="Expert technicians at your doorstep"
          text="For all RO water purifier needs — fast, reliable, and affordable across India." />
        <div className={s.grid3}>
          {catalog.map((sv) => (
            <article key={sv.type} className={s.card}>
              {SERVICE_BADGES[sv.type] && <span className={s.badge}>{SERVICE_BADGES[sv.type]}</span>}
              <h3>{SERVICE_TITLES[sv.type] ?? sv.type}</h3>
              <p>{sv.tagline}</p>
              <Ticks items={sv.includes} />
              <div className={s.price}><span>Starting from</span><strong>{sv.price ? inr(sv.price) : "Free"}</strong><small>{sv.priceNote}</small></div>
              <Link className={s.btnPrimary} href={`/services/${slug(sv.type)}`}>Book now</Link>
            </article>
          ))}
          <article className={s.card}>
            <span className={s.badge}>📦 Online</span>
            <h3>Spare Parts Supply</h3>
            <p>Order 500+ genuine RO spare parts online at best prices with fast, secure delivery anywhere in India.</p>
            <Ticks items={["500+ parts always in stock", "All brands & models covered", "Pan India fast delivery", "100% genuine products", "Easy returns & exchange"]} />
            <div className={s.price}><span>Parts starting at</span><strong>₹99</strong><small>free shipping above ₹499</small></div>
            <Link className={s.btnPrimary} href="/shop?category=spare">Shop now</Link>
          </article>
        </div>
      </section>

      <PartsShowcase />
      <AmcPlans />
      <HowItWorks />
      <Brands />
      <Testimonials limit={3} stats={false} />
      <TrustCta title="Pure water starts with one call!" text="Book a service or order spare parts today and experience the Paani Filter difference — fast, genuine, affordable, and guaranteed." />
    </>
  );
}

export function AmcPlans() {
  return (
    <section id="amc" className={s.section}>
      <SectionHead kicker="MOST POPULAR SERVICE" title="Annual Maintenance Contract (AMC) plans" text={AMC.intro} />
      <Ticks items={AMC.benefits} />
      <div className={s.plans}>
        {AMC.plans.map((p) => (
          <article key={p.name} className={`${s.card} ${p.best ? s.planBest : ""}`}>
            {p.best && <span className={s.badge}>BEST VALUE</span>}
            <h3><span aria-hidden="true">{p.icon}</span> {p.name}</h3>
            <div className={s.planPrice}><strong>{inr(p.price)}</strong><span>/ year</span></div>
            <Ticks items={p.features} />
            <a className={p.best ? s.btnPrimary : s.btnOutline} href={whatsappWith(`Hi Paani Filter, I want the AMC ${p.name} (${inr(p.price)}/year).`)} target="_blank" rel="noopener noreferrer">Get {p.name.replace(" Plan", "")} plan</a>
          </article>
        ))}
      </div>
      <p className={s.muted}>AMC plans are confirmed on WhatsApp or phone — our team will schedule your first visit.</p>
    </section>
  );
}

function TrustCta({ title, text }: { title: string; text: string }) {
  return (
    <section className={`${s.section} ${s.cta}`}>
      <h2>{title}</h2><p>{text}</p>
      <div className={s.btnRow}><Link className={s.btnPrimary} href="/services">Book a service</Link><a className={s.btnOutline} href={COMPANY.whatsappHref} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a></div>
      <ul className={s.trust}>{["90-Day Warranty", "Any Brand Covered", "Pan India Service", "20+ Years Trusted"].map((t) => <li key={t}><CheckIcon s={15} />{t}</li>)}</ul>
      <OfferBanner />
    </section>
  );
}

/* ───────────── About us ───────────── */

export function AboutPage() {
  const f = ABOUT.founder;
  return (
    <>
      <div className={s.pageHero}>
        <span className={s.kicker}>ABOUT US · EST. 2004</span>
        <h1>{ABOUT.title}</h1>
        <p>{ABOUT.intro}</p>
        <div className={s.btnRow}><a className={s.btnPrimary} href="#story">Our story</a><Link className={s.btnOutline} href="/contact-us">Get in touch</Link></div>
        <div className={s.statRow}>{ABOUT.stats.map((st) => <div key={st.label}><strong>{st.value}</strong><span>{st.label}</span></div>)}</div>
      </div>

      <section id="story" className={`${s.section} ${s.split}`}>
        <div><span className={s.kicker}>OUR STORY</span><h2>{ABOUT.storyTitle}</h2></div>
        <div className={s.prose}>{ABOUT.story.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}</div>
      </section>

      <section className={s.section}>
        <SectionHead kicker="OUR MISSION, VISION & VALUES" title="What drives us every day" />
        <div className={s.grid3}>
          {ABOUT.pillars.map((p) => <article key={p.kicker} className={s.card}><span className={s.kicker}>{p.kicker.toUpperCase()}</span><h3>{p.title}</h3><p>{p.text}</p><Ticks items={p.points} /></article>)}
        </div>
      </section>

      <section className={`${s.section} ${s.founder}`}>
        <div className={s.card}>
          <span className={s.avatarLg}>{initials(f.name)}</span>
          <h3>{f.name}</h3><p>{f.role}</p>
          <Ticks items={f.credentials} />
          <a className={s.textLink} href={COMPANY.phoneHref}>{COMPANY.phone}</a>
        </div>
        <div>
          <span className={s.kicker}>MEET THE FOUNDER</span>
          <h2>The man behind Paani Filter</h2>
          <div className={s.prose}>{f.bio.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}</div>
          <div className={s.statRow}>{f.stats.map((st) => <div key={st.label}><strong>{st.value}</strong><span>{st.label}</span></div>)}</div>
          <blockquote className={s.quote}>“{f.quote}”<cite>— {f.name}, Founder & MD</cite></blockquote>
        </div>
      </section>

      <section className={s.section}>
        <SectionHead kicker="OUR JOURNEY" title="20 years of growth & trust" />
        <ol className={s.timeline}>
          {ABOUT.timeline.map((t) => <li key={t.year}><span className={s.year}>{t.year}</span><div><h3>{t.title}</h3><p>{t.text}</p></div></li>)}
        </ol>
      </section>

      <section className={s.section}>
        <SectionHead kicker="OUR ACHIEVEMENTS" title="Numbers that tell our story" />
        <div className={s.grid4}>
          {ABOUT.achievements.map((a) => <article key={a.title} className={s.card}><strong className={s.big}>{a.value}</strong><h3>{a.title}</h3><p>{a.text}</p></article>)}
        </div>
      </section>

      <section className={s.section}>
        <SectionHead kicker="CORE VALUES" title="The principles that guide us" />
        <div className={s.grid3}>
          {ABOUT.values.map((v) => <article key={v.title} className={s.card}><span className={s.emoji} aria-hidden="true">{v.icon}</span><h3>{v.title}</h3><p>{v.text}</p></article>)}
        </div>
      </section>

      <section className={s.section}>
        <SectionHead kicker="WHY 50,000+ INDIANS TRUST PAANI FILTER" title="Experience the difference every time" text={ABOUT.whyIntro} />
        <div className={s.grid3}>
          {ABOUT.why.map((w) => <article key={w.title} className={s.card}><h3><CheckIcon s={16} /> {w.title}</h3><p>{w.text}</p></article>)}
        </div>
      </section>

      <Testimonials limit={3} stats={false} />

      <section className={s.section}>
        <SectionHead kicker="BRANDS" title="Brands we service & trust" />
        <div className={s.grid5}>{ABOUT.brands.map((b) => <article key={b.name} className={s.card}><h3>{b.name}</h3><p>{b.note}</p></article>)}</div>
      </section>

      <TrustCta title="Be part of India's purest water revolution!" text="Join 50,000+ happy Indian families who trust Paani Filter for their daily pure water needs. Book your first service today and experience the difference!" />
    </>
  );
}

/* ───────────── Contact us ───────────── */

export function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => { setForm({ ...form, [k]: e.target.value }); setErr(""); };
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setErr("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").slice(-10))) return setErr("Please enter a valid 10-digit mobile number.");
    if (form.message.trim().length < 5) return setErr("Please write your message.");
    const msg = `Hi Paani Filter,\n${form.message.trim()}\n\nName: ${form.name.trim()}\nMobile: ${form.phone.trim()}${form.email.trim() ? `\nEmail: ${form.email.trim()}` : ""}${form.subject.trim() ? `\nSubject: ${form.subject.trim()}` : ""}`;
    window.open(whatsappWith(msg), "_blank", "noopener");
  };

  return (
    <>
      <div className={s.pageHero}>
        <span className={s.kicker}>CONTACT US</span>
        <h1>{CONTACT.title}</h1>
        <p>{CONTACT.intro}</p>
        <div className={s.btnRow}><a className={s.btnPrimary} href={COMPANY.phoneHref}>Call now: {COMPANY.phone}</a><a className={s.btnOutline} href={COMPANY.whatsappHref} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a></div>
      </div>

      <div className={s.grid4}>
        {CONTACT.cards.map((c) => (
          <a key={c.title} className={`${s.card} ${s.linkCard}`} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            <span className={s.emoji} aria-hidden="true">{c.icon}</span><h3>{c.title}</h3><p>{c.text}</p><strong>{c.value}</strong><small>{c.note}</small>
          </a>
        ))}
      </div>

      <section className={`${s.section} ${s.split}`}>
        <div>
          <span className={s.kicker}>GET IN TOUCH</span>
          <h2>Let&apos;s start a conversation</h2>
          <p className={s.lead}>{CONTACT.conversation}</p>
          <dl className={s.details}>
            <dt>Office & store</dt><dd>{COMPANY.address}, India · <a href={COMPANY.mapHref} target="_blank" rel="noopener noreferrer">Get directions</a></dd>
            <dt>Helplines</dt><dd>{HELPLINES.map((h) => <span key={h.label} style={{ display: "block" }}>{h.label}: <a href={h.href}>{h.number}</a></span>)}</dd>
            <dt>WhatsApp</dt><dd><a href={COMPANY.whatsappHref}>{COMPANY.whatsapp}</a></dd>
            <dt>Email</dt><dd><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></dd>
            <dt>Website</dt><dd><a href={COMPANY.websiteHref}>{COMPANY.website}</a></dd>
            <dt>Working hours</dt><dd>Monday – Sunday: 8:00 AM – 8:00 PM. Emergency support available on WhatsApp after hours.</dd>
            <dt>Business owner</dt><dd>{COMPANY.owner} — {COMPANY.name}, 20+ years in the water purifier industry.</dd>
          </dl>
        </div>
        <form id="contact-form" className={s.booking} onSubmit={send} noValidate>
          <h3>✉️ Send us a message</h3>
          <p>We&apos;ll get back to you within 30 minutes during business hours.</p>
          <label>Your name<input value={form.name} onChange={set("name")} autoComplete="name" /></label>
          <label>Mobile number<input value={form.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" /></label>
          <label>Email (optional)<input type="email" value={form.email} onChange={set("email")} autoComplete="email" /></label>
          <label>Subject (optional)<input value={form.subject} onChange={set("subject")} /></label>
          <label>Message<textarea rows={4} value={form.message} onChange={set("message")} /></label>
          {err && <p role="alert" className={s.formErr}>{err}</p>}
          <button className={s.btnPrimary} type="submit">Send message</button>
          <small>Opens WhatsApp with your message ready to send.</small>
        </form>
      </section>

      <section className={s.section}>
        <SectionHead kicker="OUR LOCATION" title="Find us on the map" text="We're located in Raja Puri, Dwarka Road, New Delhi. Come visit us for any water purifier needs!" />
        <div className={s.map}>
          <iframe title="Paani Filter store on Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=Raja+Puri+Dwarka+Road+New+Delhi+110059&output=embed" />
          <div className={s.card}><h3>Paani Filter Store</h3><p>{COMPANY.address}</p><a className={s.btnPrimary} href={COMPANY.mapHref} target="_blank" rel="noopener noreferrer">Get directions</a></div>
        </div>
      </section>

      <section className={s.section}>
        <SectionHead kicker="BUSINESS HOURS" title="When can you reach us?" text="We're available 7 days a week for your convenience." />
        <div className={s.grid3}>
          {([["Store & office hours", CONTACT.storeHours, "Open 7 days"], ["Technician service hours", CONTACT.techHours, "Technicians available"], ["Customer support hours", CONTACT.supportHours, "WhatsApp always on"]] as const).map(([t, rows, note]) => (
            <article key={t} className={s.card}><h3>{t}</h3><table className={s.hours}><tbody>{rows.map(([d, h]) => <tr key={d}><th>{d}</th><td>{h}</td></tr>)}</tbody></table><small className={s.badge}>{note}</small></article>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <SectionHead kicker="SUPPORT CHANNELS" title="Choose your preferred way to connect" text="Multiple ways to reach us — pick what's most convenient for you." />
        <div className={s.grid4}>
          {CONTACT.channels.map((c) => (
            <article key={c.title} className={s.card}><span className={s.emoji} aria-hidden="true">{c.icon}</span><h3>{c.title}</h3><p>{c.text}</p>
              <a className={s.cardCta} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{c.cta} →</a></article>
          ))}
        </div>
      </section>

      <section className={`${s.section} ${s.split}`}>
        <div><span className={s.kicker}>FAQ</span><h2>Common questions answered</h2><p className={s.lead}>Before reaching out, check if your question is already answered here.</p></div>
        <div className={s.faq}>{CONTACT.faq.map(([q, a]) => <details key={q}><summary>{q}<PlusIcon s={18} /></summary><p>{a}</p></details>)}</div>
      </section>

      <TrustCta title="Still have a question? We're just one click away!" text="Our friendly team is ready to help you with anything — from service bookings to spare parts enquiries. Reply within 30 minutes · 7 days a week support · 20+ years of expertise." />
    </>
  );
}

/* ───────────── Policies ───────────── */

function renderBlock(b: Block, i: number) {
  if ("p" in b) return <p key={i}>{b.p}</p>;
  if ("h" in b) return <h4 key={i}>{b.h}</h4>;
  if ("ul" in b) return <ul key={i}>{b.ul.map((li) => { const [k, ...rest] = li.split(": "); return <li key={li}>{rest.length && k.length < 40 ? <><strong>{k}:</strong> {rest.join(": ")}</> : li}</li>; })}</ul>;
  if ("ol" in b) return <ol key={i} className={s.numbered}>{b.ol.map((o) => <li key={o.title}><strong>{o.title}</strong><span>{o.text}</span></li>)}</ol>;
  if ("table" in b) return (
    <div key={i} className={s.tableWrap}><table className={s.table}>
      {b.table.head.some(Boolean) && <thead><tr>{b.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>}
      <tbody>{b.table.rows.map((r) => <tr key={r[0]}>{r.map((c, j) => j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table></div>
  );
  return <aside key={i} className={s.note}><strong>{b.note.title}</strong><p>{b.note.text}</p></aside>;
}

export function PolicyPage({ policy, related }: { policy: Policy; related: { href: string; label: string }[] }) {
  return (
    <>
      <div className={s.pageHero}>
        <span className={s.kicker}>POLICIES</span>
        <h1>{policy.title}</h1>
        <p>{policy.intro}</p>
        <ul className={s.meta}>{policy.meta.map((m) => <li key={m}>{m}</li>)}</ul>
      </div>
      <div className={s.policy}>
        <nav aria-label="Table of contents" className={s.toc}>
          <strong>Table of contents</strong>
          <ol>{policy.sections.map((sec, i) => <li key={sec.title}><a href={`#section-${i + 1}`}>{sec.title}</a></li>)}</ol>
          <p>Questions? <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
        </nav>
        <article className={s.policyBody}>
          {policy.sections.map((sec, i) => (
            <section key={sec.title} id={`section-${i + 1}`}>
              <h2><span>{i + 1}</span>{sec.title}</h2>
              {sec.sub && <p className={s.sub}>{sec.sub}</p>}
              {sec.blocks.map(renderBlock)}
            </section>
          ))}
          <div className={s.related}><strong>Related pages</strong>{related.map((r) => <Link key={r.href} href={r.href}>{r.label} →</Link>)}</div>
        </article>
      </div>
    </>
  );
}

/* ───────────── Floating WhatsApp ───────────── */

export function WhatsAppFab() {
  return (
    <a className={s.fab} href={COMPANY.whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" /></svg>
      <span>Chat on WhatsApp</span>
    </a>
  );
}
