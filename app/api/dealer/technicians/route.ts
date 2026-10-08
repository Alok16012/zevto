import { json } from "../../../lib/supabaseServer";
import { dealerFrom } from "../../../lib/dealerAccounts";
import { createTechnician } from "../../../lib/technicianAccounts";

/* A dealer adds a technician to their own team. The technician logs in to
 * /technician with these details; Zavtoo still verifies their KYC before they
 * get jobs. */
export async function POST(req: Request) {
  const dealer = await dealerFrom(req);
  if (!dealer) return json({ error: "Only dealers can do this" }, 403);
  if (!dealer.active) return json({ error: "Your shop is paused. Contact Zavtoo." }, 403);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const result = await createTechnician({
    name: String(b.name ?? "").trim(),
    email: String(b.email ?? "").trim().toLowerCase(),
    password: String(b.password ?? ""),
    phone: String(b.phone ?? "").replace(/\D/g, ""),
    pincodes: Array.isArray(b.pincodes) ? (b.pincodes as unknown[]).map(String) : [],
    years: Number(b.years) || 0,
    dealerId: dealer.id,
    verified: false,
  });
  return "error" in result ? json({ error: result.error }, /already used/.test(result.error) ? 409 : 400) : json({ ok: true, code: result.code });
}
