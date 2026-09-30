"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ChevronRight, ClockIcon, MinusIcon, PhoneIcon, PinIcon, PlusIcon } from "../components/icons";
import { Avatar, BottomSheet, Footer, PageHeader, PrimaryButton, Tabs, Toggle, card, field, label, sectionTitle } from "../components/ui";
import { SERVICE_ICON } from "../components/ServicesHub";
import TechAvatar from "../components/TechAvatar";
import { inr } from "../lib/data";
import {
  CHECKLIST, JOB_FLOW, PARTS, TODAY, customerBill, jobPayout, partById, partsTotal,
  type Job, type JobStatus,
} from "../lib/techData";

const small: React.CSSProperties = { margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 };

const TONE: Record<JobStatus, { bg: string; fg: string }> = {
  New: { bg: "var(--gold-tint)", fg: "var(--gold-dark)" },
  Accepted: { bg: "var(--purple-tint)", fg: "var(--purple)" },
  "On the way": { bg: "var(--info-bg)", fg: "var(--info-text)" },
  Arrived: { bg: "var(--teal-bg)", fg: "var(--teal-text)" },
  "In Progress": { bg: "var(--info-bg)", fg: "var(--info-text)" },
  Completed: { bg: "var(--success)", fg: "var(--success-text)" },
  Rejected: { bg: "var(--error)", fg: "var(--error-text)" },
  Rescheduled: { bg: "var(--warning)", fg: "var(--warning-text)" },
};

export function JobStatusPill({ status }: { status: JobStatus }) {
  const t = TONE[status];
  return <span style={{ background: t.bg, color: t.fg, fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{status}</span>;
}

const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/* ───────────────────────── Jobs tab ───────────────────────── */

type JobTab = "today" | "upcoming" | "done";

export function JobsScreen({ techId, techName, rating, online, onToggleOnline, jobs, incoming, onAccept, onReject, onOpen, onNewTask, onProfile, footer }: {
  techId: string; techName: string; rating: number; online: boolean; onToggleOnline: (v: boolean) => void;
  jobs: Job[]; incoming: Job | null; onAccept: () => void; onReject: () => void; onOpen: (id: string) => void;
  onNewTask: () => void; onProfile: () => void; footer?: React.ReactNode;
}) {
  const [tab, setTab] = useState<JobTab>("today");
  const active = (j: Job) => j.status !== "Completed" && j.status !== "Rejected" && j.status !== "Rescheduled";
  const rows = jobs.filter((j) =>
    tab === "today" ? j.date === TODAY && active(j) : tab === "upcoming" ? j.date !== TODAY && active(j) : !active(j));
  const doneToday = jobs.filter((j) => j.status === "Completed" && j.date === TODAY);
  const earnedToday = doneToday.reduce((s, j) => s + jobPayout(j), 0);
  const current = jobs.find((j) => ["On the way", "Arrived", "In Progress"].includes(j.status));

  return (
    <div style={{ paddingBottom: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 12px" }}>
        <button onClick={onProfile} aria-label="Open your profile" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", borderRadius: "50%" }}>
          <TechAvatar id={techId} name={techName} size={46} ring />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>Good day,</p>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{techName}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: online ? "var(--success-text)" : "var(--ink-mute)" }}>{online ? "ONLINE" : "OFFLINE"}</span>
          <Toggle on={online} onChange={onToggleOnline} label="Go online" />
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Today strip */}
        <div style={{
          borderRadius: 20, padding: 16, color: "white", display: "flex",
          background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", boxShadow: "0 10px 28px rgba(11,92,255,0.28)",
        }}>
          {[[String(jobs.filter((j) => j.date === TODAY && j.status !== "Rejected").length), "Jobs today"], [String(doneToday.length), "Completed"], [inr(earnedToday), "Earned today"], [`${rating}★`, "Rating"]].map(([v, l], i) => (
            <div key={l} style={{ flex: 1, textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.18)" : "none" }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: i === 2 ? "var(--gold)" : "white" }}>{v}</p>
              <p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.75)" }}>{l}</p>
            </div>
          ))}
        </div>

        {!online && (
          <div style={{ ...card, marginTop: 12, padding: 14, background: "var(--warning)", boxShadow: "none", border: "1px solid var(--warning-border)" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--warning-text)" }}>You&apos;re offline — you won&apos;t get new job requests. Your assigned jobs still show below.</p>
          </div>
        )}

        {incoming && online && <IncomingRequest job={incoming} onAccept={onAccept} onReject={onReject} />}

        {current && (
          <button onClick={() => onOpen(current.id)} className="press" style={{ ...card, width: "100%", marginTop: 12, padding: 14, border: "1.5px solid var(--blue)", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
            <span className="animate-pulse-dot" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--blue)" }}>CURRENT JOB · {current.status.toUpperCase()}</span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{current.type} · {current.customer.name}</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{current.customer.address}</span>
            </span>
            <ChevronRight s={16} c="var(--ink-mute)" />
          </button>
        )}

        <button onClick={onNewTask} className="press" style={{
          ...card, width: "100%", marginTop: 12, padding: "12px 14px", border: "1.5px dashed var(--blue)", background: "var(--blue-tint)", boxShadow: "none",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
        }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><PlusIcon s={18} c="white" /></span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--blue-dark)" }}>Create a new task</span>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Do it yourself or send it to ops</span>
          </span>
        </button>

        <div style={{ marginTop: 16 }}>
          <Tabs<JobTab> value={tab} onChange={setTab} tabs={[{ id: "today", label: "Today" }, { id: "upcoming", label: "Upcoming" }, { id: "done", label: "History" }]} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {rows.map((j) => <JobCard key={j.id} job={j} onOpen={() => onOpen(j.id)} />)}
          {rows.length === 0 && <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, padding: "30px 0" }}>{tab === "done" ? "No finished jobs yet." : "No jobs here. Enjoy the break!"}</p>}
        </div>
        {footer}
      </div>
    </div>
  );
}

function JobCard({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const ic = SERVICE_ICON[job.type];
  return (
    <button onClick={onOpen} className="press" style={{ ...card, border: "none", padding: 14, display: "flex", gap: 12, cursor: "pointer", textAlign: "left" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: ic.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ic.Icon s={22} c={ic.fg} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
            {job.type}{job.amc && job.type !== "AMC" && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--gold-dark)" }}>AMC</span>}
            {job.source && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: job.source === "Self-created" ? "var(--teal-text)" : "var(--blue)" }}>{job.source === "Self-created" ? "MY TASK" : "APP BOOKING"}</span>}
          </span>
          <JobStatusPill status={job.status} />
        </div>
        <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 500 }}>{job.customer.name} · {job.product}</p>
        <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 4 }}>
          <ClockIcon s={12} c="var(--ink-mute)" /> {job.date === TODAY ? "Today" : job.date}, {job.slot} · {job.customer.distanceKm} km
        </p>
      </div>
    </button>
  );
}

const REQUEST_SECONDS = 60;

function IncomingRequest({ job, onAccept, onReject }: { job: Job; onAccept: () => void; onReject: () => void }) {
  const [left, setLeft] = useState(REQUEST_SECONDS);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  // Unanswered requests pass to the next technician.
  useEffect(() => { if (left <= 0) onReject(); }, [left, onReject]);

  return (
    <div className="fade-up" style={{ ...card, marginTop: 12, padding: 16, border: "2px solid var(--gold)", boxShadow: "0 10px 24px rgba(245,166,35,0.25)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gold-dark)", letterSpacing: "0.05em" }}>🔔 NEW JOB REQUEST</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: left <= 10 ? "var(--error-text)" : "var(--ink-soft)" }}>{left}s</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "var(--line)", margin: "8px 0 12px" }}>
        <div style={{ width: `${(left / REQUEST_SECONDS) * 100}%`, height: "100%", borderRadius: 2, background: "var(--gold)", transition: "width 1s linear" }} />
      </div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{job.type} · {job.product}</p>
      <p style={small}>{job.issue}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {[`📍 ${job.customer.distanceKm} km away`, `🕑 Today, ${job.slot}`, `💰 Earn ~${inr(jobPayout(job))}`].map((t) => (
          <span key={t} style={{ fontSize: 11.5, fontWeight: 600, background: "var(--bg-secondary)", padding: "5px 10px", borderRadius: 999 }}>{t}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={onReject} className="press" style={{ flex: 1, border: "1.5px solid var(--line-strong)", background: "var(--surface)", borderRadius: 14, padding: 13, fontSize: 14, fontWeight: 700, color: "var(--ink-soft)", cursor: "pointer" }}>Decline</button>
        <PrimaryButton onClick={onAccept} style={{ flex: 2 }}>Accept Job</PrimaryButton>
      </div>
    </div>
  );
}

/* ───────────────────────── Job detail ───────────────────────── */

export function JobDetailPage({ job, stock, onBack, onUpdate, onComplete, onReschedule }: {
  job: Job; stock: Record<string, number>; onBack: () => void;
  onUpdate: (patch: Partial<Job> | ((j: Job) => Partial<Job>)) => void; onComplete: (payment: NonNullable<Job["payment"]>) => void; onReschedule: (reason: string) => void;
}) {
  const [otp, setOtp] = useState("");
  const [otpErr, setOtpErr] = useState(false);
  const [sheet, setSheet] = useState<"parts" | "bill" | "reschedule" | null>(null);
  const ic = SERVICE_ICON[job.type];
  const step = JOB_FLOW.indexOf(job.status);
  const working = job.status === "In Progress";
  const done = job.status === "Completed";
  const closed = done || job.status === "Rescheduled" || job.status === "Rejected";
  const checklistDone = job.checklist.length === CHECKLIST.length;
  const canFinish = checklistDone && job.tdsAfter.trim() !== "";

  const verifyOtp = () => {
    if (otp === job.otp) onUpdate({ status: "In Progress" });
    else setOtpErr(true);
  };

  const toggleCheck = (c: string) =>
    onUpdate((j) => ({ checklist: j.checklist.includes(c) ? j.checklist.filter((x) => x !== c) : [...j.checklist, c] }));

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title={`Job #${job.id}`} onBack={onBack} right={<JobStatusPill status={job.status} />} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        {/* Summary */}
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: ic.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><ic.Icon s={24} c={ic.fg} /></div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{job.type}{job.amc && job.type !== "AMC" ? " · AMC visit" : ""}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>{job.product}</p>
            </div>
          </div>
          <p style={{ ...small, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><ClockIcon s={14} c="var(--ink-soft)" /> {job.date === TODAY ? "Today" : job.date}, {job.slot}</p>
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: "var(--bg-secondary)" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--ink-mute)" }}>CUSTOMER&apos;S ISSUE</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{job.issue}</p>
          </div>
        </div>

        {/* Progress */}
        {step >= 0 && (
          <div style={{ ...card, padding: "14px 12px", marginTop: 12, display: "flex" }}>
            {JOB_FLOW.map((s, i) => (
              <div key={s} style={{ flex: 1, textAlign: "center" }}>
                <span style={{
                  width: 24, height: 24, margin: "0 auto", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < step || done ? "var(--blue)" : i === step ? "var(--surface)" : "var(--line)",
                  border: i === step && !done ? "2.5px solid var(--blue)" : "none",
                }}>{(i < step || done) && <CheckIcon s={12} c="white" />}</span>
                <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: i === step ? 700 : 500, color: i <= step ? "var(--ink)" : "var(--ink-mute)" }}>{s}</p>
              </div>
            ))}
          </div>
        )}

        {/* Customer */}
        <h3 style={sectionTitle}>Customer</h3>
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials={job.customer.name.split(" ").map((w) => w[0]).join("").slice(0, 2)} size={42} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{job.customer.name}</p>
              <p style={{ ...small, display: "flex", alignItems: "flex-start", gap: 4 }}><PinIcon s={14} c="var(--ink-soft)" /> {job.customer.address}</p>
            </div>
          </div>
          {!closed && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <a href={`tel:${job.customer.phone}`} className="press" style={actionLink("var(--success)", "var(--success-text)")}><PhoneIcon s={16} c="var(--success-text)" /> Call</a>
              <a href={mapsUrl(job.customer.address)} target="_blank" rel="noreferrer" className="press" style={actionLink("var(--blue-tint)", "var(--blue)")}><PinIcon s={16} c="var(--blue)" /> Navigate · {job.customer.distanceKm} km</a>
            </div>
          )}
        </div>

        {job.status === "Accepted" && (
          <p style={{ margin: "10px 2px 0", fontSize: 12, color: "var(--ink-mute)" }}>🔒 Your location stays private until you tap Start Travel.</p>
        )}
        {job.status === "On the way" && (
          <div className="fade-up" style={{ ...card, marginTop: 12, padding: 12, display: "flex", alignItems: "center", gap: 10, background: "var(--info-bg)", boxShadow: "none", border: "1px solid var(--info-border)" }}>
            <span className="animate-pulse-dot" style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--info-text)", fontWeight: 600 }}>Sharing live location with {job.customer.name.split(" ")[0]} until you arrive.</p>
          </div>
        )}

        {/* Arrived → OTP */}
        {job.status === "Arrived" && (
          <div className="fade-up" style={{ ...card, padding: 16, marginTop: 12, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Enter the customer&apos;s start code</p>
            <p style={small}>The customer sees a 4-digit code in their Zavtoo app.</p>
            <input value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 4)); setOtpErr(false); }}
              inputMode="numeric" aria-label="Start code" placeholder="• • • •"
              style={{ ...field, marginTop: 12, textAlign: "center", fontSize: 24, fontWeight: 800, letterSpacing: "0.5em", ...(otpErr ? { border: "1.5px solid var(--error-text)" } : {}) }} />
            {otpErr && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>Wrong code — ask the customer to check again.</p>}
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--ink-mute)" }}>Demo code: {job.otp}</p>
          </div>
        )}

        {/* Work sheet */}
        {(working || done) && (
          <>
            <h3 style={sectionTitle}>Service checklist</h3>
            <div style={{ ...card, padding: "4px 14px" }}>
              {CHECKLIST.map((c, i) => {
                const on = job.checklist.includes(c);
                return (
                  <button key={c} disabled={done} onClick={() => toggleCheck(c)} aria-pressed={on} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 0", background: "none", border: "none", borderTop: i ? "1px solid var(--line)" : "none", cursor: done ? "default" : "pointer", textAlign: "left" }}>
                    <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: on ? "var(--blue)" : "var(--surface)", border: on ? "none" : "2px solid var(--line-strong)" }}>{on && <CheckIcon s={13} c="white" />}</span>
                    <span style={{ fontSize: 13.5, color: on ? "var(--ink)" : "var(--text-secondary)", fontWeight: on ? 600 : 500 }}>{c}</span>
                  </button>
                );
              })}
            </div>

            <h3 style={sectionTitle}>Water quality (TDS, ppm)</h3>
            <div style={{ display: "flex", gap: 10 }}>
              {(["tdsBefore", "tdsAfter"] as const).map((k) => (
                <div key={k} style={{ flex: 1 }}>
                  <label style={{ ...label, fontSize: 12.5 }} htmlFor={k}>{k === "tdsBefore" ? "Input water" : "Output water"}</label>
                  <input id={k} inputMode="numeric" disabled={done} value={job[k]} onChange={(e) => onUpdate({ [k]: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="e.g. 80" style={field} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={sectionTitle}>Parts used</h3>
              {!done && <button onClick={() => setSheet("parts")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 10 }}><PlusIcon s={14} c="var(--blue)" /> Add parts</button>}
            </div>
            <div style={{ ...card, padding: "4px 14px" }}>
              {job.parts.map((p, i) => {
                const part = partById(p.id)!;
                return (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 13.5 }}>
                    <span>{part.name} × {p.qty}</span><span style={{ fontWeight: 600 }}>{job.amc ? "Included" : inr(part.price * p.qty)}</span>
                  </div>
                );
              })}
              {job.parts.length === 0 && <p style={{ margin: 0, padding: "14px 0", fontSize: 13, color: "var(--ink-mute)", textAlign: "center" }}>No parts added</p>}
            </div>

            <label style={{ ...label, marginTop: 16 }} htmlFor="job-notes">Notes for the customer</label>
            <textarea id="job-notes" rows={3} disabled={done} value={job.notes} onChange={(e) => onUpdate({ notes: e.target.value })} maxLength={300}
              placeholder="What you found and what you fixed" style={{ ...field, resize: "none" }} />
          </>
        )}

        {/* Completed summary */}
        {done && (
          <div style={{ ...card, padding: "6px 14px", marginTop: 12 }}>
            {[
              ["Customer paid", `${inr(customerBill(job))} · ${job.payment}`],
              ["Your earning", inr(jobPayout(job))],
              ["Completed", job.completedAt ?? "—"],
              ["Customer rating", job.customerRating ? "★".repeat(job.customerRating) : "Awaiting rating"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span style={{ color: "var(--ink-soft)" }}>{k}</span><span style={{ fontWeight: 700, color: k === "Your earning" ? "var(--success-text)" : k === "Customer rating" && job.customerRating ? "var(--gold)" : "var(--ink)" }}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {job.status === "Rescheduled" && (
          <div style={{ ...card, padding: 14, marginTop: 12, background: "var(--warning)", boxShadow: "none" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--warning-text)" }}>Rescheduled · {job.rescheduleReason}. Ops will call the customer to fix a new slot.</p>
          </div>
        )}

        {!closed && (
          <button onClick={() => setSheet("reschedule")} style={{ display: "block", margin: "16px auto 8px", background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 13, fontWeight: 600 }}>
            Can&apos;t do this job? Reschedule
          </button>
        )}
        {working && !canFinish && <p style={{ margin: "0 0 8px", textAlign: "center", fontSize: 12, color: "var(--ink-mute)" }}>Tick every checklist item and add the output TDS to finish.</p>}
      </div>

      {!closed && (
        <Footer>
          {job.status === "Accepted" && <PrimaryButton onClick={() => onUpdate({ status: "On the way" })}>Start Travel</PrimaryButton>}
          {job.status === "On the way" && <PrimaryButton onClick={() => onUpdate({ status: "Arrived" })}>I&apos;ve Arrived</PrimaryButton>}
          {job.status === "Arrived" && <PrimaryButton disabled={otp.length !== 4} onClick={verifyOtp}>Verify &amp; Start Job</PrimaryButton>}
          {working && <PrimaryButton tone="gold" disabled={!canFinish} onClick={() => setSheet("bill")}>Complete Job · Collect {inr(customerBill(job))}</PrimaryButton>}
        </Footer>
      )}

      {sheet === "parts" && <PartsSheet job={job} stock={stock} onClose={() => setSheet(null)} onChange={(parts) => onUpdate({ parts })} />}
      {sheet === "bill" && <BillSheet job={job} onClose={() => setSheet(null)} onConfirm={(p) => { setSheet(null); onComplete(p); }} />}
      {sheet === "reschedule" && <RescheduleSheet onClose={() => setSheet(null)} onConfirm={(r) => { setSheet(null); onReschedule(r); }} />}
    </div>
  );
}

const actionLink = (bg: string, fg: string): React.CSSProperties => ({
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 11, borderRadius: 12,
  background: bg, color: fg, fontSize: 13, fontWeight: 600, textDecoration: "none",
});

function PartsSheet({ job, stock, onClose, onChange }: { job: Job; stock: Record<string, number>; onClose: () => void; onChange: (p: Job["parts"]) => void }) {
  const qtyOf = (id: string) => job.parts.find((p) => p.id === id)?.qty ?? 0;
  const setQty = (id: string, qty: number) => {
    const rest = job.parts.filter((p) => p.id !== id);
    onChange(qty > 0 ? [...rest, { id, qty }] : rest);
  };
  const stepBtn: React.CSSProperties = { width: 30, height: 30, border: "none", borderRadius: 9, background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

  return (
    <BottomSheet title="Parts from your van" onClose={onClose}>
      <div style={{ ...card, padding: "2px 14px" }}>
        {PARTS.map((p, i) => {
          const q = qtyOf(p.id);
          const avail = stock[p.id] ?? 0;
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{p.name}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: avail ? "var(--ink-soft)" : "var(--error-text)" }}>{inr(p.price)} · {avail ? `${avail} in van` : "Out of stock"}</p>
              </div>
              <button aria-label={`Remove ${p.name}`} disabled={!q} onClick={() => setQty(p.id, q - 1)} style={{ ...stepBtn, opacity: q ? 1 : 0.4 }}><MinusIcon s={14} c="var(--blue)" /></button>
              <span style={{ minWidth: 16, textAlign: "center", fontSize: 14, fontWeight: 700 }}>{q}</span>
              <button aria-label={`Add ${p.name}`} disabled={q >= avail} onClick={() => setQty(p.id, q + 1)} style={{ ...stepBtn, opacity: q < avail ? 1 : 0.4 }}><PlusIcon s={14} c="var(--blue)" /></button>
            </div>
          );
        })}
      </div>
      <PrimaryButton onClick={onClose} style={{ marginTop: 14 }}>Done · {job.amc ? "included in AMC" : inr(partsTotal(job))}</PrimaryButton>
    </BottomSheet>
  );
}

function BillSheet({ job, onClose, onConfirm }: { job: Job; onClose: () => void; onConfirm: (p: NonNullable<Job["payment"]>) => void }) {
  const total = customerBill(job);
  const [pay, setPay] = useState<NonNullable<Job["payment"]>>(total === 0 ? "AMC covered" : "UPI");
  const rows: [string, string][] = [
    ["Visit charge", job.visitCharge ? inr(job.visitCharge) : "FREE"],
    ["Parts", job.amc ? "Included in AMC" : inr(partsTotal(job))],
  ];
  if (job.amc && job.visitCharge) rows.push(["AMC cover", "− " + inr(job.visitCharge)]);

  return (
    <BottomSheet title="Collect payment" onClose={onClose}>
      <div style={{ ...card, padding: "4px 14px" }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 13.5, color: "var(--ink-soft)" }}><span>{k}</span><span style={{ fontWeight: 600, color: "var(--ink)" }}>{v}</span></div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px dashed var(--line-strong)", fontSize: 16, fontWeight: 800 }}>
          <span>Collect from customer</span><span>{inr(total)}</span>
        </div>
      </div>
      {total > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {(["UPI", "Cash"] as const).map((m) => (
            <button key={m} onClick={() => setPay(m)} aria-pressed={pay === m} style={{
              flex: 1, padding: 12, borderRadius: 14, cursor: "pointer", fontSize: 14, fontWeight: 700,
              background: pay === m ? "var(--blue-tint)" : "var(--surface)", color: pay === m ? "var(--blue)" : "var(--text-secondary)",
              border: pay === m ? "1.5px solid var(--blue)" : "1.5px solid var(--line)",
            }}>{m === "UPI" ? "UPI / QR" : "Cash"}</button>
          ))}
        </div>
      )}
      <p style={{ ...small, fontSize: 12, margin: "10px 4px 14px" }}>
        {total === 0 ? "Nothing to collect — this visit is covered." : pay === "UPI" ? "Show the customer the Zavtoo QR on your ID card. Confirm only after the payment succeeds." : "Cash is settled against your next weekly payout."}
        {" "}You earn <b style={{ color: "var(--success-text)" }}>{inr(jobPayout(job))}</b> for this job.
      </p>
      <PrimaryButton tone="gold" onClick={() => onConfirm(pay)}>{total === 0 ? "Close Job" : `Payment received · ${inr(total)}`}</PrimaryButton>
    </BottomSheet>
  );
}

const RESCHEDULE_REASONS = ["Customer not available", "Part not in stock", "Customer asked for another day", "Running late on previous job"];

function RescheduleSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <BottomSheet title="Reschedule job" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {RESCHEDULE_REASONS.map((r) => (
          <button key={r} onClick={() => setReason(r)} aria-pressed={reason === r} style={{
            ...card, padding: 14, textAlign: "left", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--ink)",
            border: reason === r ? "2px solid var(--blue)" : "2px solid transparent",
          }}>{r}</button>
        ))}
      </div>
      <p style={{ ...small, fontSize: 12, margin: "12px 4px" }}>Ops will call the customer and give the job a new slot.</p>
      <PrimaryButton disabled={!reason} onClick={() => onConfirm(reason)}>Confirm Reschedule</PrimaryButton>
    </BottomSheet>
  );
}
