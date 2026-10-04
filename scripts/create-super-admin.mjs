// One-off: creates (or resets) the super admin login.
//   node scripts/create-super-admin.mjs [email] [--reset] [--password=<value>]
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" };
const email = (process.argv.find((a) => a.includes("@")) ?? "admin@zavtoo.in").toLowerCase();
const reset = process.argv.includes("--reset");

async function api(path, init = {}) {
  const res = await fetch(`${URL_}${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  const body = await res.text();
  const data = body ? JSON.parse(body) : null;
  if (!res.ok) throw new Error(data?.msg ?? data?.message ?? `HTTP ${res.status}`);
  return data;
}

// --password=<value> sets it; otherwise 16 random characters + a guaranteed mix of character types.
const chosen = process.argv.find((a) => a.startsWith("--password="))?.slice("--password=".length);
if (chosen !== undefined && chosen.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}
const password = chosen ?? `${randomBytes(12).toString("base64url")}#7Zv`;
const attrs = { password, email_confirm: true, app_metadata: { role: "super_admin" }, user_metadata: { full_name: "Super Admin" } };

const { users } = await api("/auth/v1/admin/users?per_page=1000");
const existing = users.find((u) => u.email === email);
if (existing && !reset) {
  console.error(`${email} already exists (role: ${existing.app_metadata?.role}). Re-run with --reset for a new password.`);
  process.exit(1);
}
const user = existing
  ? await api(`/auth/v1/admin/users/${existing.id}`, { method: "PUT", body: JSON.stringify(attrs) })
  : await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, ...attrs }) });

if (existing) {
  // Keep the profile in step with the login's role.
  await api(`/rest/v1/profiles?id=eq.${existing.id}`, { method: "PATCH", body: JSON.stringify({ role: "super_admin" }) });
}
const [prof] = await api(`/rest/v1/profiles?select=code,role&id=eq.${user.id}`);
console.log(JSON.stringify({ email, password, id: prof?.code, role: prof?.role }, null, 2));
