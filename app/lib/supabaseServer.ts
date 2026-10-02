/* Server-only Supabase access with the service-role key. Import this ONLY from
 * route handlers (app/api/**) — never from a "use client" file. */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function serverAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server is missing SUPABASE_SERVICE_ROLE_KEY");
  return (admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

/** The signed-in staff member behind a request (Bearer token), or null. */
export async function staffFrom(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await serverAdmin().auth.getUser(token);
  const role = data.user?.app_metadata?.role;
  if (error || !data.user || (role !== "admin" && role !== "super_admin")) return null;
  return data.user;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
