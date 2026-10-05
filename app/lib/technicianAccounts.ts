/* Server-only: creates a technician login plus its technician record. Used by
 * admins adding technicians and by technicians signing themselves up. */

import { EMAIL_RE, authAdmin, rest } from "./supabaseServer";

const PIN_RE = /^[1-9]\d{5}$/;

export interface NewTechnician {
  name: string; email: string; password: string; phone: string;
  pincodes?: string[]; skills?: string[]; years?: number; languages?: string;
  dealerId?: string | null; verified?: boolean;
}

/** Checks the fields; returns the first problem, or null. */
export function technicianProblem(t: NewTechnician) {
  if (t.name.length < 2 || t.name.length > 60) return "Enter the full name";
  if (!EMAIL_RE.test(t.email)) return "Enter a valid email — it's the login ID";
  if (t.password.length < 8) return "Password must be at least 8 characters";
  if (!/^[6-9]\d{9}$/.test(t.phone)) return "Enter a 10-digit mobile number";
  if ((t.pincodes ?? []).some((p) => !PIN_RE.test(p))) return "One of the pincodes isn't valid";
  return null;
}

export async function createTechnician(t: NewTechnician): Promise<{ id: string; code: string } | { error: string }> {
  const problem = technicianProblem(t);
  if (problem) return { error: problem };

  const { data: created, error } = await authAdmin.createUser({
    email: t.email, password: t.password, email_confirm: true,
    app_metadata: { role: "technician" },
    user_metadata: { full_name: t.name, phone: `+91${t.phone}` },
  });
  if (error || !created) {
    return { error: /already|registered|exists/i.test(error ?? "") ? "That email is already used" : (error ?? "Couldn't create the login") };
  }

  // Supabase attaches app_metadata just after creating the user, so the sign-up
  // trigger may have filed them as a customer — give them their TEC- ID here.
  const { data: code, error: codeErr } = await rest.rpc<string>("next_code", { p_role: "technician" });
  if (codeErr || !code) { await authAdmin.deleteUser(created.id); return { error: codeErr ?? "Couldn't issue an ID" }; }
  await rest.update("profiles", `id=eq.${created.id}`, { role: "technician", code, full_name: t.name });
  const { error: techErr } = await rest.insert("technicians", {
    id: created.id, code, name: t.name, phone: `+91${t.phone}`, email: t.email, dealer_id: t.dealerId ?? null,
    pincodes: t.pincodes ?? [], skills: t.skills ?? [], years: Math.max(0, Math.min(50, t.years ?? 0)), languages: t.languages ?? "",
    kyc: t.verified ? "Verified" : "Pending", active: Boolean(t.verified),
  });
  if (techErr) {
    // Don't leave a login without a technician record behind.
    await authAdmin.deleteUser(created.id);
    return { error: techErr };
  }
  return { id: created.id, code };
}
