"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "../lib/data";
import type { AdminCustomer, AdminTech } from "../lib/adminData";
import { fmtStamp } from "../lib/db";
import { friendly, supabaseFor, useLive } from "../lib/supabase";
import { DuplicateWarning, useDuplicates } from "../components/DuplicateWarning";
import { NewTaskModal, isoDay, type NewAdminTask } from "./Operations";
import { Badge, Btn, Filter, Modal, Panel, SearchBox, Stat, Table, fieldLabel, input, muted, type Tone } from "./kit";

/* ───────────────────────── Ad leads ─────────────────────────
 * Every ad (Facebook, Instagram, Google, YouTube, WhatsApp) links to one campaign
 * form, /lead, with UTM tags saying which platform, campaign and ad it came from.
 * Table: leads (supabase/leads-migration.sql). */

export type LeadStatus = "New" | "Contacted" | "Converted" | "Not interested" | "Junk";
export interface Lead {
  id: string; ref: string; name: string; phone: string; pincode: string; address: string; service: string; message: string;
  source: string; utm_source: string; utm_medium: string; utm_campaign: string; utm_term: string; utm_content: string;
  fbclid: string; gclid: string; landing_url: string; referrer: string;
  status: LeadStatus; notes: string; service_request_id: string | null; customer_id: string | null; submissions: number;
  created_at: string; updated_at: string;
}

const sb = () => supabaseFor("admin");
const WATCH = [{ table: "leads" }];
const STATUSES: LeadStatus[] = ["New", "Contacted", "Converted", "Not interested", "Junk"];
const STATUS_TONE: Record<LeadStatus, Tone> = { New: "red", Contacted: "amber", Converted: "green", "Not interested": "grey", Junk: "grey" };
const SOURCES = ["Facebook", "Instagram", "Google", "YouTube", "WhatsApp", "Website", "Other"];
const SOURCE_TONE: Record<string, Tone> = { Facebook: "blue", Instagram: "purple", Google: "amber", YouTube: "red", WhatsApp: "green", Website: "grey", Other: "grey" };
const RANGES = ["Today", "7 days", "30 days", "All"] as const;
type Range = (typeof RANGES)[number];
const notSetUp = "Leads aren't set up yet — run supabase/leads-migration.sql in Supabase first.";

async function loadLeads(c: SupabaseClient): Promise<Lead[] | null> {
  const { data, error } = await c.from("leads").select("*").order("created_at", { ascending: false }).limit(5000);
  if (error) { if (/leads/.test(error.message) && /exist|schema cache/i.test(error.message)) return null; throw error; }
  return data as Lead[];
}

/** Lead's "what do you need" → a service type for the job. */
const serviceOf = (s: string): ServiceType =>
  /install|new ro|buy/i.test(s) ? "Installation" : /amc/i.test(s) ? "AMC" : /filter/i.test(s) ? "Filter Change" : /clean/i.test(s) ? "Deep Cleaning" : "Repair";

const since = (r: Range) => r === "All" ? "" : r === "Today" ? isoDay() : isoDay(r === "7 days" ? -6 : -29);
const localDay = (iso: string) => new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export function LeadsSection({ customers, techs, notify }: {
  customers: AdminCustomer[]; techs: AdminTech[]; notify: (msg: string, bad?: boolean) => void;
}) {
  const live = useLive("admin", "leads", loadLeads, WATCH);
  const [tab, setTab] = useState<"Leads" | "Ad links">("Leads");
  const [range, setRange] = useState<Range>("30 days");
  const [source, setSource] = useState("All");
  const [status, setStatus] = useState<"All" | LeadStatus>("All");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);

  const all = useMemo(() => live.data ?? [], [live.data]);
  const inRange = useMemo(() => { const from = since(range); return from ? all.filter((l) => localDay(l.created_at) >= from) : all; }, [all, range]);
  const bySource = inRange.filter((l) => source === "All" || l.source === source);
  const rows = bySource.filter((l) => (status === "All" || l.status === status) &&
    (!q.trim() || `${l.ref} ${l.name} ${l.phone} ${l.pincode} ${l.utm_campaign} ${l.utm_content} ${l.utm_term}`.toLowerCase().includes(q.trim().toLowerCase())));

  // Campaign → ad set → ad, with how many became jobs.
  const campaigns = useMemo(() => {
    const m = new Map<string, { source: string; campaign: string; adset: string; ad: string; leads: number; converted: number; fresh: number }>();
    for (const l of bySource) {
      const k = [l.source, l.utm_campaign, l.utm_term, l.utm_content].join("|");
      const c = m.get(k) ?? { source: l.source, campaign: l.utm_campaign, adset: l.utm_term, ad: l.utm_content, leads: 0, converted: 0, fresh: 0 };
      c.leads++; if (l.status === "Converted") c.converted++; if (l.status === "New") c.fresh++;
      m.set(k, c);
    }
    return [...m.values()].sort((a, b) => b.leads - a.leads);
  }, [bySource]);

  if (live.error) return <Panel title="Leads"><p role="alert" style={{ margin: 0, color: "var(--error-text)" }}>{live.error}</p></Panel>;
  if (live.data === null) return <Panel title="Leads"><p style={{ margin: 0, color: "var(--warning-text)", fontWeight: 600 }}>{notSetUp}</p></Panel>;
  if (!live.data) return <p style={muted}>Loading leads…</p>;

  const open = all.find((l) => l.id === openId) ?? null;
  const converted = inRange.filter((l) => l.status === "Converted").length;
  const setLead = async (l: Lead, patch: Partial<Lead>, ok: string) => {
    const { error } = await sb().from("leads").update(patch).eq("id", l.id);
    if (error) { notify(friendly(error), true); return false; }
    notify(ok); live.reload(); return true;
  };
  const createJob = async (l: Lead, t: NewAdminTask) => {
    const { data: row, error } = await sb().rpc("admin_create_task", {
      p_customer: t.customerId, p_name: t.name, p_phone: t.phone, p_address: t.address, p_pincode: t.pincode, p_type: t.type,
      p_product: t.product, p_date: t.isoDate, p_slot: t.slot, p_issue: t.issue, p_tech: t.techId,
    });
    if (error) { notify(friendly(error), true); return; }
    const job = row as { id: string; ref: string; customer_id: string | null };
    await sb().from("leads").update({ status: "Converted", service_request_id: job.id, customer_id: job.customer_id ?? l.customer_id }).eq("id", l.id);
    notify(`${l.ref} → job #${job.ref} created`);
    setConverting(null); live.reload();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <Filter<"Leads" | "Ad links"> options={["Leads", "Ad links"]} value={tab} onChange={setTab} />
        {tab === "Leads" && <Filter<Range> options={[...RANGES]} value={range} onChange={setRange} />}
      </div>

      {tab === "Ad links" ? <AdLinkBuilder notify={notify} /> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Stat label={`Leads · ${range === "All" ? "all time" : range.toLowerCase()}`} value={String(inRange.length)} sub={`${all.filter((l) => localDay(l.created_at) === isoDay()).length} today`} />
          <Stat label="To call (New)" value={String(inRange.filter((l) => l.status === "New").length)} tone="red" />
          <Stat label="Became jobs" value={String(converted)} sub={`${pct(converted, inRange.length)} conversion`} tone="green" />
          <Stat label="Repeat form fills" value={String(inRange.filter((l) => l.submissions > 1).length)} sub="Same mobile, counted once" tone="grey" />
        </div>

        {/* Leads per platform — click one to filter everything below. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          {SOURCES.map((s) => {
            const mine = inRange.filter((l) => l.source === s);
            const on = source === s;
            return (
              <button key={s} onClick={() => setSource(on ? "All" : s)} aria-pressed={on} style={{
                textAlign: "left", background: "var(--surface)", borderRadius: 14, padding: "12px 14px", cursor: "pointer",
                border: on ? "2px solid var(--blue)" : "1px solid var(--line)",
              }}>
                <Badge tone={SOURCE_TONE[s]}>{s}</Badge>
                <p style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>{mine.length}</p>
                <p style={{ margin: 0, ...muted }}>{mine.filter((l) => l.status === "Converted").length} jobs · {pct(mine.filter((l) => l.status === "Converted").length, mine.length)}</p>
              </button>
            );
          })}
        </div>

        <Panel title={`Campaigns & ads${source === "All" ? "" : ` · ${source}`}`} pad={false}>
          <Table rows={campaigns} rowKey={(c) => [c.source, c.campaign, c.adset, c.ad].join("|")} empty="No leads in this period yet." cols={[
            { key: "s", head: "Platform", render: (c) => <Badge tone={SOURCE_TONE[c.source] ?? "grey"}>{c.source}</Badge> },
            { key: "c", head: "Campaign", render: (c) => c.campaign ? <b>{c.campaign}</b> : <span style={muted}>No campaign tag</span> },
            { key: "a", head: "Ad set / keyword", render: (c) => c.adset || <span style={muted}>—</span> },
            { key: "d", head: "Ad", render: (c) => c.ad || <span style={muted}>—</span> },
            { key: "l", head: "Leads", align: "right", render: (c) => <b>{c.leads}</b> },
            { key: "n", head: "To call", align: "right", render: (c) => c.fresh || <span style={muted}>0</span> },
            { key: "j", head: "Jobs", align: "right", render: (c) => <>{c.converted} <span style={muted}>({pct(c.converted, c.leads)})</span></> },
          ]} />
        </Panel>

        <Panel title="All leads" pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search name, mobile, campaign, ad" />}>
          <div style={{ padding: "12px 16px" }}>
            <Filter<"All" | LeadStatus> options={["All", ...STATUSES]} value={status} onChange={setStatus}
              counts={Object.fromEntries((["All", ...STATUSES] as const).map((s) => [s, s === "All" ? bySource.length : bySource.filter((l) => l.status === s).length]))} />
          </div>
          <Table rows={rows} rowKey={(l) => l.id} onRowClick={(l) => setOpenId(l.id)} empty={all.length ? "No leads match." : "No leads yet. Share an ad link from the Ad links tab."} cols={[
            { key: "r", head: "Lead", render: (l) => <><b>{l.ref}</b><div style={muted}>{fmtStamp(l.created_at)}</div></> },
            { key: "n", head: "Customer", render: (l) => <>{l.name}<div style={muted}>{l.phone}{l.pincode ? ` · ${l.pincode}` : ""}</div>
              {l.submissions > 1 && <div style={{ ...muted, color: "var(--warning-text)" }}>Filled the form {l.submissions}×</div>}</> },
            { key: "w", head: "Wants", render: (l) => l.service || <span style={muted}>—</span> },
            { key: "s", head: "From", render: (l) => <><Badge tone={SOURCE_TONE[l.source] ?? "grey"}>{l.source}</Badge>
              <div style={{ ...muted, marginTop: 3, maxWidth: 220 }}>{[l.utm_campaign, l.utm_content].filter(Boolean).join(" · ") || "—"}</div></> },
            { key: "st", head: "Status", render: (l) => <Badge tone={STATUS_TONE[l.status]}>{l.status}</Badge> },
            { key: "x", head: "", align: "right", render: (l) => (
              <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <a href={`tel:${l.phone}`} style={{ textDecoration: "none" }}><Btn small kind="ghost">Call</Btn></a>
                {l.status !== "Converted" && <Btn small onClick={() => setConverting(l)}>Make job</Btn>}
              </div>
            ) },
          ]} />
        </Panel>
      </>}

      {open && <LeadModal lead={open} onClose={() => setOpenId(null)} onSet={(patch, ok) => setLead(open, patch, ok)}
        onConvert={() => { setConverting(open); setOpenId(null); }} />}
      {converting && (
        <NewTaskModal customers={customers} techs={techs} onClose={() => setConverting(null)} onCreate={(t) => createJob(converting, t)}
          initial={{ customerId: converting.customer_id ?? "", name: converting.name, phone: converting.phone, address: converting.address,
            pincode: converting.pincode, type: serviceOf(converting.service),
            issue: [converting.service, converting.message, `Lead ${converting.ref} · ${converting.source}${converting.utm_campaign ? ` · ${converting.utm_campaign}` : ""}`].filter(Boolean).join(" — ") }} />
      )}
    </div>
  );
}

function LeadModal({ lead: l, onClose, onSet, onConvert }: {
  lead: Lead; onClose: () => void; onSet: (patch: Partial<Lead>, ok: string) => Promise<boolean>; onConvert: () => void;
}) {
  const [notes, setNotes] = useState(l.notes);
  const dupes = useDuplicates("admin", l.phone, l.address, l.pincode);
  const row = (k: string, v: React.ReactNode) => <div style={{ minWidth: 0 }}><div style={muted}>{k}</div><div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{v || "—"}</div></div>;
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, fontSize: 13 } as const;
  return (
    <Modal wide title={`${l.ref} · ${l.name}`} onClose={onClose} footer={<>
      <a href={`tel:${l.phone}`} style={{ textDecoration: "none" }}><Btn kind="ghost">Call {l.phone}</Btn></a>
      <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}><Btn kind="ghost">WhatsApp</Btn></a>
      {l.status !== "Converted" && <Btn onClick={onConvert}>Make service job</Btn>}
      <Btn kind="ghost" onClick={onClose}>Close</Btn>
    </>}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {STATUSES.filter((s) => s !== "Converted" || l.status === "Converted").map((s) => (
          <button key={s} onClick={() => s !== l.status && void onSet({ status: s }, `${l.ref} marked ${s.toLowerCase()}`)} aria-pressed={l.status === s} style={{
            padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            border: l.status === s ? "1.5px solid var(--blue)" : "1px solid var(--line)", background: l.status === s ? "var(--blue-tint, #e6f6f9)" : "var(--surface)",
            color: l.status === s ? "var(--blue)" : "var(--ink-soft)",
          }}>{s}</button>
        ))}
      </div>
      <DuplicateWarning hits={dupes} />

      <p style={{ ...fieldLabel, margin: "16px 0 8px" }}>Customer</p>
      <div style={grid}>
        {row("Name", l.name)}{row("Mobile", l.phone)}{row("Wants", l.service)}{row("Pincode", l.pincode)}
        <div style={{ gridColumn: "1 / -1" }}>{row("Address", l.address)}</div>
        <div style={{ gridColumn: "1 / -1" }}>{row("Problem", l.message)}</div>
      </div>

      <p style={{ ...fieldLabel, margin: "16px 0 8px" }}>Came from</p>
      <div style={grid}>
        {row("Platform", <Badge tone={SOURCE_TONE[l.source] ?? "grey"}>{l.source}</Badge>)}
        {row("Campaign", l.utm_campaign)}{row("Ad set / keyword", l.utm_term)}{row("Ad", l.utm_content)}
        {row("utm_source / medium", [l.utm_source, l.utm_medium].filter(Boolean).join(" / "))}
        {row("Ad click id", l.fbclid ? "Facebook (fbclid)" : l.gclid ? "Google (gclid)" : "")}
        {row("First filled", fmtStamp(l.created_at))}{row("Times filled", String(l.submissions))}
      </div>

      <p style={{ ...fieldLabel, margin: "16px 0 8px" }}>Call notes</p>
      <div style={{ display: "flex", gap: 8 }}>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="e.g. Called, wants visit on Sunday" style={{ ...input, flex: 1, resize: "vertical", fontFamily: "inherit" }} />
        <Btn disabled={notes === l.notes} onClick={() => void onSet({ notes, ...(l.status === "New" ? { status: "Contacted" } : {}) }, "Notes saved")}>Save</Btn>
      </div>
    </Modal>
  );
}

/* ───────────────────────── Ad link builder ───────────────────────── */

const PLATFORMS = [
  { id: "facebook", label: "Facebook / Instagram (Meta ads)", medium: "paid" },
  { id: "google", label: "Google Ads", medium: "cpc" },
  { id: "youtube", label: "YouTube", medium: "video" },
  { id: "whatsapp", label: "WhatsApp broadcast / status", medium: "social" },
  { id: "instagram", label: "Instagram bio / story (organic)", medium: "social" },
  { id: "website", label: "Website / QR / flyer", medium: "offline" },
] as const;
/** Meta fills these in for every ad automatically — {{site_source_name}} is fb / ig / msg / an. */
const META_AUTO = "utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}";
const GOOGLE_AUTO = "{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&utm_content={creative}";

function AdLinkBuilder({ notify }: { notify: (msg: string, bad?: boolean) => void }) {
  const base = typeof window === "undefined" ? "https://zavtoo.in/lead" : `${window.location.origin}/lead`;
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("facebook");
  const [campaign, setCampaign] = useState("");
  const [adset, setAdset] = useState("");
  const [ad, setAd] = useState("");
  const p = PLATFORMS.find((x) => x.id === platform)!;
  const params = new URLSearchParams({ utm_source: platform, utm_medium: p.medium });
  if (campaign.trim()) params.set("utm_campaign", campaign.trim());
  if (adset.trim()) params.set("utm_term", adset.trim());
  if (ad.trim()) params.set("utm_content", ad.trim());
  const link = `${base}?${params.toString()}`;
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); notify("Copied"); } catch { notify("Couldn't copy — select the text and copy it", true); }
  };
  const box: React.CSSProperties = { ...input, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12.5, wordBreak: "break-all", whiteSpace: "pre-wrap", background: "var(--bg-secondary)" };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel title="Make an ad link">
        <p style={{ ...muted, margin: "0 0 12px" }}>Every ad opens the same campaign form. The link tells us the platform, campaign and ad, so each lead shows where it came from.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <label><span style={fieldLabel}>Where will the ad run?</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as typeof platform)} style={input}>
              {PLATFORMS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select></label>
          <label><span style={fieldLabel}>Campaign name</span><input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. Diwali RO Service" maxLength={100} style={input} /></label>
          <label><span style={fieldLabel}>Ad set / audience (optional)</span><input value={adset} onChange={(e) => setAdset(e.target.value)} placeholder="e.g. West Delhi 25-55" maxLength={100} style={input} /></label>
          <label><span style={fieldLabel}>Ad name (optional)</span><input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="e.g. Video 1 – salty water" maxLength={100} style={input} /></label>
        </div>
        <p style={{ ...fieldLabel, margin: "14px 0 6px" }}>Your link</p>
        <div style={box}>{link}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <Btn onClick={() => void copy(link)}>Copy link</Btn>
          <a href={link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}><Btn kind="ghost">Open form</Btn></a>
        </div>
      </Panel>

      <Panel title="Set it once in Meta Ads (recommended)">
        <p style={{ ...muted, margin: "0 0 10px" }}>
          In Ads Manager → your ad → <b>Destination / Website URL</b>, paste <b>{base}</b>. Then under <b>Tracking → URL parameters</b> paste the line below.
          Meta fills in the campaign, ad set and ad names by itself, and tells Facebook and Instagram apart — no need to make a link per ad.
        </p>
        <div style={box}>{META_AUTO}</div>
        <div style={{ marginTop: 10 }}><Btn kind="ghost" onClick={() => void copy(META_AUTO)}>Copy URL parameters</Btn></div>
      </Panel>

      <Panel title="Google Ads">
        <p style={{ ...muted, margin: "0 0 10px" }}>
          Final URL: <b>{base}</b>. In campaign settings → <b>Campaign URL options → Tracking template</b>, paste the line below. Google shows the campaign as its ID number here; to see the name instead, make a link above for each campaign and use it as that campaign&apos;s Final URL. Keep auto-tagging on — leads with a Google click id count as Google even without tags.
        </p>
        <div style={box}>{GOOGLE_AUTO}</div>
        <div style={{ marginTop: 10 }}><Btn kind="ghost" onClick={() => void copy(GOOGLE_AUTO)}>Copy tracking template</Btn></div>
      </Panel>
    </div>
  );
}
