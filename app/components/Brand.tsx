/* Zavtoo brand pieces, cut from the official logo (assets/logo → public/brand). */

/** The yellow drop with the blue "Z" on its own — for small square spots. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/zavtoo-icon.png" alt="Zavtoo" width={size} height={size} style={{ display: "block", objectFit: "contain" }} />
  );
}

/** Logo width ÷ height (public/brand/zavtoo-logo*.png are 900 × 250). */
const LOGO_RATIO = 900 / 250;

/** The full logo: "Zavtoo", "PAANI FILTER PVT LTD" and the drop. `white` = for dark backgrounds. */
export function Logo({ height = 40, white = false }: { height?: number; white?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={white ? "/brand/zavtoo-logo-white.png" : "/brand/zavtoo-logo.png"} alt="Zavtoo Paani Filter Pvt Ltd"
      width={Math.round(height * LOGO_RATIO)} height={height} style={{ display: "block", height, width: "auto", maxWidth: "100%", objectFit: "contain" }} />
  );
}
