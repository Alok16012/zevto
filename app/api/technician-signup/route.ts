import { json } from "../../lib/supabaseServer";
import { createTechnician } from "../../lib/technicianAccounts";

/* Technicians sign themselves up from the partner app. They start with KYC
 * pending and inactive — no jobs and not shown to customers until an admin
 * approves them in Admin → People → Technicians. */
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const result = await createTechnician({
    name: String(b.name ?? "").trim(),
    email: String(b.email ?? "").trim().toLowerCase(),
    password: String(b.password ?? ""),
    phone: String(b.phone ?? "").replace(/\D/g, ""),
    years: Number(b.years) || 0,
    verified: false,
  });
  if ("error" in result) return json({ error: result.error }, /already used/.test(result.error) ? 409 : 400);
  return json({ ok: true, code: result.code });
}
