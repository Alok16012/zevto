"use client";

import { supabaseFor, type AppKind } from "./supabase";
import { inr } from "./data";

/* Spare-parts gallery: technicians list parts (photos, price, specs), staff
 * approve each one, and approved parts get a public page technicians can share. */

export type GalleryStatus = "Pending" | "Approved" | "Rejected";

export interface DbGalleryPart {
  id: string;
  tech_id: string;
  name: string;
  price: number;
  specs: string;
  photos: string[];
  status: GalleryStatus;
  reject_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryDraft { name: string; price: number; specs: string; photos: string[] }

export const MAX_PART_PHOTOS = 4;

/** Uploads a compressed photo (data URL) to the public "part-photos" bucket and returns its URL. */
export async function uploadPartPhoto(app: AppKind, dataUrl: string): Promise<string> {
  const sb = supabaseFor(app);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Please log in again");
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await sb.storage.from("part-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return sb.storage.from("part-photos").getPublicUrl(path).data.publicUrl;
}

/** Storage path of a public part-photo URL, for deleting it. */
export const partPhotoPath = (url: string) => url.split("/part-photos/")[1] ?? null;

export const partLink = (id: string) => `${window.location.origin}/spare-parts/${id}`;

export const shareText = (p: Pick<DbGalleryPart, "id" | "name" | "price">) =>
  `${p.name} — ${inr(p.price)}\nSpecs and photos: ${partLink(p.id)}`;

/** Opens the phone's share sheet; falls back to WhatsApp where that isn't available. */
export async function sharePart(p: Pick<DbGalleryPart, "id" | "name" | "price">): Promise<void> {
  const text = shareText(p);
  if (navigator.share) {
    try { await navigator.share({ title: p.name, text }); return; }
    catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}
