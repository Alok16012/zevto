"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark, Wordmark } from "../components/Brand";
import { PrimaryButton, field, label } from "../components/ui";
import { INITIAL_REVIEWS, SERVICE_CATALOG, nowTime, techById } from "../lib/data";
import { setTrip, updateBridge, useBridge, type TripStatus } from "../lib/bridge";
import { INCOMING_JOB, INITIAL_JOBS, INITIAL_STOCK, TECH_ID, TODAY, type Job } from "../lib/techData";
import { JobDetailPage, JobsScreen } from "./JobScreens";
import { NewTaskPage, SentToOpsList, type NewTask, type TaskRoute } from "./NewTask";
import { EarningsScreen, InventoryScreen, PartnerProfileScreen } from "./PartnerScreens";

const SHELL_MAX_W = 430;
const SESSION_KEY = "zavtoo:partner";
/** Demo: how long after opening the app a new job request pops up. */
const INCOMING_AFTER_MS = 6000;

type Tab = "jobs" | "inventory" | "earnings" | "profile";

const readSession = () => { try { return localStorage.getItem(SESSION_KEY) === "1"; } catch { return false; } };
const writeSession = (v: boolean) => { try { if (v) localStorage.setItem(SESSION_KEY, "1"); else localStorage.removeItem(SESSION_KEY); } catch { /* storage blocked */ } };

export default function TechnicianApp() {
  const tech = techById(TECH_ID)!;
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("jobs");
  const [openJob, setOpenJob] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [incoming, setIncoming] = useState<Job | null>(null);
  const [online, setOnline] = useState(true);
  const [stock, setStock] = useState(INITIAL_STOCK);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requestSent = useRef(false);
  const [newTask, setNewTask] = useState(false);
  const bridge = useBridge();
  const taskSeq = useRef(0);

  useEffect(() => { setLoggedIn(readSession()); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [tab, openJob, newTask]);

  // Demo: dispatch sends one new request shortly after the partner goes online.
  useEffect(() => {
    if (!loggedIn || !online || requestSent.current) return;
    const t = setTimeout(() => { requestSent.current = true; setIncoming(INCOMING_JOB); }, INCOMING_AFTER_MS);
    return () => clearTimeout(t);
  }, [loggedIn, online]);

  const flash = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  // Bookings the customer app handed over (demo bridge) join the job list.
  useEffect(() => {
    const mine = bridge.jobs.filter((b) => b.techId === TECH_ID);
    if (!mine.length) return;
    setJobs((all) => {
      const fresh = mine.filter((b) => !all.some((j) => j.id === b.id));
      if (!fresh.length) return all;
      return [...fresh.map((b): Job => {
        const offering = SERVICE_CATALOG.find((o) => o.type === b.type)!;
        return {
          id: b.id, type: b.type, product: b.product, date: b.date, slot: b.slot, issue: b.issue,
          customer: { ...b.customer, distanceKm: 2.4 }, status: (bridge.trips[b.id]?.status as Job["status"]) ?? "Accepted",
          visitCharge: b.type === "AMC" ? 0 : offering.price, amc: b.type === "AMC", otp: b.otp,
          parts: [], checklist: [], tdsBefore: "", tdsAfter: "", notes: "", source: "Customer app", photos: b.photos,
        };
      }), ...all];
    });
    // Customers can still add photos after booking — refresh ours when theirs change.
    setJobs((all) => all.map((j) => {
      const b = mine.find((x) => x.id === j.id);
      return b && b.photos !== j.photos ? { ...j, photos: b.photos } : j;
    }));
  }, [bridge.jobs, bridge.trips]);

  /** Patches can be functions so quick successive taps (e.g. the checklist) build on the latest job. */
  const updateJob = (id: string, patch: Partial<Job> | ((j: Job) => Partial<Job>)) => {
    setJobs((all) => all.map((j) => (j.id === id ? { ...j, ...(typeof patch === "function" ? patch(j) : patch) } : j)));
    // Tell the customer where things stand. Location is shared from Start Travel onwards — never on accept.
    const status = typeof patch === "function" ? undefined : patch.status;
    const job = jobs.find((j) => j.id === id);
    if (job && status && (["On the way", "Arrived", "In Progress", "Completed"] as string[]).includes(status)) {
      const km = job.customer.distanceKm;
      setTrip(id, {
        techId: TECH_ID, status: status as TripStatus,
        ...(status === "On the way" ? { startedAt: Date.now(), distanceKm: km, etaMin: Math.max(5, Math.round(km * 4)) } : {}),
      });
      if (status === "On the way") flash("Live location shared with the customer");
    }
  };

  const submitTask = (t: NewTask, route: TaskRoute) => {
    taskSeq.current += 1;
    const id = `TSK${String(Date.now()).slice(-4)}${taskSeq.current}`;
    if (route === "self") {
      const offering = SERVICE_CATALOG.find((o) => o.type === t.type)!;
      setJobs((all) => [{
        id, type: t.type, product: t.product, date: t.date, slot: t.slot, issue: t.issue,
        customer: { ...t.customer, distanceKm: 1.5 }, status: "Accepted", visitCharge: offering.price, amc: false,
        otp: String(1000 + Math.floor(Math.random() * 9000)), parts: [], checklist: [], tdsBefore: "", tdsAfter: "", notes: "", source: "Self-created",
      }, ...all]);
      flash("Task added to your jobs");
    } else {
      const saved = updateBridge((b) => ({
        ...b, opsTasks: [{ id, techId: TECH_ID, techName: tech.name, ...t, createdAt: `${TODAY}, ${nowTime()}`, status: "With ops" }, ...b.opsTasks],
      }));
      flash(saved ? "Sent to ops — they'll schedule it" : "Couldn't reach ops. Try again.");
    }
    setNewTask(false);
  };
  const sentToOps = bridge.opsTasks.filter((t) => t.techId === TECH_ID);

  const accept = () => {
    if (!incoming) return;
    setJobs((all) => [{ ...incoming, status: "Accepted" }, ...all]);
    setIncoming(null);
    flash("Job accepted — added to today");
  };
  // Also called by the request's countdown, so it must keep a stable identity.
  const reject = useCallback(() => setIncoming(null), []);

  const complete = (job: Job, payment: NonNullable<Job["payment"]>) => {
    updateJob(job.id, { status: "Completed", payment, completedAt: `${TODAY}, ${nowTime()}` });
    setStock((s) => {
      const next = { ...s };
      job.parts.forEach((p) => { next[p.id] = Math.max(0, (next[p.id] ?? 0) - p.qty); });
      return next;
    });
    flash("Job closed. Great work!");
  };

  const restock = (items: Record<string, number>) => {
    setStock((s) => {
      const next = { ...s };
      Object.entries(items).forEach(([id, n]) => { next[id] = (next[id] ?? 0) + n; });
      return next;
    });
    flash("Stock request sent");
  };

  const logout = () => { writeSession(false); setLoggedIn(false); setTab("jobs"); setOpenJob(null); setNewTask(false); };

  const job = openJob ? jobs.find((j) => j.id === openJob) : undefined;
  const showNav = loggedIn && !job && !newTask;

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--app-bg)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: SHELL_MAX_W, height: "100%", position: "relative", background: "var(--app-bg)", overflow: "hidden", boxShadow: "var(--shadow-float)", display: "flex", flexDirection: "column" }}>
        {loggedIn === false && <LoginScreen onDone={() => { writeSession(true); setLoggedIn(true); }} />}

        {loggedIn && (
          <div ref={scrollRef} className="no-scroll" style={{
            flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain",
            paddingBottom: showNav ? "calc(76px + env(safe-area-inset-bottom))" : undefined,
          }}>
            {newTask ? (
              <NewTaskPage onBack={() => setNewTask(false)} onSubmit={submitTask} />
            ) : job ? (
              <JobDetailPage key={job.id} job={job} stock={stock} onBack={() => setOpenJob(null)}
                onUpdate={(patch) => updateJob(job.id, patch)}
                onComplete={(p) => complete(job, p)}
                onReschedule={(reason) => { updateJob(job.id, { status: "Rescheduled", rescheduleReason: reason }); flash("Job sent back to ops"); }} />
            ) : (
              <>
                {tab === "jobs" && (
                  <JobsScreen techId={tech.id} techName={tech.name} rating={tech.rating}
                    online={online} onToggleOnline={(v) => { setOnline(v); flash(v ? "You're online" : "You're offline"); }}
                    jobs={jobs} incoming={incoming} onAccept={accept} onReject={reject} onOpen={setOpenJob}
                    onNewTask={() => setNewTask(true)} onProfile={() => setTab("profile")}
                    footer={<SentToOpsList tasks={sentToOps} />} />
                )}
                {tab === "inventory" && <InventoryScreen stock={stock} onRequest={restock} />}
                {tab === "earnings" && <EarningsScreen jobs={jobs} />}
                {tab === "profile" && (
                  <PartnerProfileScreen tech={tech} reviews={INITIAL_REVIEWS} onLogout={logout} notify={flash}
                    jobsDone={jobs.filter((j) => j.status === "Completed").length} />
                )}
              </>
            )}
          </div>
        )}

        {showNav && <PartnerNav active={tab} onChange={setTab} newRequest={!!incoming && online} />}

        {toast && (
          <div className="fade-up" role="status" style={{
            position: "absolute", left: 16, right: 16, bottom: showNav ? 90 : 96, zIndex: 120,
            background: "var(--ink)", color: "white", borderRadius: 14, padding: "12px 16px",
            fontSize: 13.5, fontWeight: 500, boxShadow: "var(--shadow-xl)", textAlign: "center",
          }}>{toast}</div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Login ───────────────────────── */

function LoginScreen({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const send = () => {
    if (!/^[6-9]\d{9}$/.test(phone)) { setErr("Enter your 10-digit registered mobile number"); return; }
    setErr(null); setSent(true);
  };
  const verify = () => {
    if (code !== "1234") { setErr("Incorrect OTP"); return; }
    onDone();
  };

  return (
    <div className="fade-up" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 20px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark size={48} />
          <Wordmark />
        </div>
        <span style={{ alignSelf: "flex-start", marginTop: 18, background: "var(--gold)", color: "var(--blue-dark)", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8, letterSpacing: "0.05em" }}>PARTNER APP</span>
        <h1 style={{ margin: "12px 0 4px", fontSize: 26, fontWeight: 800 }}>Technician login</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>Manage your jobs, parts and earnings.</p>

        <div style={{ marginTop: 26 }}>
          <label style={label} htmlFor="t-phone">Registered mobile number</label>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ ...field, width: "auto", display: "flex", alignItems: "center", color: "var(--ink-soft)" }}>+91</span>
            <input id="t-phone" inputMode="numeric" autoComplete="tel-national" value={phone} disabled={sent}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErr(null); }} style={{ ...field, flex: 1 }} />
          </div>
          {sent && (
            <div className="fade-up" style={{ marginTop: 16 }}>
              <label style={label} htmlFor="t-otp">OTP sent to +91 {phone}</label>
              <input id="t-otp" inputMode="numeric" autoComplete="one-time-code" value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(null); }}
                style={{ ...field, fontSize: 22, fontWeight: 800, letterSpacing: "0.5em", textAlign: "center" }} />
              <p style={{ margin: "6px 2px 0", fontSize: 11.5, color: "var(--ink-mute)" }}>Demo OTP: 1234 · <button onClick={() => { setSent(false); setCode(""); }} style={{ background: "none", border: "none", padding: 0, color: "var(--blue)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>Change number</button></p>
            </div>
          )}
          {err && <p role="alert" style={{ margin: "8px 2px 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
        </div>
      </div>
      <div style={{ padding: "16px 0 calc(24px + env(safe-area-inset-bottom))" }}>
        {sent
          ? <PrimaryButton disabled={code.length !== 4} onClick={verify}>Verify &amp; Log In</PrimaryButton>
          : <PrimaryButton disabled={phone.length !== 10} onClick={send}>Send OTP</PrimaryButton>}
        <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)", margin: "12px 0 0" }}>Not a Zavtoo partner yet? Call 1800-000-000</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Bottom nav ───────────────────────── */

const NavIcon = ({ id, c }: { id: Tab; c: string }) => {
  const p = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "jobs": return <svg {...p}><rect x="4" y="5" width="16" height="15" rx="2.5" fill={c} stroke="none" /><path d="M9 3.5v3M15 3.5v3" /><path d="M8.5 13l2.3 2.3 4.7-4.7" stroke="white" /></svg>;
    case "inventory": return <svg {...p}><path d="M3.5 8L12 3.5 20.5 8v8.5L12 21l-8.5-4.5z" fill={c} stroke="none" /><path d="M3.8 8.2L12 12.5l8.2-4.3M12 12.5V21" stroke="white" strokeWidth={1.6} /></svg>;
    case "earnings": return <svg {...p}><rect x="3" y="6" width="18" height="13" rx="2.5" fill={c} stroke="none" /><circle cx="12" cy="12.5" r="2.6" stroke="white" strokeWidth={1.7} /></svg>;
    default: return <svg {...p}><circle cx="12" cy="7.8" r="4.3" fill={c} stroke="none" /><path d="M3.8 20.2a8.2 8.2 0 0 1 16.4 0 1 1 0 0 1-1 1H4.8a1 1 0 0 1-1-1z" fill={c} stroke="none" /></svg>;
  }
};

const TABS: { id: Tab; label: string }[] = [
  { id: "jobs", label: "Jobs" }, { id: "inventory", label: "Inventory" }, { id: "earnings", label: "Earnings" }, { id: "profile", label: "Profile" },
];

function PartnerNav({ active, onChange, newRequest }: { active: Tab; onChange: (t: Tab) => void; newRequest: boolean }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 14px calc(10px + env(safe-area-inset-bottom))", pointerEvents: "none", zIndex: 50 }}>
      <nav style={{
        display: "flex", background: "rgba(255,255,255,0.94)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderRadius: 999, padding: 4, boxShadow: "0 8px 24px rgba(15,23,41,0.14)", pointerEvents: "auto",
      }}>
        {TABS.map((t) => {
          const on = t.id === active;
          const color = on ? "var(--blue)" : "var(--ink)";
          return (
            <button key={t.id} aria-label={t.label} aria-current={on ? "page" : undefined} onClick={() => onChange(t.id)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative",
              background: on ? "var(--blue-tint)" : "transparent", border: "none", borderRadius: 999, cursor: "pointer", padding: "6px 0 5px",
            }}>
              <NavIcon id={t.id} c={color} />
              <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 500, color }}>{t.label}</span>
              {t.id === "jobs" && newRequest && !on && (
                <span style={{ position: "absolute", top: 5, left: "calc(50% + 7px)", width: 9, height: 9, borderRadius: "50%", background: "var(--red)", border: "1.5px solid white" }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
