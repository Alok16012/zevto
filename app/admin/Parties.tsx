"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Toggle } from "../components/ui";
import { fmtDay } from "../lib/catalog";
import { PRODUCTS, inr } from "../lib/data";
import { friendly, supabaseFor, useLive } from "../lib/supabase";
import { Badge, Btn, Filter, Modal, Panel, SearchBox, Stat, Table, fieldLabel, input, muted, type Tone } from "./kit";

/* ───────────────────────── Parties & ledger ─────────────────────────
 * Dealers (we sell spare parts to them), vendors and suppliers (we buy from them).
 * Purchase bills add stock, sale bills take it off, payments settle the balance.
 * Tables: parties, party_bills, party_payments (supabase/parties-migration.sql). */

export type PartyType = "Dealer" | "Vendor" | "Supplier";
export interface Party {
  id: string; code: string; type: PartyType; name: string; contact: string; phone: string; email: string; gstin: string;
  address: string; city: string; state: string; opening_balance: number; dealer_id: string | null; active: boolean; notes: string; created_at: string;
}
interface BillLine { product_id: string; name: string; qty: number; rate: number }
interface Bill {
  id: string; ref: string; kind: "Purchase" | "Sale"; party_id: string; bill_no: string; bill_date: string; items: BillLine[];
  subtotal: number; tax: number; total: number; notes: string; status: "Posted" | "Cancelled"; cancel_reason: string; created_at: string;
}
interface Payment { id: string; party_id: string; kind: "Received" | "Paid"; amount: number; mode: string; reference: string; paid_on: string; notes: string; created_at: string }
interface Books { parties: Party[]; bills: Bill[]; payments: Payment[] }

const TYPES: PartyType[] = ["Dealer", "Vendor", "Supplier"];
const TYPE_TONE: Record<PartyType, Tone> = { Dealer: "blue", Vendor: "purple", Supplier: "amber" };
const MODES = ["Cash", "UPI", "Bank transfer", "Cheque", "Other"] as const;
const WATCH = ["parties", "party_bills", "party_payments", "products"].map((table) => ({ table }));
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const notSetUp = "Parties aren't set up yet — run supabase/parties-migration.sql in Supabase first.";

async function loadBooks(sb: SupabaseClient): Promise<Books> {
  const [parties, bills, payments] = await Promise.all([
    sb.from("parties").select("*").order("name"),
    sb.from("party_bills").select("*").order("bill_date", { ascending: false }).order("created_at", { ascending: false }),
    sb.from("party_payments").select("*").order("paid_on", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const err = parties.error ?? bills.error ?? payments.error;
  if (err) throw /parties|party_/.test(err.message) ? new Error(notSetUp) : err;
  return { parties: parties.data as Party[], bills: bills.data as Bill[], payments: payments.data as Payment[] };
}

/** What the party owes us right now (negative = we owe them). */
function balanceOf(p: Party, bills: Bill[], payments: Payment[]) {
  let b = p.opening_balance;
  for (const x of bills) if (x.party_id === p.id && x.status === "Posted") b += x.kind === "Sale" ? x.total : -x.total;
  for (const x of payments) if (x.party_id === p.id) b += x.kind === "Paid" ? x.amount : -x.amount;
  return b;
}
function Balance({ value }: { value: number }) {
  if (!value) return <span style={muted}>Settled</span>;
  return <span style={{ fontWeight: 700, color: value > 0 ? "var(--green, #1d7a35)" : "var(--error-text, #b3261e)" }}>{inr(Math.abs(value))} <small style={{ fontWeight: 500 }}>{value > 0 ? "to receive" : "to pay"}</small></span>;
}

type Tab = "Parties" | "Purchases" | "Sales" | "Payments";

export function PartiesSection({ notify }: { notify: (msg: string, bad?: boolean) => void }) {
  const live = useLive("admin", "parties", loadBooks, WATCH);
  const [tab, setTab] = useState<Tab>("Parties");
  const [type, setType] = useState<"All" | PartyType>("All");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Party | "new" | null>(null);
  const [ledger, setLedger] = useState<string | null>(null);
  const [billing, setBilling] = useState<{ kind: Bill["kind"]; party?: string } | null>(null);
  const [viewBill, setViewBill] = useState<string | null>(null);
  const [paying, setPaying] = useState<{ party?: string; kind?: Payment["kind"] } | null>(null);

  const books = live.data;
  const parties = useMemo(() => books?.parties ?? [], [books]);
  const bills = useMemo(() => books?.bills ?? [], [books]);
  const payments = useMemo(() => books?.payments ?? [], [books]);
  const byId = useMemo(() => new Map(parties.map((p) => [p.id, p])), [parties]);
  const balances = useMemo(() => new Map(parties.map((p) => [p.id, balanceOf(p, bills, payments)])), [parties, bills, payments]);

  if (live.error) return <Panel><p style={{ margin: 0, color: "var(--error-text)", fontWeight: 600 }}>{live.error}</p></Panel>;
  if (!books) return <Panel><p style={{ ...muted, margin: 0 }}>Loading parties…</p></Panel>;

  const month = today().slice(0, 7);
  const monthTotal = (kind: Bill["kind"]) => bills.filter((b) => b.kind === kind && b.status === "Posted" && b.bill_date.startsWith(month)).reduce((n, b) => n + b.total, 0);
  const receive = [...balances.values()].filter((v) => v > 0).reduce((n, v) => n + v, 0);
  const pay = -[...balances.values()].filter((v) => v < 0).reduce((n, v) => n + v, 0);
  const done = (msg: string) => { notify(msg); live.reload(); };
  const match = (p: Party) => `${p.name} ${p.code} ${p.phone} ${p.city} ${p.gstin} ${p.contact}`.toLowerCase().includes(q.toLowerCase().trim());

  const shownParties = parties.filter((p) => (type === "All" || p.type === type) && match(p));
  const billRows = (kind: Bill["kind"]) => bills.filter((b) => b.kind === kind && (!q.trim() || match(byId.get(b.party_id)!) || b.ref.toLowerCase().includes(q.toLowerCase()) || b.bill_no.toLowerCase().includes(q.toLowerCase())));
  const payRows = payments.filter((x) => !q.trim() || (byId.get(x.party_id) && match(byId.get(x.party_id)!)));
  const partyCell = (id: string) => { const p = byId.get(id); return p ? <span><strong>{p.name}</strong> <Badge tone={TYPE_TONE[p.type]}>{p.type}</Badge></span> : "—"; };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Stat label="To receive" value={inr(receive)} sub="Dealers & parties owe us" tone="green" />
        <Stat label="To pay" value={inr(pay)} sub="We owe vendors & suppliers" tone="red" />
        <Stat label="Sales this month" value={inr(monthTotal("Sale"))} sub={`${bills.filter((b) => b.kind === "Sale" && b.status === "Posted" && b.bill_date.startsWith(month)).length} bills`} tone="blue" />
        <Stat label="Purchases this month" value={inr(monthTotal("Purchase"))} sub={`${bills.filter((b) => b.kind === "Purchase" && b.status === "Posted" && b.bill_date.startsWith(month)).length} bills`} tone="amber" />
      </div>

      <Panel title={<Filter<Tab> options={["Parties", "Purchases", "Sales", "Payments"]} value={tab} onChange={(t) => { setTab(t); setQ(""); }}
        counts={{ Parties: parties.length, Purchases: bills.filter((b) => b.kind === "Purchase").length, Sales: bills.filter((b) => b.kind === "Sale").length, Payments: payments.length }} />}
        actions={
          tab === "Parties" ? <Btn small onClick={() => setEditing("new")}>＋ Add party</Btn>
          : tab === "Purchases" ? <Btn small onClick={() => setBilling({ kind: "Purchase" })}>＋ New purchase</Btn>
          : tab === "Sales" ? <Btn small onClick={() => setBilling({ kind: "Sale" })}>＋ New sale</Btn>
          : <Btn small onClick={() => setPaying({})}>＋ Record payment</Btn>
        }>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
          {tab === "Parties" && <Filter<"All" | PartyType> options={["All", ...TYPES]} value={type} onChange={setType}
            counts={{ All: parties.length, Dealer: parties.filter((p) => p.type === "Dealer").length, Vendor: parties.filter((p) => p.type === "Vendor").length, Supplier: parties.filter((p) => p.type === "Supplier").length }} />}
          <div style={{ flex: 1, minWidth: 220 }}><SearchBox value={q} onChange={setQ} placeholder={tab === "Parties" ? "Search name, phone, city, GSTIN…" : "Search party, bill or ref…"} /></div>
        </div>

        {tab === "Parties" && <Table<Party> rows={shownParties} rowKey={(p) => p.id} empty="No parties yet. Add your vendors and suppliers — dealers appear here automatically."
          cols={[
            { key: "name", head: "Party", render: (p) => <span><strong>{p.name}</strong><br /><small style={muted}>{p.code}{p.contact && ` · ${p.contact}`}{!p.active && " · Inactive"}</small></span> },
            { key: "type", head: "Type", render: (p) => <Badge tone={TYPE_TONE[p.type]}>{p.type}</Badge> },
            { key: "phone", head: "Phone", render: (p) => p.phone ? <a href={`tel:${p.phone}`}>{p.phone}</a> : "—" },
            { key: "city", head: "City", render: (p) => p.city || "—" },
            { key: "gst", head: "GSTIN", render: (p) => p.gstin || "—" },
            { key: "bal", head: "Balance", align: "right", render: (p) => <Balance value={balances.get(p.id) ?? 0} /> },
            { key: "act", head: "", align: "right", render: (p) => <span style={{ display: "inline-flex", gap: 6 }}><Btn small kind="ghost" onClick={() => setLedger(p.id)}>Ledger</Btn><Btn small kind="ghost" onClick={() => setEditing(p)}>Edit</Btn></span> },
          ]} />}

        {(tab === "Purchases" || tab === "Sales") && <Table<Bill> rows={billRows(tab === "Sales" ? "Sale" : "Purchase")} rowKey={(b) => b.id}
          empty={tab === "Sales" ? "No sales yet. Record what you sell to dealers — stock goes down automatically." : "No purchases yet. Record what you buy from vendors and suppliers — stock goes up automatically."}
          cols={[
            { key: "ref", head: "Ref", render: (b) => <button onClick={() => setViewBill(b.id)} style={{ background: "none", border: 0, padding: 0, color: "var(--blue)", fontWeight: 700, cursor: "pointer" }}>{b.ref}</button> },
            { key: "date", head: "Date", render: (b) => fmtDay(b.bill_date) },
            { key: "party", head: "Party", render: (b) => partyCell(b.party_id) },
            { key: "no", head: "Bill no.", render: (b) => b.bill_no || "—" },
            { key: "items", head: "Items", render: (b) => `${b.items.length} · ${b.items.reduce((n, l) => n + l.qty, 0)} pcs` },
            { key: "total", head: "Total", align: "right", render: (b) => <strong style={{ textDecoration: b.status === "Cancelled" ? "line-through" : undefined }}>{inr(b.total)}</strong> },
            { key: "status", head: "Status", render: (b) => <Badge tone={b.status === "Posted" ? "green" : "grey"}>{b.status}</Badge> },
          ]} />}

        {tab === "Payments" && <Table<Payment> rows={payRows} rowKey={(x) => x.id} empty="No payments yet."
          cols={[
            { key: "date", head: "Date", render: (x) => fmtDay(x.paid_on) },
            { key: "party", head: "Party", render: (x) => partyCell(x.party_id) },
            { key: "kind", head: "Type", render: (x) => <Badge tone={x.kind === "Received" ? "green" : "red"}>{x.kind === "Received" ? "Received from party" : "Paid to party"}</Badge> },
            { key: "mode", head: "Mode", render: (x) => `${x.mode}${x.reference ? ` · ${x.reference}` : ""}` },
            { key: "amt", head: "Amount", align: "right", render: (x) => <strong>{inr(x.amount)}</strong> },
            { key: "act", head: "", align: "right", render: (x) => <Btn small kind="danger" onClick={async () => {
              if (!confirm(`Delete this ${inr(x.amount)} payment? The party's balance changes back.`)) return;
              const { error } = await supabaseFor("admin").from("party_payments").delete().eq("id", x.id);
              if (error) notify(friendly(error), true); else done("Payment deleted");
            }}>Delete</Btn> },
          ]} />}
      </Panel>

      {editing && <PartyModal party={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={(m) => { setEditing(null); done(m); }} notify={notify} />}
      {ledger && byId.get(ledger) && <LedgerModal party={byId.get(ledger)!} bills={bills} payments={payments} onClose={() => setLedger(null)}
        onBill={(kind) => setBilling({ kind, party: ledger })} onPay={(kind) => setPaying({ party: ledger, kind })} onView={setViewBill} />}
      {billing && <BillModal kind={billing.kind} partyId={billing.party} parties={parties} onClose={() => setBilling(null)} onSaved={(m) => { setBilling(null); done(m); }} notify={notify} />}
      {viewBill && bills.find((b) => b.id === viewBill) && <BillView bill={bills.find((b) => b.id === viewBill)!} party={byId.get(bills.find((b) => b.id === viewBill)!.party_id)}
        onClose={() => setViewBill(null)} onCancelled={(m) => { setViewBill(null); done(m); }} notify={notify} />}
      {paying && <PaymentModal parties={parties} partyId={paying.party} kind={paying.kind} balances={balances} onClose={() => setPaying(null)} onSaved={(m) => { setPaying(null); done(m); }} notify={notify} />}
    </div>
  );
}

/* ─────── Add / edit party ─────── */

function PartyModal({ party, onClose, onSaved, notify }: { party: Party | null; onClose: () => void; onSaved: (msg: string) => void; notify: (m: string, bad?: boolean) => void }) {
  const [f, setF] = useState({
    type: party?.type ?? ("Supplier" as PartyType), name: party?.name ?? "", contact: party?.contact ?? "", phone: party?.phone ?? "", email: party?.email ?? "",
    gstin: party?.gstin ?? "", address: party?.address ?? "", city: party?.city ?? "", state: party?.state ?? "", notes: party?.notes ?? "",
    opening: String(Math.abs(party?.opening_balance ?? 0) || ""), owes: (party?.opening_balance ?? 0) >= 0 ? "them" : "us", active: party?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  const linked = !!party?.dealer_id;

  const save = async () => {
    const phone = f.phone.replace(/[^\d+]/g, "");
    const gstin = f.gstin.trim().toUpperCase();
    const opening = Math.round(Number(f.opening || 0));
    if (f.name.trim().length < 2) return setErr("Enter the party name.");
    if (phone && !/^(\+91)?[6-9]\d{9}$/.test(phone)) return setErr("Enter a valid 10-digit mobile number (or leave it empty).");
    if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return setErr("That GSTIN doesn't look right — it should be 15 characters, e.g. 07ABCDE1234F1Z5.");
    if (!Number.isFinite(opening) || opening < 0) return setErr("Enter the opening balance as a positive amount.");
    const row = {
      type: linked ? "Dealer" : f.type, name: f.name.trim(), contact: f.contact.trim(), phone, email: f.email.trim(), gstin, address: f.address.trim(),
      city: f.city.trim(), state: f.state.trim(), notes: f.notes.trim(), opening_balance: f.owes === "them" ? opening : -opening, active: f.active,
    };
    setBusy(true);
    const sb = supabaseFor("admin").from("parties");
    const { error } = party ? await sb.update(row).eq("id", party.id) : await sb.insert(row);
    setBusy(false);
    if (error) { const m = /parties/.test(error.message) && /exist/.test(error.message) ? notSetUp : friendly(error); setErr(m); notify(m, true); return; }
    onSaved(party ? `${row.name} updated` : `${row.name} added`);
  };

  const field = (label: string, k: keyof typeof f, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label><span style={fieldLabel}>{label}</span><input value={f[k] as string} onChange={set(k)} style={input} {...props} /></label>
  );
  return (
    <Modal title={party ? `Edit ${party.name}` : "Add party"} onClose={onClose}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : party ? "Save changes" : "Add party"}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <label><span style={fieldLabel}>Type</span>
          <select value={linked ? "Dealer" : f.type} disabled={linked} onChange={set("type")} style={input}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        {field("Party / firm name", "name", { maxLength: 80, autoFocus: true })}
        {field("Contact person", "contact", { maxLength: 60 })}
        {field("Mobile", "phone", { inputMode: "tel", maxLength: 14 })}
        {field("Email", "email", { type: "email", maxLength: 80 })}
        {field("GSTIN", "gstin", { maxLength: 15, style: { ...input, textTransform: "uppercase" } })}
        {field("City", "city", { maxLength: 40 })}
        {field("State", "state", { maxLength: 40 })}
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Address</span><input value={f.address} onChange={set("address")} maxLength={200} style={input} /></label>
        <label><span style={fieldLabel}>Opening balance (₹)</span><input value={f.opening} onChange={set("opening")} inputMode="numeric" placeholder="0" style={input} /></label>
        <label><span style={fieldLabel}>Who owes?</span>
          <select value={f.owes} onChange={set("owes")} style={input}><option value="them">Party owes us (to receive)</option><option value="us">We owe the party (to pay)</option></select>
        </label>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Notes</span><input value={f.notes} onChange={set("notes")} maxLength={300} style={input} /></label>
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600 }}><Toggle on={f.active} onChange={(v) => setF({ ...f, active: v })} label="Party active" />{f.active ? "Active" : "Inactive — can't be billed"}</span>
      </div>
      {linked && <p style={{ ...muted, margin: "12px 0 0" }}>Linked to a dealer account in the dealer app. Changes here only affect billing details.</p>}
      {err && <p role="alert" style={{ margin: "12px 0 0", color: "var(--error-text)", fontWeight: 600, fontSize: 13 }}>{err}</p>}
    </Modal>
  );
}

/* ─────── Ledger (statement with running balance) ─────── */

function LedgerModal({ party, bills, payments, onClose, onBill, onPay, onView }: {
  party: Party; bills: Bill[]; payments: Payment[]; onClose: () => void; onBill: (k: Bill["kind"]) => void; onPay: (k: Payment["kind"]) => void; onView: (id: string) => void;
}) {
  type Row = { id: string; date: string; at: string; text: React.ReactNode; debit: number; credit: number };
  const rows: Row[] = [
    ...bills.filter((b) => b.party_id === party.id && b.status === "Posted").map((b) => ({
      id: b.id, date: b.bill_date, at: b.created_at,
      text: <button onClick={() => onView(b.id)} style={{ background: "none", border: 0, padding: 0, color: "var(--blue)", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>{b.kind} {b.ref}{b.bill_no && ` · bill ${b.bill_no}`}</button>,
      debit: b.kind === "Sale" ? b.total : 0, credit: b.kind === "Purchase" ? b.total : 0,
    })),
    ...payments.filter((x) => x.party_id === party.id).map((x) => ({
      id: x.id, date: x.paid_on, at: x.created_at, text: `${x.kind === "Received" ? "Payment received" : "Payment made"} · ${x.mode}${x.reference ? ` ${x.reference}` : ""}`,
      debit: x.kind === "Paid" ? x.amount : 0, credit: x.kind === "Received" ? x.amount : 0,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at));
  let run = party.opening_balance;
  const withBal = rows.map((r) => ({ ...r, bal: (run += r.debit - r.credit) }));

  return (
    <Modal title={`Ledger · ${party.name}`} onClose={onClose} footer={<Btn onClick={onClose}>Done</Btn>}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13 }}><Badge tone={TYPE_TONE[party.type]}>{party.type}</Badge> {party.code}{party.phone && ` · ${party.phone}`}{party.gstin && ` · GSTIN ${party.gstin}`}</span>
        <span style={{ fontSize: 15 }}>Balance: <Balance value={run} /></span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <Btn small onClick={() => onBill("Sale")}>＋ Sale</Btn>
        <Btn small kind="ghost" onClick={() => onBill("Purchase")}>＋ Purchase</Btn>
        <Btn small kind="ghost" onClick={() => onPay("Received")}>Payment received</Btn>
        <Btn small kind="ghost" onClick={() => onPay("Paid")}>Payment made</Btn>
      </div>
      <Table<{ id: string; date: string; text: React.ReactNode; debit: number; credit: number; bal: number }>
        rows={[{ id: "opening", date: "", text: "Opening balance", debit: Math.max(0, party.opening_balance), credit: Math.max(0, -party.opening_balance), bal: party.opening_balance }, ...withBal]}
        rowKey={(r) => r.id}
        cols={[
          { key: "d", head: "Date", render: (r) => r.date ? fmtDay(r.date) : "—" },
          { key: "t", head: "Particulars", render: (r) => r.text },
          { key: "dr", head: "Debit (+)", align: "right", render: (r) => r.debit ? inr(r.debit) : "" },
          { key: "cr", head: "Credit (−)", align: "right", render: (r) => r.credit ? inr(r.credit) : "" },
          { key: "b", head: "Balance", align: "right", render: (r) => <Balance value={r.bal} /> },
        ]} />
      <p style={{ ...muted, margin: "10px 0 0" }}>Debit = sales to the party and payments we made · Credit = purchases from the party and payments we received.</p>
    </Modal>
  );
}

/* ─────── New purchase / sale bill ─────── */

function BillModal({ kind, partyId, parties, onClose, onSaved, notify }: {
  kind: Bill["kind"]; partyId?: string; parties: Party[]; onClose: () => void; onSaved: (m: string) => void; notify: (m: string, bad?: boolean) => void;
}) {
  const products = PRODUCTS.filter((p) => !p.dealerId && !p.techId).sort((a, b) => Number(b.category === "spare") - Number(a.category === "spare") || a.name.localeCompare(b.name));
  const preferred: PartyType[] = kind === "Sale" ? ["Dealer"] : ["Supplier", "Vendor"];
  const choices = parties.filter((p) => p.active).sort((a, b) => Number(preferred.includes(b.type)) - Number(preferred.includes(a.type)) || a.name.localeCompare(b.name));
  const [party, setParty] = useState(partyId ?? "");
  const [billNo, setBillNo] = useState("");
  const [date, setDate] = useState(today());
  const [lines, setLines] = useState<{ product: string; qty: string; rate: string }[]>([{ product: "", qty: "1", rate: "" }]);
  const [tax, setTax] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const num = (v: string) => Math.round(Number(v || 0));
  const subtotal = lines.reduce((n, l) => n + num(l.qty) * num(l.rate), 0);
  const total = subtotal + num(tax);
  const setLine = (i: number, patch: Partial<(typeof lines)[number]>) => {
    setErr(null);
    setLines(lines.map((l, j) => {
      if (j !== i) return l;
      const next = { ...l, ...patch };
      // A sale starts at the shop price; a purchase rate is whatever the supplier billed.
      if (patch.product && kind === "Sale" && !l.rate) next.rate = String(products.find((p) => p.id === patch.product)?.price ?? "");
      return next;
    }));
  };

  const post = async () => {
    if (!party) return setErr("Choose a party.");
    const used = lines.filter((l) => l.product);
    if (!used.length) return setErr("Add at least one item.");
    if (new Set(used.map((l) => l.product)).size !== used.length) return setErr("Each product can appear once — change the quantity instead.");
    for (const l of used) {
      const name = products.find((p) => p.id === l.product)?.name ?? "item";
      if (!(num(l.qty) >= 1)) return setErr(`Enter a quantity for ${name}.`);
      if (!(num(l.rate) >= 0) || l.rate === "") return setErr(`Enter the rate for ${name}.`);
      const stock = products.find((p) => p.id === l.product)?.stock;
      if (kind === "Sale" && stock != null && stock < num(l.qty)) return setErr(`Only ${stock} of ${name} in stock.`);
    }
    if (num(tax) < 0) return setErr("Tax can't be negative.");
    setBusy(true);
    const { data, error } = await supabaseFor("admin").rpc("admin_post_bill", {
      p_kind: kind, p_party: party, p_bill_no: billNo, p_bill_date: date,
      p_items: used.map((l) => ({ product_id: l.product, qty: num(l.qty), rate: num(l.rate) })), p_tax: num(tax), p_notes: notes,
    });
    setBusy(false);
    if (error) { const m = /admin_post_bill/.test(error.message) ? notSetUp : friendly(error); setErr(m); notify(m, true); return; }
    onSaved(`${kind} ${data} saved — stock ${kind === "Sale" ? "reduced" : "added"}`);
  };

  return (
    <Modal title={kind === "Sale" ? "New sale (stock out)" : "New purchase (stock in)"} onClose={onClose}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn disabled={busy} onClick={() => void post()}>{busy ? "Saving…" : `Save ${kind.toLowerCase()} · ${inr(total)}`}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <label style={{ gridColumn: "span 2" }}><span style={fieldLabel}>{kind === "Sale" ? "Sold to" : "Bought from"}</span>
          <select value={party} onChange={(e) => { setParty(e.target.value); setErr(null); }} style={input}>
            <option value="">Choose a party…</option>
            {choices.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.type}{p.city ? ` · ${p.city}` : ""}</option>)}
          </select>
        </label>
        <label><span style={fieldLabel}>{kind === "Sale" ? "Invoice no. (optional)" : "Supplier bill no."}</span><input value={billNo} onChange={(e) => setBillNo(e.target.value)} maxLength={60} style={input} /></label>
        <label><span style={fieldLabel}>Date</span><input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} style={input} /></label>
      </div>
      {!choices.some((p) => preferred.includes(p.type)) && <p style={{ ...muted, margin: "8px 0 0" }}>No {preferred.join(" or ").toLowerCase()} yet — add one in the Parties tab.</p>}

      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,3fr) 80px 110px 100px 32px", gap: 8, ...muted, fontWeight: 700 }}><span>Item</span><span>Qty</span><span>Rate (₹)</span><span style={{ textAlign: "right" }}>Amount</span><span /></div>
        {lines.map((l, i) => {
          const p = products.find((x) => x.id === l.product);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,3fr) 80px 110px 100px 32px", gap: 8, alignItems: "center" }}>
              <span>
                <select value={l.product} onChange={(e) => setLine(i, { product: e.target.value })} style={input} aria-label={`Item ${i + 1}`}>
                  <option value="">Choose a product…</option>
                  {products.map((x) => <option key={x.id} value={x.id}>{x.name}{x.stock != null ? ` (stock ${x.stock})` : ""}</option>)}
                </select>
                {p && <small style={muted}>{p.category === "spare" ? "Spare part" : p.category === "commercial" ? "Commercial RO" : "Purifier"} · shop price {inr(p.price)}</small>}
              </span>
              <input value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value.replace(/\D/g, "") })} inputMode="numeric" aria-label={`Quantity ${i + 1}`} style={input} />
              <input value={l.rate} onChange={(e) => setLine(i, { rate: e.target.value.replace(/\D/g, "") })} inputMode="numeric" aria-label={`Rate ${i + 1}`} style={input} />
              <strong style={{ textAlign: "right", fontSize: 13 }}>{inr(num(l.qty) * num(l.rate))}</strong>
              <button onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : [{ product: "", qty: "1", rate: "" }])} aria-label={`Remove item ${i + 1}`}
                style={{ border: 0, background: "none", color: "var(--error-text)", fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
          );
        })}
        <div><Btn small kind="ghost" onClick={() => setLines([...lines, { product: "", qty: "1", rate: "" }])}>＋ Add item</Btn></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
        <label><span style={fieldLabel}>Tax / GST amount (₹)</span><input value={tax} onChange={(e) => setTax(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="0" style={input} /></label>
        <label style={{ gridColumn: "span 2" }}><span style={fieldLabel}>Notes</span><input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} style={input} /></label>
      </div>
      <p style={{ margin: "14px 0 0", textAlign: "right", fontSize: 14 }}>Subtotal {inr(subtotal)} · Tax {inr(num(tax))} · <strong style={{ fontSize: 16 }}>Total {inr(total)}</strong></p>
      <p style={{ ...muted, margin: "6px 0 0", textAlign: "right" }}>{kind === "Sale" ? "Saving takes these units off stock and adds the total to the party's balance." : "Saving adds these units to stock and adds the total to what we owe the party."}</p>
      {err && <p role="alert" style={{ margin: "10px 0 0", color: "var(--error-text)", fontWeight: 600, fontSize: 13 }}>{err}</p>}
    </Modal>
  );
}

/* ─────── View / cancel a bill ─────── */

function BillView({ bill, party, onClose, onCancelled, notify }: { bill: Bill; party?: Party; onClose: () => void; onCancelled: (m: string) => void; notify: (m: string, bad?: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    const reason = prompt(`Cancel ${bill.ref}? Stock will be ${bill.kind === "Sale" ? "added back" : "taken off again"}.\n\nReason (optional):`);
    if (reason === null) return;
    setBusy(true);
    const { error } = await supabaseFor("admin").rpc("admin_cancel_bill", { p_bill: bill.id, p_reason: reason });
    setBusy(false);
    if (error) { notify(friendly(error), true); return; }
    onCancelled(`${bill.ref} cancelled — stock ${bill.kind === "Sale" ? "added back" : "reversed"}`);
  };
  return (
    <Modal title={`${bill.kind} ${bill.ref}`} onClose={onClose}
      footer={<>{bill.status === "Posted" && <Btn kind="danger" disabled={busy} onClick={() => void cancel()}>{busy ? "Cancelling…" : "Cancel bill"}</Btn>}<Btn onClick={onClose}>Done</Btn></>}>
      <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.6 }}>
        <strong>{party?.name ?? "—"}</strong> {party && <Badge tone={TYPE_TONE[party.type]}>{party.type}</Badge>}<br />
        {fmtDay(bill.bill_date)}{bill.bill_no && ` · Bill no. ${bill.bill_no}`} · <Badge tone={bill.status === "Posted" ? "green" : "grey"}>{bill.status}</Badge>
        {bill.status === "Cancelled" && bill.cancel_reason && <><br /><span style={muted}>Reason: {bill.cancel_reason}</span></>}
      </p>
      <Table<BillLine> rows={bill.items} rowKey={(l) => l.product_id}
        cols={[
          { key: "n", head: "Item", render: (l) => l.name },
          { key: "q", head: "Qty", align: "right", render: (l) => l.qty },
          { key: "r", head: "Rate", align: "right", render: (l) => inr(l.rate) },
          { key: "a", head: "Amount", align: "right", render: (l) => inr(l.qty * l.rate) },
        ]} />
      <p style={{ margin: "12px 0 0", textAlign: "right", fontSize: 14 }}>Subtotal {inr(bill.subtotal)} · Tax {inr(bill.tax)} · <strong>Total {inr(bill.total)}</strong></p>
      {bill.notes && <p style={{ ...muted, margin: "8px 0 0" }}>Notes: {bill.notes}</p>}
    </Modal>
  );
}

/* ─────── Record a payment ─────── */

function PaymentModal({ parties, partyId, kind: initialKind, balances, onClose, onSaved, notify }: {
  parties: Party[]; partyId?: string; kind?: Payment["kind"]; balances: Map<string, number>; onClose: () => void; onSaved: (m: string) => void; notify: (m: string, bad?: boolean) => void;
}) {
  const [party, setParty] = useState(partyId ?? "");
  const bal = balances.get(party) ?? 0;
  const [kind, setKind] = useState<Payment["kind"]>(initialKind ?? "Received");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]>("UPI");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const amt = Math.round(Number(amount || 0));
    if (!party) return setErr("Choose a party.");
    if (!(amt > 0)) return setErr("Enter the amount.");
    setBusy(true);
    const { error } = await supabaseFor("admin").from("party_payments").insert({ party_id: party, kind, amount: amt, mode, reference: reference.trim(), paid_on: date, notes: notes.trim() });
    setBusy(false);
    if (error) { const m = /party_payments/.test(error.message) ? notSetUp : friendly(error); setErr(m); notify(m, true); return; }
    const name = parties.find((p) => p.id === party)?.name ?? "party";
    onSaved(kind === "Received" ? `${inr(amt)} received from ${name}` : `${inr(amt)} paid to ${name}`);
  };

  return (
    <Modal title="Record payment" onClose={onClose}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save payment"}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <label style={{ gridColumn: "1 / -1" }}><span style={fieldLabel}>Party</span>
          <select value={party} onChange={(e) => {
            setParty(e.target.value); setErr(null);
            // Default the direction from the balance: collect from those who owe us, pay those we owe.
            if (!initialKind) setKind((balances.get(e.target.value) ?? 0) < 0 ? "Paid" : "Received");
          }} style={input}>
            <option value="">Choose a party…</option>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.type}</option>)}
          </select>
          {party && <small style={muted}>Current balance: <Balance value={bal} /></small>}
        </label>
        <label><span style={fieldLabel}>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as Payment["kind"])} style={input}><option value="Received">Received from party</option><option value="Paid">Paid to party</option></select>
        </label>
        <label><span style={fieldLabel}>Amount (₹)</span><input value={amount} onChange={(e) => { setAmount(e.target.value.replace(/\D/g, "")); setErr(null); }} inputMode="numeric" style={input} autoFocus /></label>
        <label><span style={fieldLabel}>Mode</span><select value={mode} onChange={(e) => setMode(e.target.value as (typeof MODES)[number])} style={input}>{MODES.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label><span style={fieldLabel}>Date</span><input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} style={input} /></label>
        <label><span style={fieldLabel}>UTR / cheque no.</span><input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} style={input} /></label>
        <label><span style={fieldLabel}>Notes</span><input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} style={input} /></label>
      </div>
      {err && <p role="alert" style={{ margin: "12px 0 0", color: "var(--error-text)", fontWeight: 600, fontSize: 13 }}>{err}</p>}
    </Modal>
  );
}
