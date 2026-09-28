import type { ArtKind } from "../lib/data";

/* Flat product illustrations — stand-ins for real product photos until the
 * catalogue images arrive from the admin panel. */

const Unit = ({ accent, panel = "#141a2b", lights = 3 }: { accent: string; panel?: string; lights?: number }) => (
  <g>
    <ellipse cx="60" cy="112" rx="30" ry="4" fill="rgba(15,23,41,0.12)" />
    <rect x="30" y="10" width="60" height="100" rx="12" fill="#fff" stroke="#e1e6f2" strokeWidth="1.5" />
    <rect x="36" y="18" width="48" height="52" rx="8" fill={panel} />
    <rect x="42" y="24" width="20" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
    {Array.from({ length: lights }, (_, i) => (
      <circle key={i} cx={48 + i * 12} cy={50} r="3.2" fill={i === 0 ? accent : "rgba(255,255,255,0.45)"} />
    ))}
    <rect x="42" y="60" width="36" height="3" rx="1.5" fill="rgba(255,255,255,0.18)" />
    <circle cx="60" cy="88" r="7" fill="none" stroke="#cfd6e6" strokeWidth="2" />
    <path d="M60 84.5c0 0-3 3.4-3 5.2a3 3 0 0 0 6 0c0-1.8-3-5.2-3-5.2z" fill={accent} />
    <rect x="54" y="104" width="12" height="4" rx="2" fill="#dfe4ef" />
  </g>
);

export default function PurifierArt({ kind, size = 88 }: { kind: ArtKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      {kind === "classic" && <Unit accent="var(--blue)" />}
      {kind === "pro" && <Unit accent="#22b8cf" lights={4} />}
      {kind === "premium" && (
        <g>
          <Unit accent="var(--gold)" panel="#0b1020" lights={0} />
          <text x="60" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fill="#5ccfdb" fontFamily="var(--font-poppins)">42</text>
          <text x="60" y="58" textAnchor="middle" fontSize="5.5" fill="rgba(255,255,255,0.6)" fontFamily="var(--font-poppins)">TDS ppm</text>
        </g>
      )}
      {kind === "commercial" && (
        <g>
          <ellipse cx="60" cy="112" rx="40" ry="4" fill="rgba(15,23,41,0.12)" />
          <rect x="18" y="14" width="84" height="94" rx="6" fill="none" stroke="#98a1b5" strokeWidth="3" />
          {[30, 50, 70, 90].map((x, i) => (
            <rect key={x} x={x - 7} y="26" width="14" height="56" rx="7" fill={i % 2 ? "#dbe5ff" : "#fff"} stroke="#c9d3ea" strokeWidth="1.5" />
          ))}
          <rect x="24" y="88" width="72" height="12" rx="4" fill="#141a2b" />
          <circle cx="34" cy="94" r="2.5" fill="var(--green-500)" />
          <circle cx="44" cy="94" r="2.5" fill="var(--gold)" />
        </g>
      )}
      {kind === "spare" && (
        <g>
          <ellipse cx="60" cy="110" rx="38" ry="4" fill="rgba(15,23,41,0.12)" />
          {[34, 60, 86].map((x, i) => (
            <g key={x}>
              <rect x={x - 11} y="20" width="22" height="86" rx="10" fill={["#e8effe", "#fff", "#e6fffa"][i]} stroke="#c9d3ea" strokeWidth="1.5" />
              <rect x={x - 11} y="20" width="22" height="12" rx="6" fill="#3a4257" />
              <rect x={x - 11} y="94" width="22" height="12" rx="6" fill="#3a4257" />
              <rect x={x - 6} y="44" width="12" height="36" rx="5" fill={["var(--blue-soft)", "#dfe4ef", "var(--teal-light)"][i]} />
            </g>
          ))}
        </g>
      )}
      {kind === "cartridge" && (
        <g>
          <ellipse cx="60" cy="110" rx="36" ry="4" fill="rgba(15,23,41,0.12)" />
          {[38, 60, 82].map((x, i) => (
            <g key={x} transform={`rotate(${(i - 1) * 8} ${x} 64)`}>
              <rect x={x - 9} y="24" width="18" height="80" rx="9" fill="#fff" stroke="#c9d3ea" strokeWidth="1.5" />
              <rect x={x - 3} y="16" width="6" height="10" rx="2" fill="#98a1b5" />
              <rect x={x - 9} y="50" width="18" height="18" fill="var(--blue)" opacity={0.85 - i * 0.2} />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
