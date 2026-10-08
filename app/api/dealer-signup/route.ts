import { json } from "../../lib/supabaseServer";
import { createDealerAccount } from "../../lib/dealerAccounts";

/* Dealers sign themselves up from /dealer. They start with KYC pending — their
 * listings stay hidden and they can't take jobs until an admin verifies them
 * in Admin → People → Dealers. */
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const result = await createDealerAccount({
    shopName: String(b.shopName ?? "").trim(),
    owner: String(b.owner ?? "").trim(),
    email: String(b.email ?? "").trim().toLowerCase(),
    password: String(b.password ?? ""),
    phone: String(b.phone ?? "").replace(/\D/g, ""),
    gstin: String(b.gstin ?? "").trim().toUpperCase(),
    address: String(b.address ?? "").trim(),
    city: String(b.city ?? "").trim(),
    pincodes: Array.isArray(b.pincodes) ? (b.pincodes as unknown[]).map((p) => String(p).trim()).filter(Boolean) : [],
  });
  if ("error" in result) return json({ error: result.error }, /already used/.test(result.error) ? 409 : 400);
  return json({ ok: true, code: result.code });
}
