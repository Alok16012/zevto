// One-off: creates (or resets) the super admin login.
//   node scripts/create-super-admin.mjs [email] [--reset]
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const email = (process.argv.find((a) => a.includes("@")) ?? "admin@zavtoo.in").toLowerCase();
const reset = process.argv.includes("--reset");

// 16 random characters + a guaranteed mix of character types.
const password = `${randomBytes(12).toString("base64url")}#7Zv`;

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: list, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listErr) { console.error("Couldn't reach Supabase:", listErr.message); process.exit(1); }
const existing = list.users.find((u) => u.email === email);

if (existing && !reset) {
  console.log(`${email} already exists (role: ${existing.app_metadata?.role}). Re-run with --reset for a new password.`);
  process.exit(0);
}

const attrs = { password, email_confirm: true, app_metadata: { role: "super_admin" }, user_metadata: { full_name: "Super Admin" } };
const { data, error } = existing
  ? await sb.auth.admin.updateUserById(existing.id, attrs)
  : await sb.auth.admin.createUser({ email, ...attrs });
if (error) { console.error("Failed:", error.message); process.exit(1); }

if (existing) {
  // Make sure the profile row agrees with the login's role.
  await sb.from("profiles").update({ role: "super_admin" }).eq("id", existing.id);
}
const { data: prof } = await sb.from("profiles").select("code, role").eq("id", data.user.id).single();
console.log(JSON.stringify({ email, password, id: prof?.code, role: prof?.role }, null, 2));
