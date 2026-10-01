"use client";

import { useRef, useState } from "react";
import { CloseIcon } from "./icons";

/** Shrinks a photo (keeping its shape) to a JPEG data URL small enough to store and send. */
export function compressImage(file: File, maxSide = 720, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("That isn't a photo. Please pick an image.")); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) { reject(new Error("Couldn't read that photo.")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that photo.")); };
    img.src = url;
  });
}

export const MAX_RO_PHOTOS = 4;

const TIPS = ["Whole purifier", "Display / error light", "Leak or damaged part"];

/** "Photos of your RO" block: what to shoot, thumbnails, and a big add tile. */
export function RoPhotoPicker({ photos, onChange, recommended, compact }: {
  photos: string[]; onChange: (p: string[]) => void; recommended?: boolean; compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  const left = MAX_RO_PHOTOS - photos.length;

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr(null);
    try {
      const picked = Array.from(files).slice(0, left);
      const urls = await Promise.all(picked.map((f) => compressImage(f)));
      onChange([...photos, ...urls]);
      if (files.length > left) setErr(`Only ${MAX_RO_PHOTOS} photos allowed — extra ones were skipped.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't add that photo.");
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      {!compact && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>📷 Photos of your RO</span>
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              background: recommended ? "var(--gold-tint)" : "var(--surface-dim)", color: recommended ? "var(--gold-dark)" : "var(--ink-mute)",
            }}>{recommended ? "RECOMMENDED" : "OPTIONAL"}</span>
          </div>
          <p style={{ margin: "3px 0 8px", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            Helps the technician bring the right parts and fix it in one visit.
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {TIPS.map((t, i) => (
              <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "var(--blue)", background: "var(--blue-tint)", padding: "4px 9px", borderRadius: 999 }}>{i + 1}. {t}</span>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {photos.map((p, i) => (
          <div key={i} style={{ position: "relative", aspectRatio: "1 / 1" }}>
            <button onClick={() => setView(p)} aria-label={`View photo ${i + 1}`} style={{ width: "100%", height: "100%", padding: 0, border: "none", borderRadius: 12, overflow: "hidden", cursor: "zoom-in", background: "var(--bg-secondary)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt={`RO photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </button>
            <button onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`} style={{
              position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: "2px solid white",
              background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0,
            }}><CloseIcon s={11} c="white" w={3} /></button>
          </div>
        ))}
        {left > 0 && (
          <button onClick={() => inputRef.current?.click()} disabled={busy} className="press" aria-label="Add photo of your RO" style={{
            aspectRatio: "1 / 1", borderRadius: 12, border: "1.5px dashed var(--blue)", background: "var(--blue-tint)", cursor: busy ? "wait" : "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "var(--blue)", padding: 0,
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{busy ? "⏳" : "📷"}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700 }}>{busy ? "Adding…" : photos.length ? "Add more" : "Add photo"}</span>
          </button>
        )}
      </div>
      {/* No `capture` attribute, so phones offer both the camera and the gallery. */}
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      <p style={{ margin: "6px 2px 0", fontSize: 11, color: err ? "var(--error-text)" : "var(--ink-mute)", fontWeight: err ? 600 : 400 }}>
        {err ?? `${photos.length}/${MAX_RO_PHOTOS} photos · take a new one or pick from your gallery`}
      </p>

      {view && <PhotoViewer src={view} onClose={() => setView(null)} />}
    </div>
  );
}

/** Full-screen look at one photo. */
export function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Photo" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,14,25,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="RO photo, enlarged" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 12, objectFit: "contain" }} />
      <button onClick={onClose} aria-label="Close photo" style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <CloseIcon s={16} c="white" />
      </button>
    </div>
  );
}

/** Read-only strip of thumbnails that open full-size. */
export function PhotoStrip({ photos, size = 64 }: { photos: string[]; size?: number }) {
  const [view, setView] = useState<string | null>(null);
  return (
    <>
      <div className="no-scroll" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {photos.map((p, i) => (
          <button key={i} onClick={() => setView(p)} aria-label={`View photo ${i + 1}`} style={{ width: size, height: size, flexShrink: 0, padding: 0, border: "none", borderRadius: 10, overflow: "hidden", cursor: "zoom-in" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt={`RO photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </button>
        ))}
      </div>
      {view && <PhotoViewer src={view} onClose={() => setView(null)} />}
    </>
  );
}
