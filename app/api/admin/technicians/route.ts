import { EMAIL_RE, json, serverAdmin, staffFrom } from "../../../lib/supabaseServer";

const PIN_RE = /^[1-9]\d{5}$/;

/* Staff create technician logins and reset their passwords. */
export async function POST(req: Request) {
  if (!(await staffFrom(req))) return json({ error: "Only admins can do this" }, 403);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const sb = serverAdmin();

  if (b.action === "reset-password") {
    const id = String(b.id ?? "");
    const password = String(b.password ?? "");
    if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
    const { data: t } = await sb.from("technicians").select("id").eq("id", id).maybeSingle();
    if (!t) return json({ error: "Technician not found" }, 404);
    const { error } = await sb.auth.admin.updateUserById(id, { password });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
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

  const { data: created, error } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { role: "technician" },
    user_metadata: { full_name: name, phone: `+91${phone}` },
  });
  if (error || !created.user) {
    return json({ error: /already|registered|exists/i.test(error?.message ?? "") ? "That email is already used" : (error?.message ?? "Couldn't create the login") }, 400);
  }

  // The sign-up trigger has already given them a TEC- ID in profiles.
  const { data: prof } = await sb.from("profiles").select("code").eq("id", created.user.id).single();
  const { error: techErr } = await sb.from("technicians").insert({
    id: created.user.id, code: prof?.code, name, phone: `+91${phone}`, email, dealer_id: dealerId,
    pincodes, skills, years, languages: String(b.languages ?? ""), kyc: b.verified ? "Verified" : "Pending", active: Boolean(b.verified),
  });
  if (techErr) {
    // Don't leave a login without a technician record behind.
    await sb.auth.admin.deleteUser(created.user.id);
    return json({ error: techErr.message }, 400);
  }
  return json({ ok: true, id: created.user.id, code: prof?.code });
}
