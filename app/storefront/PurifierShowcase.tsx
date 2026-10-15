import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "../components/icons";
import { whatsappWith } from "./content";
import s from "./purifier-showcase.module.css";

const PURIFIERS = [
  { name: "Zavtoo", detail: "Sea-glass blue. Fresh and understated.", src: "/purifier-showcase/zavtoo-seaglass-v2.png", width: 1122, height: 1402, alt: "Light blue Zavtoo water purifier with a translucent ribbed tank and chrome tap in an aqua studio setting" },
  { name: "Zavtoo", detail: "Graphite. A little more character.", src: "/purifier-showcase/zavtoo-graphite-v2.png", width: 1122, height: 1402, alt: "Graphite Zavtoo water purifier against a deep teal water backdrop, with tap and indicator detail photographs" },
  { name: "Zavtoo", detail: "Pearl white. Clean, contemporary lines.", src: "/purifier-showcase/zavtoo-pearl-v2.png", width: 1122, height: 1402, alt: "Pearl white Zavtoo water purifier with a smoked window and chrome tap on a white pedestal with flowing water" },
  { name: "Zavtoo", detail: "Titanium grey. Quiet sophistication.", src: "/purifier-showcase/zavtoo-titanium-v2.png", width: 1122, height: 1402, alt: "Titanium grey Zavtoo water purifier with a translucent tank and chrome tap against flowing mint fabric" },
  { name: "Zavtoo", detail: "White and aqua. A natural pairing.", src: "/purifier-showcase/zavtoo-aqua-v2.png", width: 1122, height: 1402, alt: "White and turquoise Zavtoo water purifier beside a glass water droplet in a luminous aqua setting" },
];

/** Zavtoo campaign artwork, kept separate from priced catalogue listings. */
export default function PurifierShowcase({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`${s.section} ${compact ? s.compact : ""}`} aria-label="Water purifier showcase">
      <div className={s.heading}>
        <div><span className={s.eyebrow}>PURITY, WITH PERSONALITY</span><h2>Good water. Beautifully designed.</h2><p>Explore finishes, forms and the little details. We&apos;ll help you find the right fit for your home.</p></div>
        <Link href="/shop?category=domestic" className={s.browse}>Explore purifiers <ArrowRight s={17} /></Link>
      </div>
      <div className={s.grid}>
        {PURIFIERS.map((item, index) => (
          <article key={item.src} className={`${s.card} ${index === 0 ? s.featured : ""}`}>
            <a href={item.src} target="_blank" rel="noopener noreferrer" className={s.imageLink} aria-label={`View full ${item.name} purifier image in a new tab`}>
              <Image src={item.src} alt={item.alt} width={item.width} height={item.height}
                sizes={compact ? "(max-width: 700px) 220px, 240px" : index === 0 ? "(max-width: 700px) 90vw, 480px" : "(max-width: 700px) 44vw, 290px"} />
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
