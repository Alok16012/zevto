import { EMAIL_RE, authAdmin, json, rest, staffFrom } from "../../../lib/supabaseServer";

const PIN_RE = /^[1-9]\d{5}$/;

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

  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const phone = String(b.phone ?? "").replace(/\D/g, "");
  const pincodes = Array.isArray(b.pincodes) ? (b.pincodes as unknown[]).map(String) : [];
  const skills = Array.isArray(b.skills) ? (b.skills as unknown[]).map(String).filter(Boolean).slice(0, 8) : [];
  const dealerId = b.dealerId ? String(b.dealerId) : null;
  const years = Math.max(0, Math.min(50, Number(b.years) || 0));

  if (name.length < 2) return json({ error: "Enter the technician's full name" }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email — it's their login ID" }, 400);
  if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
  if (!/^[6-9]\d{9}$/.test(phone)) return json({ error: "Enter a 10-digit mobile number" }, 400);
  if (pincodes.some((p) => !PIN_RE.test(p))) return json({ error: "One of the pincodes isn't valid" }, 400);

  const { data: created, error } = await authAdmin.createUser({
    email, password, email_confirm: true,
    app_metadata: { role: "technician" },
    user_metadata: { full_name: name, phone: `+91${phone}` },
  });
  if (error || !created) {
    return json({ error: /already|registered|exists/i.test(error ?? "") ? "That email is already used" : (error ?? "Couldn't create the login") }, 400);
  }

  // Supabase attaches app_metadata just after creating the user, so the sign-up
  // trigger may have filed them as a customer — give them their TEC- ID here.
  const { data: code, error: codeErr } = await rest.rpc<string>("next_code", { p_role: "technician" });
  if (codeErr || !code) { await authAdmin.deleteUser(created.id); return json({ error: codeErr ?? "Couldn't issue an ID" }, 500); }
  await rest.update("profiles", `id=eq.${created.id}`, { role: "technician", code, full_name: name });
  const { error: techErr } = await rest.insert("technicians", {
    id: created.id, code, name, phone: `+91${phone}`, email, dealer_id: dealerId,
    pincodes, skills, years, languages: String(b.languages ?? ""), kyc: b.verified ? "Verified" : "Pending", active: Boolean(b.verified),
  });
  if (techErr) {
    // Don't leave a login without a technician record behind.
    await authAdmin.deleteUser(created.id);
    return json({ error: techErr }, 400);
  }
  return json({ ok: true, id: created.id, code });
}
