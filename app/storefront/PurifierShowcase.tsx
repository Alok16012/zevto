import Link from "next/link";
import { ArrowRight } from "../components/icons";
import { SITE_IMAGES } from "../lib/data";
import { whatsappWith } from "./content";
import s from "./purifier-showcase.module.css";

/** Zavtoo campaign artwork, kept separate from priced catalogue listings. Photos and
 * captions come from Admin → Website images (the "showcase" slot). */
export default function PurifierShowcase({ compact = false }: { compact?: boolean }) {
  const { images, captions } = SITE_IMAGES.showcase;
  const items = images.map((src, i) => ({ src, name: "Zavtoo", detail: captions[i] || "Zavtoo water purifier." }));
  if (!items.length) return null;
  return (
    <section className={`${s.section} ${compact ? s.compact : ""}`} aria-label="Water purifier showcase">
      <div className={s.heading}>
        <div><span className={s.eyebrow}>PURITY, WITH PERSONALITY</span><h2>Good water. Beautifully designed.</h2><p>Explore finishes, forms and the little details. We&apos;ll help you find the right fit for your home.</p></div>
        <Link href="/shop?category=domestic" className={s.browse}>Explore purifiers <ArrowRight s={17} /></Link>
      </div>
      <div className={s.grid}>
        {items.map((item, index) => (
          <article key={`${index}-${item.src}`} className={`${s.card} ${index === 0 ? s.featured : ""}`}>
            <a href={item.src} target="_blank" rel="noopener noreferrer" className={s.imageLink} aria-label={`View full ${item.name} purifier image in a new tab`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.src} alt={`${item.name} water purifier — ${item.detail}`} loading="lazy" />
              <span className={s.zoom}>View image <span aria-hidden="true">↗</span></span>
            </a>
            <div className={s.caption}>
              <div><h3>{item.name}</h3><p>{item.detail}</p></div>
              <a href={whatsappWith(`Hi Zavtoo, I'd like to know about the ${item.name} purifier in the ${item.detail.split(".")[0].toLowerCase()} finish shown on your website. Please share available models and details.`)} target="_blank" rel="noopener noreferrer" className={s.enquire} aria-label={`Enquire about the ${item.detail.split(".")[0].toLowerCase()} ${item.name} purifier`}><ArrowRight s={18} /></a>
            </div>
          </article>
        ))}
      </div>
      <p className={s.note}>Like a design? Ask our team about available models, specifications and pricing.</p>
    </section>
  );
}
