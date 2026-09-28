/* Zavtoo brand pieces, cut from the official logo (public/zavtoo-*.png). */

/** The "Z + water drop" symbol on its own. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/zavtoo-mark.png" alt="Zavtoo" width={size} height={Math.round(size * 0.855)} style={{ display: "block", objectFit: "contain" }} />
  );
}

/** "ZAVTOO" in the logo's green → cyan gradient, with the company line under it. */
export function Wordmark() {
  return (
    <div style={{ lineHeight: 1.05 }}>
      <p style={{
        margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "0.02em",
        background: "linear-gradient(90deg,#7ee21f 0%,#1fd6c9 55%,#1b8cff 100%)",
        WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
      }}>ZAVTOO</p>
      <p style={{ margin: "2px 0 0", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ink-soft)" }}>PANI FILTER PVT LTD</p>
    </div>
  );
}
