import Anthropic from "@anthropic-ai/sdk";
import { authAdmin, json, rest } from "../../../lib/supabaseServer";
import { COMPANY } from "../../../storefront/content";

/* AI first reply in Support Chat. The customer app calls this right after the
 * customer sends a message; Claude answers from the customer's own orders and
 * service jobs plus Zavtoo's services, and the reply is saved as an agent
 * message (agent_id null = the assistant). A human agent who replied in the
 * last 30 minutes owns the thread, so the assistant stays quiet then.
 * Needs ANTHROPIC_API_KEY on the server; without it this does nothing. */

interface Msg { sender: "customer" | "agent"; agent_id: string | null; body: string; image_path: string | null; created_at: string }

const SYSTEM = `You are the support assistant for ${COMPANY.name} ("Zavtoo"), an Indian water purifier (RO) company: purifier sales, spare parts, service visits (repair, filter change, installation, deep cleaning, water test, uninstall/reinstall) and AMC plans.

Answer the customer's latest message in the support chat of the Zavtoo app.
- Be warm, brief and practical: 1–4 short sentences, plain text, no markdown headings.
- Reply in the customer's language and script (English, Hindi or Hinglish).
- Use the customer's orders and service jobs given to you to answer status questions; quote refs like #SRV1023.
- Booking, cancelling, rescheduling and payments are done in the app (Service tab / My Orders) — point them there.
- The 4-digit start code and close code for a visit are shown on the Track Service screen; tell them where to find it, never invent one.
- Warranty: repairs and maintenance have a 90-day service warranty; spare parts and filters have a 10-day warranty.
- Never make up prices, dates, refunds or technician details you weren't given. If you can't resolve it (refunds, complaints, anything needing a person), say a Zavtoo team member will reply here shortly, and that they can also call or WhatsApp ${COMPANY.phone}.`;

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = token ? await authAdmin.userFromToken(token) : null;
  if (!user) return json({ error: "Please log in again" }, 401);
  if (!process.env.ANTHROPIC_API_KEY) return json({ skipped: "AI replies aren't set up" });

  const { data: msgs } = await rest.select<Msg>("chat_messages", `select=sender,agent_id,body,image_path,created_at&customer_id=eq.${user.id}&order=created_at.desc&limit=30`);
  const history = (msgs ?? []).reverse();
  const last = history[history.length - 1];
  if (!last || last.sender !== "customer") return json({ skipped: "Nothing to answer" });
  const humanRecently = history.some((m) => m.sender === "agent" && m.agent_id && Date.now() - new Date(m.created_at).getTime() < 30 * 60_000);
  if (humanRecently) return json({ skipped: "A team member is handling this chat" });

  const [profile, orders, jobs] = await Promise.all([
    rest.select<{ full_name: string }>("profiles", `select=full_name&id=eq.${user.id}`),
    rest.select<{ ref: string; status: string; amount: number; payment: string; created_at: string; items: { name: string; qty: number }[] }>(
      "orders", `select=ref,status,amount,payment,created_at,items&customer_id=eq.${user.id}&order=created_at.desc&limit=5`),
    rest.select<{ ref: string; type: string; status: string; visit_date: string; slot: string; amount: number; reschedule_reason: string | null }>(
      "service_requests", `select=ref,type,status,visit_date,slot,amount,reschedule_reason&customer_id=eq.${user.id}&order=created_at.desc&limit=5`),
  ]);
  const context = [
    `Customer name: ${profile.data?.[0]?.full_name || "unknown"}`,
    `Today: ${new Date().toISOString().slice(0, 10)}`,
    `Recent orders: ${orders.data?.length ? orders.data.map((o) => `#${o.ref} ${o.status} ₹${o.amount} (${o.payment}) placed ${o.created_at.slice(0, 10)}: ${o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}`).join(" | ") : "none"}`,
    `Recent service jobs: ${jobs.data?.length ? jobs.data.map((j) => `#${j.ref} ${j.type} ${j.status} on ${j.visit_date} ${j.slot} ₹${j.amount}${j.reschedule_reason ? ` (rescheduled: ${j.reschedule_reason})` : ""}`).join(" | ") : "none"}`,
  ].join("\n");

  // Chat history → alternating turns; the first turn must be the customer's.
  const firstCustomer = history.findIndex((m) => m.sender === "customer");
  const messages: Anthropic.Beta.BetaMessageParam[] = history.slice(firstCustomer).map((m) => ({
    role: m.sender === "customer" ? "user" : "assistant",
    content: m.body.trim() || (m.image_path ? "[sent a photo]" : "…"),
  }));

  const client = new Anthropic();
  let reply = "";
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low" },
      // If Claude declines on a safety classifier, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: `About this customer:\n${context}` },
      ],
      messages,
    });
    if (response.stop_reason === "refusal") return json({ skipped: "Left for a team member" });
    reply = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Assistant is busy" }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `Assistant unavailable (${e.status})` }, 502);
    throw e;
  }
  if (!reply) return json({ skipped: "No reply" });

  const { error } = await rest.insert("chat_messages", { customer_id: user.id, sender: "agent", agent_id: null, body: reply.slice(0, 2000) });
  if (error) return json({ error }, 500);
  return json({ ok: true });
}
