"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import TechAvatar from "./TechAvatar";
import { PhoneIcon } from "./icons";
import { card } from "./ui";
import { TECHNICIANS } from "../lib/data";
import { etaMinutes, kmBetween } from "../lib/db";

/* The technician's live position, shown to the customer only while the
 * technician is on the way (the database refuses it at any other time). */

export interface LivePoint { lat: number; lng: number; updatedAt: string }

export function LiveTrackingCard({ arrived, tech, position, home, address, otp, etaMin, tripStartedAt }: {
  arrived: boolean;
  tech: { id: string; name: string; phone: string };
  position: LivePoint | null;
  home: { lat: number; lng: number } | null;
  address: string;
  otp?: string | null;
  etaMin?: number | null;
  tripStartedAt?: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);

  const first = tech.name.split(" ")[0];
  const km = position && home ? kmBetween(position, home) : null;
  // Best ETA we have: live distance, else the estimate made when the ride started.
  const eta = km != null ? etaMinutes(km)
    : etaMin && tripStartedAt ? Math.max(1, etaMin - Math.round((now - new Date(tripStartedAt).getTime()) / 60000)) : null;
  const seenAgo = position ? Math.round((now - new Date(position.updatedAt).getTime()) / 1000) : null;

  return (
    <div className="fade-up" style={{ ...card, marginTop: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--line)" }}>
        <span className={arrived ? undefined : "animate-pulse-dot"} style={{ width: 9, height: 9, borderRadius: "50%", background: arrived ? "var(--green-500)" : "var(--blue)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{arrived ? `${first} has arrived` : `${first} is on the way`}</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
            {arrived ? "At your door now"
              : eta != null ? `ETA about ${eta} min${km != null ? ` · ${km.toFixed(1)} km away` : ""}`
              : position ? "Live location below" : "Waiting for their phone to share location…"}
          </p>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--success-text)", background: "var(--success)", padding: "3px 8px", borderRadius: 999 }}>LIVE</span>
      </div>

      {position ? (
        <LiveMap position={position} home={home} techId={tech.id} techName={tech.name} />
      ) : (
        <div style={{ height: 180, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-mute)", fontSize: 12.5, padding: 20, textAlign: "center" }}>
          📍 {first}&apos;s location will appear as soon as their phone sends it.
        </div>
      )}
      {seenAgo != null && seenAgo > 120 && !arrived && (
        <p style={{ margin: 0, padding: "6px 14px", fontSize: 11, color: "var(--warning-text)", background: "var(--warning)" }}>Last update {Math.round(seenAgo / 60)} min ago — their signal may be weak.</p>
      )}

      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <TechAvatar id={tech.id} name={tech.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{tech.name}</p>
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>To: {address}</p>
        </div>
        {tech.phone && (
          <a href={`tel:${tech.phone}`} aria-label={`Call ${tech.name}`} className="press" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <PhoneIcon s={18} c="var(--success-text)" />
          </a>
        )}
      </div>

      {otp && (
        <div style={{ margin: "0 14px 14px", padding: "10px 12px", borderRadius: 12, background: "var(--gold-tint)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{arrived ? "Share this start code with the technician" : "Start code — share only when they arrive"}</span>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.2em", color: "var(--blue-dark)" }}>{otp}</span>
        </div>
      )}
      {!home && !arrived && (
        <p style={{ margin: "0 14px 12px", fontSize: 11, color: "var(--ink-mute)" }}>Tip: pin your home in Profile → Saved Addresses for an accurate ETA.</p>
      )}
    </div>
  );
}

function LiveMap({ position, home, techId, techName }: { position: LivePoint; home: { lat: number; lng: number } | null; techId: string; techName: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const techMarker = useRef<Leaflet.Marker | null>(null);
  const homeMarker = useRef<Leaflet.Marker | null>(null);
  const fitted = useRef(false);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then(({ default: L }) => {
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([position.lat, position.lng], 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "© OpenStreetMap contributors",
      }).addTo(m);
      L.control.zoom({ position: "bottomright" }).addTo(m);
      map.current = m;
      const photo = TECHNICIANS.find((t) => t.id === techId)?.photoUrl;
      const initials = techName.split(" ").map((w) => w[0]).join("").slice(0, 2);
      // Built with DOM nodes, not an HTML string — the photo URL comes from user data.
      const badge = document.createElement("div");
      badge.style.cssText = "width:38px;height:38px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(11,92,255,.25),0 2px 8px rgba(0,0,0,.3);overflow:hidden;background:#0b5cff;color:white;font:700 13px sans-serif;display:flex;align-items:center;justify-content:center";
      if (photo && /^https:\/\//.test(photo)) {
        const img = document.createElement("img");
        img.src = photo;
        img.alt = "";
        img.style.cssText = "width:100%;height:100%;object-fit:cover";
        badge.appendChild(img);
      } else {
        badge.textContent = initials;
      }
      techMarker.current = L.marker([position.lat, position.lng], {
        icon: L.divIcon({ className: "", iconSize: [38, 38], iconAnchor: [19, 19], html: badge }),
        title: techName,
      }).addTo(m);
      if (home) {
        homeMarker.current = L.marker([home.lat, home.lng], {
          icon: L.divIcon({ className: "", iconSize: [30, 30], iconAnchor: [15, 28], html: `<div style="font-size:28px;line-height:1">🏠</div>` }),
          title: "Your home",
        }).addTo(m);
      }
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; fitted.current = false; };
    // The map is created once; later position changes move the marker below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the technician.
  useEffect(() => {
    const m = map.current;
    if (!m || !techMarker.current) return;
    techMarker.current.setLatLng([position.lat, position.lng]);
    if (home && !fitted.current) {
      m.fitBounds([[position.lat, position.lng], [home.lat, home.lng]], { padding: [40, 40], maxZoom: 16 });
      fitted.current = true;
    } else if (!home) {
      m.panTo([position.lat, position.lng]);
    }
  }, [position.lat, position.lng, home]);

  return <div ref={el} role="img" aria-label={`Map showing ${techName}'s live location`} style={{ height: 220, width: "100%", background: "#eef2f7" }} />;
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
