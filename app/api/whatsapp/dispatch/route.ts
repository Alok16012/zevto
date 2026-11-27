import { json, rest } from "../../../lib/supabaseServer";

/* Sends queued WhatsApp messages (table whatsapp_outbox, see supabase/whatsapp-migration.sql)
 * through the WhatsApp Cloud API. The database pings this route whenever it queues a
 * message, and again every minute; anyone may call it, since it only sends what the
 * database already queued.
 *
 * Netlify environment variables:
 *   WHATSAPP_TOKEN     permanent System User token (whatsapp_business_messaging)
 *   WHATSAPP_PHONE_ID  Phone number ID of 8929 45 46 47 (WhatsApp Manager → Phone numbers)
 *   WHATSAPP_API_VERSION  optional, default v25.0 */

interface Outbox {
  id: string; to_phone: string; template: string; lang: string; params: string[];
  button_param: string | null; attempts: number;
}

const MAX_ATTEMPTS = 5;

async function send(m: Outbox, token: string, phoneId: string, version: string) {
  const components: Record<string, unknown>[] = [];
  if (m.params.length) components.push({ type: "body", parameters: m.params.map((text) => ({ type: "text", text })) });
  if (m.button_param) components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: m.button_param }] });
  const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to: m.to_phone, type: "template",
      template: { name: m.template, language: { code: m.lang || "en" }, components },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = body?.error;
    return { ok: false as const, error: [e?.code, e?.error_data?.details ?? e?.message ?? `HTTP ${res.status}`].filter(Boolean).join(" · ").slice(0, 500) };
  }
  return { ok: true as const, id: String(body?.messages?.[0]?.id ?? "") };
}

export async function POST() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v25.0";
  // Not set up yet: leave the queue alone so nothing is lost.
  if (!token || !phoneId) return json({ skipped: "WhatsApp isn't set up (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)" }, 501);

  const { data: batch, error } = await rest.rpc<Outbox[]>("wa_claim", { p_limit: 20 });
  if (error) return json({ error }, 500);

  let sent = 0, failed = 0;
  for (const m of batch ?? []) {
    const r = await send(m, token, phoneId, version).catch((e: unknown) => ({ ok: false as const, error: String(e).slice(0, 500) }));
    if (r.ok) {
      sent++;
      await rest.update("whatsapp_outbox", `id=eq.${m.id}`, { status: "Sent", wa_message_id: r.id, sent_at: new Date().toISOString(), error: null });
    } else {
      failed++;
      // Try again on the next run, up to MAX_ATTEMPTS.
      await rest.update("whatsapp_outbox", `id=eq.${m.id}`, { status: m.attempts >= MAX_ATTEMPTS ? "Failed" : "Pending", error: r.error });
    }
  }
  return json({ sent, failed });
}
