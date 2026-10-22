"use client";

import { useRef, useState } from "react";
import { PhotoViewer, compressImage } from "../components/PhotoPicker";
import { removeProductImages, uploadProductImage } from "../lib/photos";
import { friendly, supabaseFor } from "../lib/supabase";
import { SITE_IMAGES, SITE_SLOTS, type SiteImages, type SiteSlot } from "../lib/data";
import { Badge, Btn, Panel, input, muted } from "./kit";

/* ───────────────────────── Website images ─────────────────────────
 * Every photo on the website that isn't a product photo: the homepage hero, the
 * category tiles and the purifier showcase. Product photos stay in Products & Stock. */

export function SiteImagesSection({ notify }: { notify: (msg: string, bad?: boolean) => void }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p style={{ ...muted, margin: 0, lineHeight: 1.6, fontSize: 13 }}>
        Photos shown on the website. Changes go live straight away. Product photos (purifiers, filters, spares) are managed in <b>Products &amp; Stock</b>.
      </p>
      {SITE_SLOTS.map((s) => <SlotPanel key={s.slot} {...s} notify={notify} />)}
    </div>
  );
}

function SlotPanel({ slot, label, hint, max, captions: withCaptions, notify }: (typeof SITE_SLOTS)[number] & { notify: (msg: string, bad?: boolean) => void }) {
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
      <p style={{ ...muted, margin: "0 0 12px" }}>{hint}</p>
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
