"use client";

import { useEffect, useState } from "react";
import { supabaseFor, type AppKind } from "./supabase";

/* RO photos live in the private "ro-photos" bucket under <customer uid>/…;
 * technician photos in the public "avatars" bucket under <technician uid>/…. */

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();

/** Uploads a compressed photo (data URL) and returns its storage path. */
export async function uploadRoPhoto(app: AppKind, dataUrl: string, folder?: string): Promise<string> {
  const sb = supabaseFor(app);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Please log in again");
  const path = `${user.id}/${folder ? `${folder}/` : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb.storage.from("ro-photos").upload(path, await dataUrlToBlob(dataUrl), { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}

export async function removeRoPhotos(app: AppKind, paths: string[]) {
  if (paths.length) await supabaseFor(app).storage.from("ro-photos").remove(paths);
}

/** Uploads a technician's profile photo and returns its public URL. */
export async function uploadAvatar(app: AppKind, dataUrl: string): Promise<string> {
  const sb = supabaseFor(app);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Please log in again");
  const path = `${user.id}/photo-${Date.now()}.jpg`;
  const { error } = await sb.storage.from("avatars").upload(path, await dataUrlToBlob(dataUrl), { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

const cache = new Map<string, { url: string; until: number }>();

/** Short-lived links (1 hour) to private RO photos, keyed by path. */
export function useSignedUrls(app: AppKind, paths: string[] | undefined): Record<string, string> {
  const key = (paths ?? []).join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const list = key ? key.split("|") : [];
    const now = Date.now();
    const fresh: Record<string, string> = {};
    const missing: string[] = [];
    list.forEach((p) => { const c = cache.get(p); if (c && c.until > now) fresh[p] = c.url; else missing.push(p); });
    setUrls(fresh);
    if (!missing.length) return;
    let alive = true;
    supabaseFor(app).storage.from("ro-photos").createSignedUrls(missing, 3600).then(({ data }) => {
      if (!alive || !data) return;
      const got: Record<string, string> = { ...fresh };
      data.forEach((d) => { if (d.signedUrl && d.path) { got[d.path] = d.signedUrl; cache.set(d.path, { url: d.signedUrl, until: Date.now() + 3300_000 }); } });
      setUrls(got);
    });
    return () => { alive = false; };
  }, [app, key]);
  return urls;
}
