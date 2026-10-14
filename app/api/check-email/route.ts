import { json } from "../../lib/supabaseServer";
import { emailTypo } from "../../lib/emailCheck";
import { emailProblem } from "../../lib/emailCheckServer";

/* Live email check for sign-up forms. Deliberately doesn't say whether an
 * account already exists, so it can't be used to find out who's registered. */
export async function GET(req: Request) {
  const email = (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();
  const error = await emailProblem(email);
  return json({ ok: !error, error, suggestion: emailTypo(email) });
}
