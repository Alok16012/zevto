"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { friendly, supabaseFor, useLive } from "../lib/supabase";
import { useSignedUrls } from "../lib/photos";
import type { AdminCustomer } from "../lib/adminData";
import { Badge, Btn, Initials, Panel, SearchBox, input, muted } from "./kit";

/* Support inbox: every customer conversation from the app's Chat tab. */

interface Msg { id: string; customer_id: string; sender: "customer" | "agent"; body: string; image_path: string | null; created_at: string }

const sb = () => supabaseFor("admin");
const SEEN_KEY = "zavtoo:admin:chat-seen";
const readSeen = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}"); } catch { return {}; } };

export function useSupportUnread(enabled: boolean) {
  const live = useLive("admin", enabled ? "support-count" : null,
    async (c) => (await c.from("chat_messages").select("customer_id, sender, created_at").order("created_at", { ascending: false }).limit(1000)).data ?? [],
    [{ table: "chat_messages" }]);
  const seen = readSeen();
  const latest = new Map<string, { sender: string; at: string }>();
  (live.data ?? []).forEach((m) => { if (!latest.has(m.customer_id)) latest.set(m.customer_id, { sender: m.sender, at: m.created_at }); });
  // A thread needs attention when the customer spoke last and we haven't opened it since.
  return [...latest.entries()].filter(([id, m]) => m.sender === "customer" && (!seen[id] || seen[id] < m.at)).length;
}

export function SupportSection({ customers, notify }: { customers: AdminCustomer[]; notify: (m: string, bad?: boolean) => void }) {
  const live = useLive("admin", "support", async (c) => {
    const { data, error } = await c.from("chat_messages").select("*").order("created_at").limit(3000);
    if (error) throw error;
    return (data ?? []) as Msg[];
  }, [{ table: "chat_messages" }]);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [seen, setSeen] = useState<Record<string, string>>(readSeen);
  const msgs = live.data ?? [];

  const threads = useMemo(() => {
    const by = new Map<string, Msg[]>();
    msgs.forEach((m) => by.set(m.customer_id, [...(by.get(m.customer_id) ?? []), m]));
    return [...by.entries()].map(([id, list]) => ({ id, list, last: list[list.length - 1], customer: customers.find((c) => c.id === id) }))
      .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [msgs, customers]);

  const rows = threads.filter((t) => !q.trim() || `${t.customer?.name} ${t.customer?.code} ${t.customer?.phone}`.toLowerCase().includes(q.trim().toLowerCase()));
  const unread = (t: (typeof threads)[number]) => t.last.sender === "customer" && (!seen[t.id] || seen[t.id] < t.last.created_at);
  const cur = threads.find((t) => t.id === open);

  useEffect(() => {
    if (!cur) return;
    const next = { ...readSeen(), [cur.id]: cur.last.created_at };
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    setSeen(next);
  }, [cur?.id, cur?.last.created_at]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="admin-grid-2" style={{ alignItems: "start" }}>
      <Panel title={`Conversations (${threads.length})`} pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search customer" />}>
        {rows.map((t) => (
          <button key={t.id} onClick={() => setOpen(t.id)} className="admin-row" style={{
            width: "100%", display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", border: "none", borderTop: "1px solid var(--line)",
            background: open === t.id ? "var(--blue-tint)" : "transparent", cursor: "pointer", textAlign: "left",
          }}>
            <Initials name={t.customer?.name ?? "?"} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b style={{ fontSize: 13.5 }}>{t.customer?.name ?? "Customer"}</b>
                <span style={muted}>{new Date(t.last.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" })}</span>
              </span>
              <span style={{ ...muted, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.last.sender === "agent" ? "You: " : ""}{t.last.image_path ? "📷 " : ""}{t.last.body}
              </span>
            </span>
            {unread(t) && <Badge tone="red">New</Badge>}
          </button>
        ))}
        {rows.length === 0 && <p style={{ ...muted, padding: 16, margin: 0 }}>{live.data ? "No messages yet. Customer chats from the app appear here." : "Loading…"}</p>}
      </Panel>

      {cur ? <Thread key={cur.id} list={cur.list} customer={cur.customer} customerId={cur.id} notify={notify} onSent={live.reload} />
        : <Panel title="Conversation"><p style={{ ...muted, margin: 0 }}>Pick a conversation to read and reply.</p></Panel>}
    </div>
  );
}

function Thread({ list, customer, customerId, notify, onSent }: {
  list: Msg[]; customer?: AdminCustomer; customerId: string; notify: (m: string, bad?: boolean) => void; onSent: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const urls = useSignedUrls("admin", list.map((m) => m.image_path).filter((p): p is string => !!p));
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [list.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    const { data: { user } } = await sb().auth.getUser();
    const { error } = await sb().from("chat_messages").insert({ customer_id: customerId, sender: "agent", agent_id: user?.id, body });
    setBusy(false);
    if (error) { notify(friendly(error), true); return; }
    setDraft(""); onSent();
  };

  return (
    <Panel title={<>{customer?.name ?? "Customer"} <span style={{ ...muted, fontWeight: 500 }}>{customer?.code} · {customer?.phone || customer?.email}</span></>} pad={false}>
      <div style={{ maxHeight: 460, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-secondary)" }}>
        {list.map((m) => {
          const me = m.sender === "agent";
          return (
            <div key={m.id} style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              <div style={{ padding: "8px 12px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.5, background: me ? "var(--blue)" : "var(--surface)", color: me ? "white" : "var(--ink)", boxShadow: "var(--shadow-card)" }}>
                {m.image_path && urls[m.image_path] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={urls[m.image_path]} target="_blank" rel="noreferrer"><img src={urls[m.image_path]} alt="Customer photo" style={{ display: "block", maxWidth: 220, borderRadius: 8, marginBottom: 6 }} /></a>
                )}
                {m.body}
              </div>
              <p style={{ ...muted, margin: "2px 4px 0", textAlign: me ? "right" : "left", fontSize: 10.5 }}>
                {new Date(m.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <form onSubmit={send} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a reply…" aria-label="Reply" style={{ ...input, flex: 1 }} maxLength={1000} />
        <Btn type="submit" disabled={!draft.trim() || busy}>{busy ? "Sending…" : "Send"}</Btn>
      </form>
    </Panel>
  );
}
