import { EMAIL_RE, authAdmin, json, rest } from "../../../lib/supabaseServer";

/* Emails a customer the link to their service bill. The caller is the job's
 * technician (or staff). Sends through Resend when RESEND_API_KEY and
 * BILL_FROM_EMAIL are set; otherwise answers 501 so the app can fall back to
 * opening the technician's own email app. */

interface Job { id: string; ref: string; tech_id: string | null; customer_id: string | null; customer_name: string; type: string; amount: number; status: string; bill_token: string }

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = token ? await authAdmin.userFromToken(token) : null;
  if (!user) return json({ error: "Please log in again" }, 401);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  const id = String(b.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Bad request" }, 400);
  const { data: rows, error } = await rest.select<Job>("service_requests", `select=id,ref,tech_id,customer_id,customer_name,type,amount,status,bill_token&id=eq.${id}`);
  const job = rows?.[0];
  if (error || !job) return json({ error: "Job not found" }, 404);
  const role = user.app_metadata?.role;
  if (job.tech_id !== user.id && role !== "admin" && role !== "super_admin") return json({ error: "Not your job" }, 403);
  if (job.status !== "Completed") return json({ error: "Close the job first" }, 400);

  let to = String(b.email ?? "").trim().toLowerCase();
  if (!to && job.customer_id) {
    const { data: p } = await rest.select<{ email: string | null }>("profiles", `select=email&id=eq.${job.customer_id}`);
    to = p?.[0]?.email ?? "";
  }
  if (!EMAIL_RE.test(to)) return json({ error: "Enter the customer's email", needEmail: true }, 400);

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const link = `${origin}/bill/${job.id}?t=${job.bill_token}`;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.BILL_FROM_EMAIL;
  if (!key || !from) return json({ error: "Email sending isn't set up", fallback: true, to, link }, 501);

  const amount = `₹${job.amount.toLocaleString("en-IN")}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from, to, subject: `Your Zavtoo service bill #${job.ref} · ${amount}`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#0f1729">
        <p>Hi ${escape(job.customer_name)},</p>
        <p>Thank you for choosing Zavtoo. Your <b>${escape(job.type)}</b> service <b>#${escape(job.ref)}</b> is complete. Total paid: <b>${amount}</b>.</p>
        <p><a href="${link}" style="display:inline-block;background:#0b5cff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">View your bill</a></p>
        <p style="color:#5b6478;font-size:13px">Or open: ${link}</p></div>`,
      text: `Hi ${job.customer_name}, your ${job.type} service #${job.ref} is complete. Total paid: ${amount}. View your bill: ${link}`,
    }),
  });
  if (!res.ok) return json({ error: "Couldn't send the email. Try WhatsApp instead." }, 502);
  return json({ ok: true, to });
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
