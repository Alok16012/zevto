"use client";

import { useState } from "react";
import PurifierArt from "./PurifierArt";
import type { Product } from "../lib/data";

/* A product's cover photo (uploaded in Admin → Products & Stock), or its
 * illustration until one is uploaded. Square, `size` px across. */

export default function ProductImage({ product, size = 88, radius = 10 }: { product: Pick<Product, "art" | "name" | "images">; size?: number; radius?: number }) {
  const src = product.images?.[0];
  if (!src) return <PurifierArt kind={product.art} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={product.name} width={size} height={size} loading="lazy" style={{ width: size, height: size, maxWidth: "100%", objectFit: "contain", borderRadius: radius, display: "block" }} />;
}

/** Detail-page view: the big photo with thumbnails to switch between photos. */
export function ProductGallery({ product, size }: { product: Pick<Product, "art" | "name" | "images">; size: number }) {
  const images = product.images ?? [];
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];
  if (!current) return <PurifierArt kind={product.art} size={size} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxWidth: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current} alt={product.name} width={size} height={size} style={{ width: size, height: size, maxWidth: "100%", objectFit: "contain", borderRadius: 14, display: "block" }} />
      {images.length > 1 && (
        <div className="no-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", maxWidth: "100%", position: "relative", zIndex: 1 }}>
          {images.map((src, i) => (
            <button key={src} type="button" onClick={() => setActive(i)} aria-label={`Show photo ${i + 1} of ${product.name}`} aria-pressed={src === current} style={{
              width: 48, height: 48, flexShrink: 0, padding: 0, borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "#fff",
              border: src === current ? "2px solid var(--blue)" : "2px solid transparent",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
