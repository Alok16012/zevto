import type { ArtKind } from "../lib/data";

/* Shown wherever a product has no real photo yet: a neutral branded tile instead of
 * a drawing, so customers only ever see genuine product photos. Upload photos in
 * Admin → Products & Stock and they replace this automatically. */

export default function PurifierArt({ kind, size = 88 }: { kind: ArtKind; size?: number }) {
  const label = kind === "commercial" ? "Commercial RO" : kind === "spare" || kind === "cartridge" ? "Spare part" : "Water purifier";
  return (
    <div role="img" aria-label={`${label} — photo coming soon`} style={{
      width: size, height: size, maxWidth: "100%", borderRadius: Math.max(8, size * 0.08), flexShrink: 0,
      background: "linear-gradient(160deg,#eef6f9,#f8fbfc)", border: "1px dashed #d5e5ec",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: size * 0.04,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/zavtoo-mark.png" alt="" width={size * 0.36} height={size * 0.31} style={{ opacity: 0.5, display: "block" }} />
      {size >= 110 && <span style={{ fontSize: Math.min(13, size * 0.07), fontWeight: 600, color: "#7a8d97", textAlign: "center", lineHeight: 1.3 }}>Photo coming soon</span>}
    </div>
  );
}
