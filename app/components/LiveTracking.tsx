"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import TechAvatar from "./TechAvatar";
import { PhoneIcon } from "./icons";
import { card } from "./ui";
import { DEMO_RIDE_MS, type Trip } from "../lib/bridge";

/* Live location of the technician, shown to the customer only once the
 * technician has started the ride. No map SDK yet — a drawn street map with
 * the route, like the real screen will look once Google Maps is wired in. */

const ROUTE = "M34 196 L34 150 L110 150 L110 96 L196 96 L196 52 L300 52";
const W = 340, H = 220;

export function LiveTrackingCard({ trip, tech, address, otp }: {
  trip: Trip; tech: { id: string; name: string; phone: string }; address: string; otp?: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pt, setPt] = useState({ x: 34, y: 196 });
  const [len, setLen] = useState(0);

  const arrived = trip.status !== "On the way";
  const progress = arrived ? 1 : Math.min(1, (now - trip.startedAt) / DEMO_RIDE_MS);
  const etaMin = Math.max(1, Math.ceil(trip.etaMin * (1 - progress)));
  const kmLeft = Math.max(0, trip.distanceKm * (1 - progress));

  useEffect(() => {
    if (arrived) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [arrived]);

  useLayoutEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const total = p.getTotalLength();
    const at = p.getPointAtLength(total * progress);
    setLen(total);
    setPt({ x: at.x, y: at.y });
  }, [progress]);

  return (
    <div className="fade-up" style={{ ...card, marginTop: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--line)" }}>
        <span className={arrived ? undefined : "animate-pulse-dot"} style={{ width: 9, height: 9, borderRadius: "50%", background: arrived ? "var(--green-500)" : "var(--blue)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
            {arrived ? `${tech.name.split(" ")[0]} has arrived` : progress >= 1 ? "Reaching your location" : `${tech.name.split(" ")[0]} is on the way`}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
            {arrived ? "At your door now" : `ETA ${etaMin} min · ${kmLeft.toFixed(1)} km away`}
          </p>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--success-text)", background: "var(--success)", padding: "3px 8px", borderRadius: 999 }}>LIVE</span>
      </div>

      <div style={{ position: "relative", background: "#eef2f7" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label={`Map: ${tech.name} ${arrived ? "has arrived" : `is ${kmLeft.toFixed(1)} km away`}`}>
          {/* Blocks & parks */}
          <rect x="0" y="0" width={W} height={H} fill="#eef2f7" />
          {[[48, 8, 50, 30], [126, 8, 60, 30], [212, 70, 72, 16], [48, 110, 50, 30], [126, 112, 60, 70], [212, 112, 110, 30], [228, 160, 90, 50], [48, 166, 50, 50]].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx="5" fill={i === 4 ? "#d7f0dd" : "#e1e7f0"} />
          ))}
          {/* Streets */}
          {[20, 96, 150, 200].map((y) => <rect key={`h${y}`} x="0" y={y - 5} width={W} height="10" fill="#fff" />)}
          {[34, 110, 196, 300].map((x) => <rect key={`v${x}`} x={x - 5} y="0" width="10" height={H} fill="#fff" />)}
          <rect x="0" y="47" width={W} height="10" fill="#fff" />
          <text x="236" y="46" fontSize="7" fill="#98a1b5" fontFamily="inherit">Sector 62 Rd</text>
          <text x="118" y="146" fontSize="7" fill="#98a1b5" fontFamily="inherit">Park</text>

          {/* Route: done solid, left dashed */}
          <path ref={pathRef} d={ROUTE} fill="none" stroke="#9ec0ff" strokeWidth="4" strokeDasharray="2 6" strokeLinecap="round" strokeLinejoin="round" />
          {len > 0 && (
            <path d={ROUTE} fill="none" stroke="var(--blue)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={`${len * progress} ${len}`} />
          )}

          {/* Home pin */}
          <g transform="translate(300 52)">
            <circle r="13" fill="rgba(224,49,49,0.14)" />
            <path d="M0 3s-8-7-8-12a8 8 0 0 1 16 0c0 5-8 12-8 12z" transform="translate(0 -3)" fill="var(--red)" />
            <circle cy="-12" r="3" fill="white" />
          </g>

          {/* Technician */}
          <g style={{ transform: `translate(${pt.x}px, ${pt.y}px)`, transition: "transform 1s linear" }}>
            {!arrived && <circle r="16" fill="rgba(11,92,255,0.18)" className="animate-pulse-dot" />}
            <circle r="11.5" fill="white" />
            <foreignObject x="-10" y="-10" width="20" height="20">
              <TechAvatar id={tech.id} name={tech.name} size={20} />
            </foreignObject>
          </g>
        </svg>
        <span style={{ position: "absolute", left: 8, bottom: 6, fontSize: 9.5, color: "var(--ink-mute)" }}>Demo map · ride sped up</span>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <TechAvatar id={tech.id} name={tech.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{tech.name}</p>
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>To: {address}</p>
        </div>
        <a href={`tel:${tech.phone}`} aria-label={`Call ${tech.name}`} className="press" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <PhoneIcon s={18} c="var(--success-text)" />
        </a>
      </div>

      {otp && (
        <div style={{ margin: "0 14px 14px", padding: "10px 12px", borderRadius: 12, background: "var(--gold-tint)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{arrived ? "Share this start code with the technician" : "Start code — share only when they arrive"}</span>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.2em", color: "var(--blue-dark)" }}>{otp}</span>
        </div>
      )}
    </div>
  );
}

/** Before the ride starts the customer sees who is coming, but not where they are. */
export function LocationPendingCard({ techName }: { techName: string }) {
  return (
    <div style={{ ...card, marginTop: 12, padding: 14, display: "flex", alignItems: "center", gap: 12, border: "1.5px dashed var(--line-strong)", boxShadow: "none", background: "transparent" }}>
      <span style={{ fontSize: 24 }}>📍</span>
      <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
        You&apos;ll see {techName.split(" ")[0]}&apos;s live location here as soon as they start the ride to your place.
      </p>
    </div>
  );
}
