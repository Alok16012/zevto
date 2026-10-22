"use client";

import { useRef, useState } from "react";
import { PhotoViewer, compressImage } from "../components/PhotoPicker";
import { removeProductImages, uploadProductImage } from "../lib/photos";
import { friendly, supabaseFor } from "../lib/supabase";
import { PRODUCTS, SHOWCASE_PARTS, SITE_IMAGES, SITE_SLOTS, type ShowcasePart, type SiteImages, type SiteSlot } from "../lib/data";
import { Toggle } from "../components/ui";
import { Badge, Btn, Panel, fieldLabel, input, muted } from "./kit";

/* ───────────────────────── Website images ─────────────────────────
 * Every photo on the website that isn't a product photo: the homepage hero, the
 * category tiles, the purifier showcase and the spare parts showcase. Product
 * photos stay in Products & Stock. */

export function SiteImagesSection({ notify }: { notify: (msg: string, bad?: boolean) => void }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p style={{ ...muted, margin: 0, lineHeight: 1.6, fontSize: 13 }}>
        Photos shown on the website. Changes go live straight away. Product photos (purifiers, filters, spares) are managed in <b>Products &amp; Stock</b>.
      </p>
      {SITE_SLOTS.map((s) => <SlotPanel key={s.slot} {...s} notify={notify} />)}
      <ShowcasePartsPanel notify={notify} />
    </div>
  );
}

function SlotPanel({ slot, label, hint, size, max, captions: withCaptions, notify }: (typeof SITE_SLOTS)[number] & { notify: (msg: string, bad?: boolean) => void }) {
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replacing = useRef<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  // Kept here so back-to-back changes build on the last saved list, not a stale reload.
  const [data, setData] = useState<SiteImages>(() => SITE_IMAGES[slot]);
  const [drafts, setDrafts] = useState<string[]>(() => SITE_IMAGES[slot].captions);
  const { images, captions } = data;
  const left = max - images.length;

  /** Saves the new list, then deletes uploaded files that are no longer used. */
  const commit = async (next: SiteImages, label: string, okMsg: string) => {
    setBusy(label); setErr(null);
    const { error } = await supabaseFor("admin").from("site_images").upsert({ slot, images: next.images, captions: next.captions });
    setBusy(null);
    if (error) {
      const msg = /site_images/.test(error.message) ? "Website images aren't set up yet — run supabase/site-images-migration.sql in Supabase first." : friendly(error);
      setErr(msg); notify(msg, true); return false;
    }
    await removeProductImages(images.filter((u) => !next.images.includes(u))).catch(() => undefined);
    SITE_IMAGES[slot as SiteSlot] = next;
    setData(next); setDrafts(next.captions);
    notify(okMsg);
    return true;
  };
  const upload = (files: File[]) => Promise.all(files.map(async (f) => uploadProductImage(`site-${slot}`, await compressImage(f, slot === "hero" ? 2000 : 1400, 0.85))));
  const pad = (list: string[], n: number) => Array.from({ length: n }, (_, i) => list[i] ?? "");

  const add = async (list: FileList | null) => {
    const files = Array.from(list ?? []).slice(0, left);
    if (addRef.current) addRef.current.value = "";
    if (!files.length) return;
    setBusy("Uploading…"); setErr(null);
    try {
      const urls = await upload(files);
      const next = { images: [...images, ...urls], captions: pad(captions, images.length + urls.length) };
      if (!(await commit(next, "Saving…", `${label}: photo added`))) await removeProductImages(urls).catch(() => undefined);
      if ((list?.length ?? 0) > files.length) setErr(`Up to ${max} photo${max > 1 ? "s" : ""} here — extra ones were skipped.`);
    } catch (e) { setErr(friendly(e)); setBusy(null); }
  };
  const replace = async (list: FileList | null) => {
    const i = replacing.current;
    const file = list?.[0];
    if (replaceRef.current) replaceRef.current.value = "";
    if (i == null || !file) return;
    setBusy("Uploading…"); setErr(null);
    try {
      const [url] = await upload([file]);
      const next = { images: images.map((u, j) => (j === i ? url : u)), captions };
      if (!(await commit(next, "Saving…", `${label}: photo replaced`))) await removeProductImages([url]).catch(() => undefined);
    } catch (e) { setErr(friendly(e)); setBusy(null); }
  };
  const move = (i: number, to: number) => {
    const order = images.map((_, j) => j);
    const [k] = order.splice(i, 1);
    order.splice(to, 0, k);
    const caps = pad(captions, images.length);
    void commit({ images: order.map((j) => images[j]), captions: order.map((j) => caps[j]) }, "Saving…", `${label}: order saved`);
  };
  const remove = (i: number) => {
    if (!confirm(`Remove photo ${i + 1} from ${label}?`)) return;
    void commit({ images: images.filter((_, j) => j !== i), captions: pad(captions, images.length).filter((_, j) => j !== i) }, "Deleting…", `${label}: photo removed`);
  };
  const saveCaption = (i: number) => {
    const caps = pad(captions, images.length);
    const text = (drafts[i] ?? "").trim();
    if (text === (caps[i] ?? "")) return;
    void commit({ images, captions: caps.map((c, j) => (j === i ? text : c)) }, "Saving…", `${label}: caption saved`);
  };

  return (
    <Panel title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>{label}<Badge tone={images.length ? "blue" : "amber"}>{images.length}/{max}</Badge></span>}>
      <p style={{ ...muted, margin: "0 0 4px" }}>{hint}</p>
      <PhotoSize size={size} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${slot === "hero" ? 260 : 150}px, 1fr))`, gap: 10 }}>
        {images.map((src, i) => (
          <div key={`${i}-${src}`} style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", background: "var(--surface)" }}>
            <button onClick={() => setView(src)} aria-label={`View photo ${i + 1}`} style={{ position: "relative", width: "100%", aspectRatio: slot === "hero" ? "16 / 10" : "1 / 1", padding: 0, border: "none", background: "var(--bg-secondary)", cursor: "zoom-in", display: "block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${label} photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: slot === "hero" ? "cover" : "contain", display: "block" }} />
              {withCaptions && i === 0 && <span style={{ position: "absolute", top: 6, left: 6 }}><Badge tone="blue">Large</Badge></span>}
            </button>
            {withCaptions && (
              <div style={{ padding: "6px 6px 0" }}>
                <input aria-label={`Caption for photo ${i + 1}`} placeholder="Caption, e.g. Pearl white. Clean lines." value={drafts[i] ?? ""} maxLength={80} disabled={!!busy}
                  onChange={(e) => setDrafts(pad(drafts, images.length).map((c, j) => (j === i ? e.target.value : c)))}
                  onBlur={() => saveCaption(i)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  style={{ ...input, fontSize: 12.5, padding: "7px 9px" }} />
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 6, justifyContent: "center" }}>
              {i > 0 && <Btn small kind="ghost" disabled={!!busy} onClick={() => move(i, i - 1)}>←</Btn>}
              {i < images.length - 1 && <Btn small kind="ghost" disabled={!!busy} onClick={() => move(i, i + 1)}>→</Btn>}
              <Btn small kind="ghost" disabled={!!busy} onClick={() => { replacing.current = i; replaceRef.current?.click(); }}>Replace</Btn>
              <Btn small kind="danger" disabled={!!busy} onClick={() => remove(i)}>Delete</Btn>
            </div>
          </div>
        ))}
        {left > 0 && (
          <button onClick={() => addRef.current?.click()} disabled={!!busy} style={{
            minHeight: 150, borderRadius: 12, border: "1.5px dashed var(--blue)", background: "var(--blue-tint)", color: "var(--blue)",
            cursor: busy ? "wait" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 700, fontSize: 13,
          }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{busy ? "⏳" : "＋"}</span>
            {busy ?? (images.length ? "Add photo" : "Upload photo")}
          </button>
        )}
      </div>
      <input ref={addRef} type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} hidden onChange={(e) => void add(e.target.files)} />
      <input ref={replaceRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void replace(e.target.files)} />
      <p style={{ ...muted, margin: "10px 0 0", color: err ? "var(--error-text)" : undefined, fontWeight: err ? 600 : 400 }}>
        {err ?? (busy && !left ? busy : "JPG, PNG or WebP · large photos are resized automatically")}
      </p>
      {view && <PhotoViewer src={view} onClose={() => setView(null)} />}
    </Panel>
  );
}

/** "Upload size: 1600 × 1000 px" line shown above each set of photos. */
export function PhotoSize({ size }: { size: string }) {
  return <p style={{ margin: "0 0 12px", fontSize: 12.5, fontWeight: 700, color: "var(--blue)" }}>Upload size: {size} · JPG, PNG or WebP</p>;
}

/* ───────────────────────── Spare parts showcase ─────────────────────────
 * The "Spare parts we supply" cards on the shop and services pages (showcase_parts). */

const MAX_PART_PHOTOS = 6;
type Notify = (msg: string, bad?: boolean) => void;
const tableMissing = (m: string) => /showcase_parts/.test(m) ? "The spare parts showcase isn't set up yet — run supabase/showcase-parts-migration.sql in Supabase first." : null;

function ShowcasePartsPanel({ notify }: { notify: Notify }) {
  const [parts, setParts] = useState<ShowcasePart[]>(() => [...SHOWCASE_PARTS]);
  const [busy, setBusy] = useState(false);
  const sync = (next: ShowcasePart[]) => { SHOWCASE_PARTS.splice(0, SHOWCASE_PARTS.length, ...next); setParts(next); };
  const fail = (e: { message: string }) => { notify(tableMissing(e.message) ?? friendly(e), true); return false; };

  const save = async (part: ShowcasePart, i: number) => {
    const { error } = await supabaseFor("admin").from("showcase_parts").upsert({
      id: part.id, name: part.name, text: part.text, tags: part.tags, photos: part.photos, product_id: part.productId ?? null, active: part.active !== false, sort: i + 1,
    });
    if (error) return fail(error);
    sync(parts.map((p) => (p.id === part.id ? part : p)));
    return true;
  };
  const addPart = async () => {
    const id = `part-${Date.now().toString(36)}`;
    const part: ShowcasePart = { id, name: "New spare part", text: "", tags: [], photos: [], active: false };
    setBusy(true);
    const { error } = await supabaseFor("admin").from("showcase_parts").insert({ id, name: part.name, active: false, sort: parts.length + 1 });
    setBusy(false);
    if (error) { fail(error); return; }
    sync([...parts, part]);
    notify("Part added — fill it in, add photos, then switch it on");
  };
  const removePart = async (part: ShowcasePart) => {
    if (!confirm(`Delete “${part.name}” from the website? This can't be undone.`)) return;
    const { error } = await supabaseFor("admin").from("showcase_parts").delete().eq("id", part.id);
    if (error) { fail(error); return; }
    await removeProductImages(part.photos).catch(() => undefined);
    sync(parts.filter((p) => p.id !== part.id));
    notify("Part deleted");
  };
  const move = async (i: number, to: number) => {
    const next = [...parts];
    const [p] = next.splice(i, 1);
    next.splice(to, 0, p);
    const sb = supabaseFor("admin");
    const results = await Promise.all(next.map((p, j) => sb.from("showcase_parts").update({ sort: j + 1 }).eq("id", p.id)));
    const error = results.find((r) => r.error)?.error;
    if (error) { fail(error); return; }
    sync(next);
  };

  return (
    <Panel title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Spare parts showcase<Badge tone="blue">{parts.filter((p) => p.active !== false).length} live</Badge></span>}
      actions={<Btn small disabled={busy} onClick={() => void addPart()}>＋ Add part</Btn>}>
      <p style={{ ...muted, margin: "0 0 12px", lineHeight: 1.5 }}>
        “Spare parts we supply” on the shop and services pages. Link a shop product to show <b>View &amp; buy</b>; otherwise customers get <b>Get price on WhatsApp</b>. Hidden parts and parts without photos don&apos;t show.
      </p>
      <div style={{ display: "grid", gap: 12 }}>
        {parts.map((p, i) => (
          <PartEditor key={p.id} part={p} first={i === 0} last={i === parts.length - 1}
            onSave={(next) => save(next, i)} onDelete={() => void removePart(p)} onMove={(d) => void move(i, i + d)} />
        ))}
        {!parts.length && <p style={{ ...muted, margin: 0 }}>No parts yet. Add one to show the section on the website.</p>}
      </div>
    </Panel>
  );
}

function PartEditor({ part, first, last, onSave, onDelete, onMove }: {
  part: ShowcasePart; first: boolean; last: boolean; onSave: (p: ShowcasePart) => Promise<boolean>; onDelete: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const addRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({ name: part.name, text: part.text, tags: part.tags.join(", "), productId: part.productId ?? "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  const dirty = draft.name !== part.name || draft.text !== part.text || draft.tags !== part.tags.join(", ") || draft.productId !== (part.productId ?? "");
  const spares = PRODUCTS.filter((p) => p.category === "spare" && !p.dealerId && !p.techId);

  const run = async (label: string, next: ShowcasePart) => { setBusy(label); setErr(null); const ok = await onSave(next); setBusy(null); return ok; };
  const saveText = () => {
    if (!draft.name.trim()) { setErr("Give the part a name."); return; }
    void run("Saving…", { ...part, name: draft.name.trim(), text: draft.text.trim(), productId: draft.productId || undefined,
      tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6) });
  };
  const setPhotos = async (photos: string[]) => {
    const ok = await run("Saving…", { ...part, photos });
    if (ok) await removeProductImages(part.photos.filter((u) => !photos.includes(u))).catch(() => undefined);
    return ok;
  };
  const add = async (list: FileList | null) => {
    const files = Array.from(list ?? []).slice(0, MAX_PART_PHOTOS - part.photos.length);
    if (addRef.current) addRef.current.value = "";
    if (!files.length) return;
    setBusy("Uploading…"); setErr(null);
    try {
      const urls = await Promise.all(files.map(async (f) => uploadProductImage(`showcase-${part.id}`, await compressImage(f, 1200, 0.85))));
      if (!(await setPhotos([...part.photos, ...urls]))) await removeProductImages(urls).catch(() => undefined);
    } catch (e) { setErr(friendly(e)); setBusy(null); }
  };
  const movePhoto = (i: number, to: number) => {
    const next = [...part.photos];
    const [x] = next.splice(i, 1);
    next.splice(to, 0, x);
    void setPhotos(next);
  };

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 14, background: part.active === false ? "var(--bg-secondary)" : "var(--surface)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <strong style={{ flex: 1, minWidth: 160, fontSize: 14 }}>{part.name}</strong>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
          {part.active === false ? "Hidden" : "Live"}
          <Toggle on={part.active !== false} label={`Show ${part.name} on the website`} onChange={(on) => void run("Saving…", { ...part, active: on })} />
        </span>
        {!first && <Btn small kind="ghost" disabled={!!busy} onClick={() => onMove(-1)}>↑</Btn>}
        {!last && <Btn small kind="ghost" disabled={!!busy} onClick={() => onMove(1)}>↓</Btn>}
        <Btn small kind="danger" disabled={!!busy} onClick={onDelete}>Delete</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        <label><span style={fieldLabel}>Name</span><input value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={input} /></label>
        <label><span style={fieldLabel}>Tags (comma separated)</span><input value={draft.tags} placeholder="Push-fit ports, O-ring seal" onChange={(e) => setDraft({ ...draft, tags: e.target.value })} style={input} /></label>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Description</span><textarea value={draft.text} rows={2} maxLength={300} onChange={(e) => setDraft({ ...draft, text: e.target.value })} style={{ ...input, resize: "vertical" }} /></label>
        <label><span style={fieldLabel}>Linked shop product (optional)</span>
          <select value={draft.productId} onChange={(e) => setDraft({ ...draft, productId: e.target.value })} style={input}>
            <option value="">None — “Get price on WhatsApp”</option>
            {spares.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", alignItems: "flex-end" }}><Btn disabled={!dirty || !!busy} onClick={saveText}>{busy === "Saving…" ? "Saving…" : "Save details"}</Btn></div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {part.photos.map((src, i) => (
          <div key={`${i}-${src}`} style={{ width: 104, border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--surface)" }}>
            <button onClick={() => setView(src)} aria-label={`View photo ${i + 1}`} style={{ width: "100%", aspectRatio: "1 / 1", padding: 0, border: "none", background: "var(--bg-secondary)", cursor: "zoom-in", display: "block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${part.name} photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </button>
            <div style={{ display: "flex", justifyContent: "center", gap: 2, padding: 4 }}>
              {i > 0 && <Btn small kind="ghost" disabled={!!busy} onClick={() => movePhoto(i, i - 1)}>←</Btn>}
              <Btn small kind="danger" disabled={!!busy} onClick={() => { if (confirm(`Delete photo ${i + 1}?`)) void setPhotos(part.photos.filter((_, j) => j !== i)); }}>✕</Btn>
            </div>
          </div>
        ))}
        {part.photos.length < MAX_PART_PHOTOS && (
          <button onClick={() => addRef.current?.click()} disabled={!!busy} style={{
            width: 104, minHeight: 104, borderRadius: 10, border: "1.5px dashed var(--blue)", background: "var(--blue-tint)", color: "var(--blue)",
            cursor: busy ? "wait" : "pointer", fontWeight: 700, fontSize: 12.5,
          }}>{busy === "Uploading…" ? "⏳ Uploading…" : "＋ Add photos"}</button>
        )}
      </div>
      <input ref={addRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void add(e.target.files)} />
      <p style={{ ...muted, margin: "8px 0 0", color: err ? "var(--error-text)" : undefined, fontWeight: err ? 600 : 400 }}>
        {err ?? `${part.photos.length}/${MAX_PART_PHOTOS} photos · first photo is the cover · upload size 1000 × 1000 px (square)`}
      </p>
      {view && <PhotoViewer src={view} onClose={() => setView(null)} />}
    </div>
  );
}
