"use client";

import { useBridge } from "../lib/bridge";

/* Technician picture: the photo the technician uploaded in the partner app, or
 * an illustrated portrait in Zavtoo uniform until they add one. */

const LOOKS: Record<string, { skin: string; hair: string; style: "short" | "side" | "crop" | "wavy"; beard?: boolean; moustache?: boolean }> = {
  t1: { skin: "#c68a5e", hair: "#1f1a17", style: "side", moustache: true },
  t2: { skin: "#a8714a", hair: "#15110f", style: "short", beard: true },
  t3: { skin: "#b97c52", hair: "#2b2320", style: "crop", moustache: true },
  t4: { skin: "#d49a6a", hair: "#221b17", style: "wavy" },
  t5: { skin: "#9c6642", hair: "#120e0c", style: "short" },
};

function Portrait({ id, size }: { id: string; size: number }) {
  const l = LOOKS[id] ?? LOOKS.t1;
  const hair = {
    short: "M20 25c0-8 5.5-13 12-13s12 5 12 13c-2-3-5-5-12-5s-10 2-12 5z",
    side: "M19.5 26c-.5-9 5-14.5 12.5-14.5 7 0 12.5 4.5 12.5 12-3-4-8-6.5-15-5.5-4 .6-7 3.5-10 8z",
    crop: "M20.5 24.5c0-7.5 5-12 11.5-12s11.5 4.5 11.5 12c-1.5-2-6-3.5-11.5-3.5s-10 1.5-11.5 3.5z",
    wavy: "M19 27c-1-10 5-15 13-15s14 5 13 15c-1-3-3-5-5-5.5 1 2-1 3-3 1.5-2 1.5-5 1.5-7 0-2 1.5-5 1-6-1-2 1-4 3-5 5z",
  }[l.style];

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dce9fd" /><stop offset="1" stopColor="#b9d2fb" /></linearGradient>
        <clipPath id={`clip-${id}`}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <g clipPath={`url(#clip-${id})`}>
        <rect width="64" height="64" fill={`url(#bg-${id})`} />
        {/* Uniform */}
        <path d="M8 64c0-11 9-17.5 24-17.5S56 53 56 64z" fill="#0b5cff" />
        <path d="M25 47.5l7 7 7-7" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        <path d="M44.5 55.5s-1.6 1.9-1.6 2.9a1.6 1.6 0 0 0 3.2 0c0-1-1.6-2.9-1.6-2.9z" fill="#f5a623" />
        {/* Neck + head */}
        <path d="M27.5 40h9v8.5a4.5 4.5 0 0 1-9 0z" fill={l.skin} />
        <path d="M27.5 44c2.8 1.3 6.2 1.3 9 0" stroke="rgba(0,0,0,0.12)" strokeWidth="1.6" fill="none" />
        <ellipse cx="32" cy="29" rx="11.5" ry="13" fill={l.skin} />
        <ellipse cx="20.6" cy="30" rx="1.8" ry="2.8" fill={l.skin} />
        <ellipse cx="43.4" cy="30" rx="1.8" ry="2.8" fill={l.skin} />
        <path d={hair} fill={l.hair} />
        {/* Face */}
        <path d="M26 26.5h3.4M34.6 26.5H38" stroke={l.hair} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="27.7" cy="29.6" r="1.25" fill="#1b1b1b" />
        <circle cx="36.3" cy="29.6" r="1.25" fill="#1b1b1b" />
        <path d="M32 30.5v4l-1.4.6" stroke="rgba(0,0,0,0.22)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        {l.beard && <path d="M21.5 31c0 8 4.5 12 10.5 12s10.5-4 10.5-12c-1.5 3-3.5 4.5-5 4.5-1.5-1.3-3.5-1.8-5.5-1.8s-4 .5-5.5 1.8c-1.5 0-3.5-1.5-5-4.5z" fill={l.hair} opacity="0.9" />}
        {l.moustache && <path d="M28 36c1.5-1.2 2.8-1.2 4 -.3 1.2-.9 2.5-.9 4 .3-1.4.4-2.7.4-4-.1-1.3.5-2.6.5-4 .1z" fill={l.hair} />}
        <path d="M29 38.2c1.8 1.2 4.2 1.2 6 0" stroke="#7a3b2a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function TechAvatar({ id, name, size = 44, ring }: { id: string; name: string; size?: number; ring?: boolean }) {
  const { photos } = useBridge();
  const photo = photos[id];
  return (
    <span role="img" aria-label={`Photo of ${name}`} style={{
      width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, display: "inline-block",
      boxShadow: ring ? "0 0 0 2.5px white, 0 2px 8px rgba(11,92,255,0.3)" : undefined, background: "var(--blue-pale)",
    }}>
      {photo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photo} alt="" width={size} height={size} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        : <Portrait id={id} size={size} />}
    </span>
  );
}

/** Shrinks a picked photo to a small square JPEG so it fits in storage. */
export function photoToDataUrl(file: File, px = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Please choose an image file")); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = px; canvas.height = px;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Couldn't read the photo")); return; }
      // Centre crop to a square.
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, px, px);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read the photo")); };
    img.src = url;
  });
}
