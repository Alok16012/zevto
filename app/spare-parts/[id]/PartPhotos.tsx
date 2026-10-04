"use client";

import { useState } from "react";
import { PhotoViewer } from "../../components/PhotoPicker";

/** Big cover photo with thumbnails underneath; tapping opens it full-screen. */
export default function PartPhotos({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [view, setView] = useState(false);
  return (
    <div>
      <button onClick={() => setView(true)} aria-label={`View ${name} photo full-screen`} style={{ width: "100%", aspectRatio: "1 / 1", padding: 0, border: "none", borderRadius: 20, overflow: "hidden", background: "var(--surface)", cursor: "zoom-in", display: "block" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[active]} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </button>
      {photos.length > 1 && (
        <div className="no-scroll" style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto" }}>
          {photos.map((p, i) => (
            <button key={p} onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`} aria-pressed={i === active} style={{
              width: 64, height: 64, flexShrink: 0, padding: 0, borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "var(--surface)",
              border: i === active ? "2px solid var(--blue)" : "2px solid transparent",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      )}
      {view && <PhotoViewer src={photos[active]} onClose={() => setView(false)} />}
    </div>
  );
}
