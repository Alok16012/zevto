"use client";

import { useState } from "react";
import { ChatIcon, PhoneIcon, StarIcon } from "./icons";
import PurifierArt from "./PurifierArt";
import ProductImage from "./ProductImage";
import TechAvatar from "./TechAvatar";
import { Avatar, Footer, PageHeader, PrimaryButton, StarPicker, Stars, card, field, label, sectionTitle } from "./ui";
import { RATING_TAGS, initialsOf, productById, type Review, type ServiceRating, type ServiceRequest, type Technician, servicePincodes } from "../lib/data";

const STAR_WORDS = ["", "Terrible", "Bad", "Okay", "Good", "Excellent"];

/* ───────────────────────── Shared bits ───────────────────────── */

export function ReviewCard({ r }: { r: Review }) {
  return (
    <div style={{ ...card, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar initials={initialsOf(r.author)} size={34} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{r.author}{r.mine && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: "var(--blue)", background: "var(--blue-tint)", padding: "1px 7px", borderRadius: 999 }}>YOU</span>}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Stars value={r.stars} size={12} /><span style={{ fontSize: 11, color: "var(--ink-mute)" }}>{r.date}</span></div>
        </div>
      </div>
      {r.body && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>{r.body}</p>}
    </div>
  );
}

/** Average + 5→1 bar breakdown. `base` blends in the catalogue's historic count. */
export function RatingSummary({ reviews, baseRating, baseCount }: { reviews: Review[]; baseRating: number; baseCount: number }) {
  const count = baseCount + reviews.filter((r) => r.mine).length;
  const extra = reviews.filter((r) => r.mine).reduce((s, r) => s + r.stars, 0);
  const avg = count ? (baseRating * baseCount + extra) / count : 0;
  // Spread the historic count by the sample reviews' mix so the bars look plausible.
  const mix = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.stars === n).length);
  const total = mix.reduce((a, b) => a + b, 0) || 1;
  return (
    <div style={{ ...card, padding: 16, display: "flex", gap: 18, alignItems: "center" }}>
      <div style={{ textAlign: "center", minWidth: 76 }}>
        <p style={{ margin: 0, fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>{avg.toFixed(1)}</p>
        <Stars value={avg} size={13} />
        <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--ink-mute)" }}>{count} ratings</p>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        {[5, 4, 3, 2, 1].map((n, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11.5, width: 10, color: "var(--ink-soft)" }}>{n}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--line)" }}>
              <div style={{ width: `${(mix[i] / total) * 100}%`, height: "100%", borderRadius: 3, background: n >= 4 ? "var(--green-500)" : n === 3 ? "var(--gold)" : "var(--red)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Product reviews ───────────────────────── */

/** Section embedded at the bottom of the product page. */
export function ProductReviewsSection({ productId, reviews, onSeeAll, onWrite }: {
  productId: string; reviews: Review[]; onSeeAll: () => void; onWrite: () => void;
}) {
  const p = productById(productId)!;
  const mine = reviews.filter((r) => r.productId === productId);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 0 10px" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Ratings &amp; Reviews</h3>
        <button onClick={onWrite} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue)", fontSize: 13, fontWeight: 600 }}>Write a review</button>
      </div>
      <RatingSummary reviews={mine} baseRating={p.rating} baseCount={p.reviews} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {mine.slice(0, 2).map((r) => <ReviewCard key={r.id} r={r} />)}
      </div>
      {mine.length > 2 && (
        <button onClick={onSeeAll} className="press" style={{ width: "100%", marginTop: 10, background: "transparent", border: "1.5px solid var(--blue)", borderRadius: 14, padding: 11, cursor: "pointer", color: "var(--blue)", fontSize: 13.5, fontWeight: 600 }}>
          See all {mine.length} reviews
        </button>
      )}
    </div>
  );
}

type Sort = "recent" | "high" | "low";

export function AllReviewsPage({ productId, reviews, onBack, onWrite }: { productId: string; reviews: Review[]; onBack: () => void; onWrite: () => void }) {
  const p = productById(productId)!;
  const [sort, setSort] = useState<Sort>("recent");
  const [only, setOnly] = useState<number | null>(null);
  const mine = reviews.filter((r) => r.productId === productId);
  const rows = mine.filter((r) => only === null || r.stars === only);
  if (sort === "high") rows.sort((a, b) => b.stars - a.stars);
  if (sort === "low") rows.sort((a, b) => a.stars - b.stars);

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Reviews" onBack={onBack} />
      <div style={{ padding: "0 16px 16px", flex: 1 }}>
        <p style={{ margin: "0 2px 10px", fontSize: 14, fontWeight: 600 }}>{p.name}</p>
        <RatingSummary reviews={mine} baseRating={p.rating} baseCount={p.reviews} />
        <div className="no-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "12px 0" }}>
          {([["recent", "Most recent"], ["high", "Highest"], ["low", "Lowest"]] as const).map(([id, l]) => (
            <Chip key={id} on={sort === id} onClick={() => setSort(id)}>{l}</Chip>
          ))}
          {[5, 4, 3, 2, 1].map((n) => <Chip key={n} on={only === n} onClick={() => setOnly(only === n ? null : n)}>{n} ★</Chip>)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => <ReviewCard key={r.id} r={r} />)}
          {rows.length === 0 && <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, padding: "30px 0" }}>No reviews match this filter.</p>}
        </div>
      </div>
      <Footer><PrimaryButton onClick={onWrite}>Write a review</PrimaryButton></Footer>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} style={{
      flexShrink: 0, borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
      border: on ? "1.5px solid var(--blue)" : "1.5px solid var(--line)",
      background: on ? "var(--blue-tint)" : "var(--surface)", color: on ? "var(--blue)" : "var(--text-secondary)",
    }}>{children}</button>
  );
}

export function WriteReviewPage({ productId, existing, onBack, onSubmit }: {
  productId: string; existing?: Review; onBack: () => void; onSubmit: (stars: number, body: string) => void;
}) {
  const p = productById(productId)!;
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title={existing ? "Edit your review" : "Write a review"} onBack={onBack} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        <div style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 60, height: 60, borderRadius: 12, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}><ProductImage product={p} size={54} /></div>
          <div><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{p.name}</p><p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>{p.spec}</p></div>
        </div>
        <div style={{ ...card, padding: "18px 14px", marginTop: 12, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: 14.5, fontWeight: 700 }}>How would you rate it?</p>
          <StarPicker value={stars} onChange={setStars} size={36} />
          <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 600, color: "var(--gold-dark)", minHeight: 20 }}>{STAR_WORDS[stars]}</p>
        </div>
        <label style={{ ...label, marginTop: 16 }} htmlFor="rv-body">Your review <span style={{ fontWeight: 400, color: "var(--ink-mute)" }}>(optional)</span></label>
        <textarea id="rv-body" rows={5} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="What did you like or dislike? How's the water taste?" style={{ ...field, resize: "none" }} />
        <p style={{ margin: "4px 2px 12px", fontSize: 11, color: "var(--ink-mute)", textAlign: "right" }}>{body.length}/500</p>
      </div>
      <Footer><PrimaryButton disabled={!stars} onClick={() => onSubmit(stars, body.trim())}>{existing ? "Update Review" : "Submit Review"}</PrimaryButton></Footer>
    </div>
  );
}

/* ───────────────────────── Technician profile ───────────────────────── */

export function TechnicianPage({ tech, reviews, onBack, onChat }: { tech: Technician; reviews: Review[]; onBack: () => void; onChat: () => void }) {
  const mine = reviews.filter((r) => r.techId === tech.id);
  return (
    <div>
      <PageHeader title="Technician" onBack={onBack} />
      <div style={{ padding: "0 16px 24px" }}>
        <div style={{ ...card, padding: 18, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><TechAvatar id={tech.id} name={tech.name} size={84} ring /></div>
          <p style={{ margin: "10px 0 0", fontSize: 18, fontWeight: 700 }}>{tech.name}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>Technician ID <b style={{ color: "var(--ink)" }}>{tech.code}</b></p>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--success-text)", fontWeight: 600 }}>✓ Verified · background checked</p>
          <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--ink-mute)" }}>Serves pincodes {tech.pincodes.join(", ")}</p>
          <div style={{ display: "flex", marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            {[[<><StarIcon s={14} /> {tech.rating}</>, "Rating"], [`${tech.jobs.toLocaleString("en-IN")}+`, "Jobs done"], [`${tech.years} yrs`, "Experience"]].map(([v, l], i) => (
              <div key={i} style={{ flex: 1, borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>{v}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)" }}>{l}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <a href={`tel:${tech.phone}`} className="press" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 11, borderRadius: 12, background: "var(--success)", color: "var(--success-text)", fontSize: 13.5, fontWeight: 600, textDecoration: "none" }}><PhoneIcon s={17} c="var(--success-text)" /> Call</a>
            <button onClick={onChat} className="press" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 11, borderRadius: 12, background: "var(--blue-tint)", color: "var(--blue)", fontSize: 13.5, fontWeight: 600, border: "none", cursor: "pointer" }}><ChatIcon s={17} c="var(--blue)" /> Chat</button>
          </div>
        </div>

        <h3 style={sectionTitle}>Skills</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tech.skills.map((s) => <span key={s} style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", background: "var(--blue-tint)", padding: "6px 12px", borderRadius: 999 }}>{s}</span>)}
        </div>
        <p style={{ margin: "10px 2px 0", fontSize: 12.5, color: "var(--ink-soft)" }}>Speaks {tech.languages}</p>

        <h3 style={sectionTitle}>Customer reviews ({mine.length})</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mine.map((r) => <ReviewCard key={r.id} r={r} />)}
          {mine.length === 0 && <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, padding: "20px 0" }}>No reviews yet.</p>}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Rate a finished service ───────────────────────── */

export function RateServiceCard({ techName, onSubmit }: { techName?: string; onSubmit: (r: ServiceRating) => void }) {
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const toggle = (t: string) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));

  return (
    <div className="fade-up" style={{ ...card, padding: 16, marginTop: 12 }}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, textAlign: "center" }}>How was the service?</p>
      {techName && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", textAlign: "center" }}>Rate your visit with {techName}</p>}
      <div style={{ margin: "12px 0 4px" }}><StarPicker value={stars} onChange={setStars} /></div>
      <p style={{ margin: 0, textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--gold-dark)", minHeight: 20 }}>{STAR_WORDS[stars]}</p>
      {stars > 0 && (
        <div className="fade-up">
          <p style={{ margin: "12px 0 8px", fontSize: 13, fontWeight: 600 }}>{stars >= 4 ? "What went well?" : "What could be better?"}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {RATING_TAGS.map((t) => <Chip key={t} on={tags.includes(t)} onClick={() => toggle(t)}>{t}</Chip>)}
          </div>
          <textarea rows={3} maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Comments"
            placeholder="Anything else you'd like to tell us?" style={{ ...field, resize: "none", marginTop: 12 }} />
        </div>
      )}
      <PrimaryButton tone="gold" disabled={!stars} onClick={() => onSubmit({ stars, tags, comment: comment.trim() })} style={{ marginTop: 12 }}>Submit Feedback</PrimaryButton>
    </div>
  );
}

/** Read-only "you rated this" card once feedback is in. */
export function ServiceRatedCard({ rating }: { rating: ServiceRating }) {
  return (
    <div style={{ ...card, padding: 14, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>Your rating</p>
        <Stars value={rating.stars} size={15} />
      </div>
      {rating.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {rating.tags.map((t) => <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "var(--success-text)", background: "var(--success)", padding: "3px 9px", borderRadius: 999 }}>{t}</span>)}
        </div>
      )}
      {rating.comment && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>&ldquo;{rating.comment}&rdquo;</p>}
    </div>
  );
}

/* ───────────────────────── My reviews (profile) ───────────────────────── */

export function MyReviewsPage({ reviews, services, onBack, onEditProduct, onTrack }: {
  reviews: Review[]; services: ServiceRequest[]; onBack: () => void; onEditProduct: (productId: string) => void; onTrack: (id: string) => void;
}) {
  const productReviews = reviews.filter((r) => r.mine && r.productId);
  const rated = services.filter((s) => s.rating);
  const pending = services.filter((s) => s.current === 4 && !s.rating);
  return (
    <div>
      <PageHeader title="My Ratings & Reviews" onBack={onBack} />
      <div style={{ padding: "0 16px 24px" }}>
        {pending.length > 0 && (
          <>
            <h3 style={{ ...sectionTitle, marginTop: 0 }}>Waiting for your rating</h3>
            {pending.map((s) => (
              <button key={s.id} onClick={() => onTrack(s.id)} className="press" style={{ ...card, width: "100%", border: "1.5px solid var(--gold)", padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>⭐</span>
                <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{s.type} · {s.product}</span><span style={{ fontSize: 12, color: "var(--ink-soft)" }}>#{s.ref} · {s.date}</span></span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold-dark)" }}>Rate →</span>
              </button>
            ))}
          </>
        )}

        <h3 style={{ ...sectionTitle, marginTop: pending.length ? 20 : 0 }}>Product reviews</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {productReviews.map((r) => (
            <div key={r.id}>
              <p style={{ margin: "0 2px 6px", fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)" }}>{productById(r.productId!)?.name}</p>
              <ReviewCard r={r} />
              <button onClick={() => onEditProduct(r.productId!)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, padding: "6px 2px" }}>Edit review</button>
            </div>
          ))}
          {productReviews.length === 0 && <p style={{ ...card, margin: 0, padding: 16, textAlign: "center", color: "var(--ink-soft)", fontSize: 13 }}>You haven&apos;t reviewed any products yet. Open a delivered order to review it.</p>}
        </div>

        <h3 style={sectionTitle}>Service ratings</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rated.map((s) => (
            <button key={s.id} onClick={() => onTrack(s.id)} className="press" style={{ ...card, border: "none", padding: 14, textAlign: "left", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.type} · {s.product}</span>
                <Stars value={s.rating!.stars} />
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>{s.technician?.name ?? "Technician"} · {s.date}</p>
            </button>
          ))}
          {rated.length === 0 && <p style={{ ...card, margin: 0, padding: 16, textAlign: "center", color: "var(--ink-soft)", fontSize: 13 }}>No service ratings yet.</p>}
        </div>
      </div>
    </div>
  );
}
