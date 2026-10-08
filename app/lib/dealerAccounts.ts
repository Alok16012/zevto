/* Server-only: creates a dealer login plus its dealer record. Dealers sign
 * themselves up from /dealer and start as KYC Pending until ops verify them. */

import { EMAIL_RE, authAdmin, rest } from "./supabaseServer";

const PIN_RE = /^[1-9]\d{5}$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export interface NewDealerAccount {
  shopName: string; owner: string; email: string; password: string; phone: string;
  gstin: string; address: string; city: string; pincodes: string[];
}

/** Checks the fields; returns the first problem, or null. */
export function dealerProblem(d: NewDealerAccount) {
  if (d.shopName.length < 3 || d.shopName.length > 80) return "Enter your shop name";
  if (d.owner.length < 2 || d.owner.length > 60) return "Enter the owner's name";
  if (!/^[6-9]\d{9}$/.test(d.phone)) return "Enter a 10-digit mobile number";
  if (!EMAIL_RE.test(d.email)) return "Enter a valid email — it's your login ID";
  if (d.password.length < 8) return "Password must be at least 8 characters";
  if (d.gstin && !GSTIN_RE.test(d.gstin)) return "That GSTIN doesn't look right";
  if (d.address.length < 8) return "Enter the full shop address";
  if (d.city.length < 2) return "Enter the city";
  if (!d.pincodes.length) return "Add the pincode of your shop";
  if (d.pincodes.length > 30) return "Up to 30 pincodes";
  if (d.pincodes.some((p) => !PIN_RE.test(p))) return "One of the pincodes isn't valid";
  return null;
}

export async function createDealerAccount(d: NewDealerAccount): Promise<{ id: string; code: string } | { error: string }> {
  const problem = dealerProblem(d);
  if (problem) return { error: problem };

  const { data: created, error } = await authAdmin.createUser({
    email: d.email, password: d.password, email_confirm: true,
    app_metadata: { role: "dealer" },
    user_metadata: { full_name: d.owner, phone: `+91${d.phone}` },
  });
  if (error || !created) {
    return { error: /already|registered|exists/i.test(error ?? "") ? "That email is already used" : (error ?? "Couldn't create the login") };
  }

  // The sign-up trigger may have filed them as a customer before the role
  // arrived — keep their DLR- ID if they already have one, else issue it.
  const { data: prof } = await rest.select<{ code: string }>("profiles", `select=code&id=eq.${created.id}`);
  let code = prof?.[0]?.code ?? "";
  if (!code.startsWith("DLR-")) {
    const { data: next, error: codeErr } = await rest.rpc<string>("next_code", { p_role: "dealer" });
    if (codeErr || !next) { await authAdmin.deleteUser(created.id); return { error: codeErr ?? "Couldn't issue an ID" }; }
    code = next;
  }
  await rest.update("profiles", `id=eq.${created.id}`, { role: "dealer", code, full_name: d.owner });
  const { error: dealerErr } = await rest.insert("dealers", {
    code, user_id: created.id, email: d.email, name: d.shopName, owner: d.owner, phone: `+91${d.phone}`,
    gstin: d.gstin, address: d.address, city: d.city, pincodes: Array.from(new Set(d.pincodes)), kyc: "Pending",
  });
  if (dealerErr) {
    // Don't leave a login without a dealer record behind.
    await authAdmin.deleteUser(created.id);
    return { error: dealerErr };
  }
  return { id: created.id, code };
}

/** The dealer record behind a request's Bearer token, or null. */
export async function dealerFrom(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const user = await authAdmin.userFromToken(token);
  if (user?.app_metadata?.role !== "dealer") return null;
  const { data } = await rest.select<{ id: string; kyc: string; active: boolean }>("dealers", `select=id,kyc,active&user_id=eq.${user.id}`);
  return data?.[0] ?? null;
}
