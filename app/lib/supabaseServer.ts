/* Server-only Supabase access with the service-role key. Import this ONLY from
 * route handlers (app/api/**) — never from a "use client" file.
 *
 * Plain fetch rather than supabase-js: the JS client insists on a WebSocket
 * implementation at construction, which Node 20 doesn't have. */

const url = () => {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) throw new Error("Server is missing NEXT_PUBLIC_SUPABASE_URL");
  return u;
};
const serviceKey = () => {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("Server is missing SUPABASE_SERVICE_ROLE_KEY");
  return k;
};
const headers = (extra: Record<string, string> = {}) => ({
  apikey: serviceKey(), Authorization: `Bearer ${serviceKey()}`, "content-type": "application/json", ...extra,
});

export interface AuthUser { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }

async function call<T>(path: string, init: RequestInit): Promise<{ data: T | null; error: string | null }> {
  const res = await fetch(`${url()}${path}`, { ...init, cache: "no-store" });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) return { data: null, error: body?.msg ?? body?.message ?? body?.error_description ?? body?.error ?? `HTTP ${res.status}` };
  return { data: body as T, error: null };
}

export const authAdmin = {
  createUser: (attrs: Record<string, unknown>) =>
    call<AuthUser>("/auth/v1/admin/users", { method: "POST", headers: headers(), body: JSON.stringify(attrs) }),
  updateUser: (id: string, attrs: Record<string, unknown>) =>
    call<AuthUser>(`/auth/v1/admin/users/${id}`, { method: "PUT", headers: headers(), body: JSON.stringify(attrs) }),
  deleteUser: (id: string) =>
    call<unknown>(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: headers() }),
  /** The user behind an access token (from the browser), or null. */
  userFromToken: async (token: string) => {
    const res = await fetch(`${url()}/auth/v1/user`, { headers: { apikey: serviceKey(), Authorization: `Bearer ${token}` }, cache: "no-store" });
    return res.ok ? ((await res.json()) as AuthUser) : null;
  },
};

/** PostgREST as the service role (bypasses row-level security). */
export const rest = {
  select: <T>(table: string, query: string) =>
    call<T[]>(`/rest/v1/${table}?${query}`, { method: "GET", headers: headers() }),
  insert: <T>(table: string, row: Record<string, unknown>) =>
    call<T[]>(`/rest/v1/${table}`, { method: "POST", headers: headers({ Prefer: "return=representation" }), body: JSON.stringify(row) }),
  update: <T>(table: string, filter: string, patch: Record<string, unknown>) =>
    call<T[]>(`/rest/v1/${table}?${filter}`, { method: "PATCH", headers: headers({ Prefer: "return=representation" }), body: JSON.stringify(patch) }),
  rpc: <T>(fn: string, args: Record<string, unknown>) =>
    call<T>(`/rest/v1/rpc/${fn}`, { method: "POST", headers: headers(), body: JSON.stringify(args) }),
};

/** The signed-in staff member behind a request (Bearer token), or null. */
export async function staffFrom(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const user = await authAdmin.userFromToken(token);
  const role = user?.app_metadata?.role;
  return user && (role === "admin" || role === "super_admin") ? user : null;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
