import { useId } from "react";

/** A compact version of the login page's water motif for signed-in dashboards. */
export default function WaterBanner({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="app-water-banner">
      <div className="app-water-copy">
        <p className="app-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="app-water-detail">{detail}</p>
      </div>
      <svg className="app-water-art" viewBox="0 0 130 150" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-drop`} x1="30" y1="25" x2="100" y2="115" gradientUnits="userSpaceOnUse"><stop stopColor="#d5ffff" /><stop offset=".35" stopColor="#10d9e4" /><stop offset=".7" stopColor="#007d97" /><stop offset="1" stopColor="#a5fff1" /></linearGradient>
          <linearGradient id={`${id}-shine`} x1="43" y1="50" x2="63" y2="105" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity=".95" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
        </defs>
        <ellipse cx="66" cy="125" rx="59" ry="15" stroke="#63eff2" strokeOpacity=".35" />
        <ellipse cx="66" cy="125" rx="43" ry="10" stroke="#99ffff" strokeOpacity=".6" />
        <ellipse cx="66" cy="124" rx="26" ry="5" fill="#5df1e8" fillOpacity=".22" />
        <path d="M66 9C61 37 28 65 28 88a38 38 0 0 0 76 0C104 65 71 37 66 9Z" fill={`url(#${id}-drop)`} stroke="#b3ffff" strokeWidth="1.4" />
        <path d="M60 39C53 56 39 74 39 88c0 7 3 13 7 17" stroke={`url(#${id}-shine)`} strokeWidth="7" strokeLinecap="round" />
        <path d="M49 111c15 9 32 4 40-7" stroke="white" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="49" r="5" fill="#80ffff" fillOpacity=".3" stroke="#9bffff" />
        <circle cx="111" cy="69" r="3" fill="#bcffff" fillOpacity=".6" />
      </svg>
    </div>
  );
}
