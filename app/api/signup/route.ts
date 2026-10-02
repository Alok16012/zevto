import { EMAIL_RE, authAdmin, json, rest } from "../../lib/supabaseServer";

/* Customer sign-up. Accounts are created already confirmed because Supabase's
 * built-in mailer only reaches the project team; once a real email service is
 * set up, switch to supabase.auth.signUp() with email confirmation. */
export async function POST(req: Request) {
  let body: { name?: string; email?: string; password?: string; phone?: string; referral?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const phone = (body.phone ?? "").replace(/\D/g, "");
  const referral = (body.referral ?? "").trim().toUpperCase();

  if (name.length < 2 || name.length > 60) return json({ error: "Enter your full name" }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email" }, 400);
  if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
  if (phone && !/^[6-9]\d{9}$/.test(phone)) return json({ error: "Enter a 10-digit mobile number" }, 400);
  if (referral && !/^CUS-\d{6}$/.test(referral)) return json({ error: "Referral codes look like CUS-100101" }, 400);

  if (referral) {
    const { data } = await rest.select<{ id: string }>("profiles", `select=id&role=eq.customer&code=eq.${encodeURIComponent(referral)}`);
    if (!data?.length) return json({ error: "That referral code doesn't exist" }, 400);
  }

  const { error } = await authAdmin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: name, phone: phone ? `+91${phone}` : "", referred_by: referral },
  });
  if (error) {
    const taken = /already|registered|exists/i.test(error);
    return json({ error: taken ? "An account with this email already exists. Log in instead." : error }, taken ? 409 : 400);
  }
  return json({ ok: true });
}
