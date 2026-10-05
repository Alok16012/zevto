import { authAdmin, json, rest, staffFrom } from "../../../lib/supabaseServer";
import { createTechnician } from "../../../lib/technicianAccounts";

/* Staff create technician logins and reset technician/customer passwords. */
export async function POST(req: Request) {
  if (!(await staffFrom(req))) return json({ error: "Only admins can do this" }, 403);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  if (b.action === "reset-password") {
    const id = String(b.id ?? "");
    const password = String(b.password ?? "");
    if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Account not found" }, 404);
    // Only technician and customer passwords can be reset here — never staff.
    const { data: p } = await rest.select<{ role: string }>("profiles", `select=role&id=eq.${id}`);
    if (!p?.length || !["technician", "customer"].includes(p[0].role)) return json({ error: "Account not found" }, 404);
    const { error } = await authAdmin.updateUser(id, { password });
    return error ? json({ error }, 400) : json({ ok: true });
  }

  const result = await createTechnician({
    name: String(b.name ?? "").trim(),
    email: String(b.email ?? "").trim().toLowerCase(),
    password: String(b.password ?? ""),
    phone: String(b.phone ?? "").replace(/\D/g, ""),
    pincodes: Array.isArray(b.pincodes) ? (b.pincodes as unknown[]).map(String) : [],
    skills: Array.isArray(b.skills) ? (b.skills as unknown[]).map(String).filter(Boolean).slice(0, 8) : [],
    dealerId: b.dealerId ? String(b.dealerId) : null,
    years: Number(b.years) || 0,
    languages: String(b.languages ?? ""),
    verified: Boolean(b.verified),
  });
  return "error" in result ? json({ error: result.error }, 400) : json({ ok: true, ...result });
}
