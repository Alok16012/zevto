"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark, Wordmark } from "../components/Brand";
import { PrimaryButton, field, label } from "../components/ui";
import { PARTS, type Job } from "../lib/techData";
import { TECHNICIANS, type Review } from "../lib/data";
import { friendly, roleOf, supabaseFor, useLive, useSession } from "../lib/supabase";
import { toTechnician, useCatalog, type DbTechnician } from "../lib/catalog";
import { etaMinutes, fmtDateOnly, fmtStamp, kmBetween, toJob, toReview, type DbRequest, type DbReview } from "../lib/db";
import { uploadAvatar } from "../lib/photos";
import { partPhotoPath, uploadPartPhoto, type DbGalleryPart, type GalleryDraft } from "../lib/partsGallery";
import { JobDetailPage, JobsScreen } from "./JobScreens";
import { NewTaskPage, SentToOpsList, type NewTask, type SentTask, type TaskRoute } from "./NewTask";
import { ServiceAreaEditor } from "./ServiceArea";
import { EarningsScreen, InventoryScreen, PartnerProfileScreen, type MyStockRequest, type Payout } from "./PartnerScreens";
import { PartsGalleryScreen } from "./PartsGallery";

const SHELL_MAX_W = 430;
const sb = () => supabaseFor("technician");

type Tab = "jobs" | "inventory" | "parts" | "earnings" | "profile";

interface TechData {
  me: DbTechnician;
  dealer: { name: string; code: string } | null;
  requests: DbRequest[];
  stock: Record<string, number>;
  stockRequests: MyStockRequest[];
  payouts: Payout[];
  reviews: Review[];
  gallery: DbGalleryPart[];
}

async function loadTechData(client: ReturnType<typeof sb>, uid: string): Promise<TechData> {
  const [me, reqs, stock, stockReqs, payouts, reviews, gallery] = await Promise.all([
    client.from("technicians").select("*").eq("id", uid).maybeSingle(),
    // Row-level security returns only this technician's jobs, requests to them and tasks they raised.
    client.from("service_requests").select("*").order("visit_date", { ascending: true }).limit(500),
    client.from("tech_stock").select("part_id, qty").eq("tech_id", uid),
    client.from("stock_requests").select("*").eq("tech_id", uid).order("created_at", { ascending: false }).limit(20),
    client.from("payouts").select("*").eq("tech_id", uid).order("created_at", { ascending: false }).limit(20),
    client.from("reviews").select("*").eq("tech_id", uid).eq("status", "Published").order("created_at", { ascending: false }).limit(50),
    client.from("tech_parts").select("*").eq("tech_id", uid).order("created_at", { ascending: false }).limit(200),
  ]);
  if (me.error) throw me.error;
  if (!me.data) throw new Error("NO_TECH");
  if (reqs.error) throw reqs.error;
  const t = me.data as DbTechnician;
  let dealer: TechData["dealer"] = null;
  if (t.dealer_id) {
    const { data } = await client.from("dealers").select("name, code").eq("id", t.dealer_id).maybeSingle();
    dealer = data ?? null;
  }
  return {
    me: t, dealer,
    requests: (reqs.data ?? []) as DbRequest[],
    stock: Object.fromEntries((stock.data ?? []).map((r) => [r.part_id, r.qty])),
    stockRequests: (stockReqs.data ?? []).map((r) => ({ id: r.id, items: r.items, status: r.status, at: fmtDateOnly(r.created_at) })),
    payouts: (payouts.data ?? []).map((p) => ({ id: p.id, period: p.period, amount: p.amount, status: p.status, paidAt: p.paid_at ? fmtDateOnly(p.paid_at) : null })),
    reviews: ((reviews.data ?? []) as DbReview[]).map((r) => toReview(r)),
    gallery: (gallery.data ?? []) as DbGalleryPart[],
  };
}

/** Worksheet edits are saved shortly after the technician stops typing. */
type Worksheet = Pick<Job, "checklist" | "tdsBefore" | "tdsAfter" | "parts" | "notes">;

export default function TechnicianApp() {
  const session = useSession("technician");
  const isTech = roleOf(session ?? null) === "technician";
  const uid = isTech ? session!.user.id : null;
  useCatalog("technician", session === undefined ? undefined : uid);
  const live = useLive("technician", uid, (c) => loadTechData(c, uid!), [
    { table: "service_requests" }, { table: "technicians", filter: `id=eq.${uid}` },
    { table: "tech_stock", filter: `tech_id=eq.${uid}` }, { table: "stock_requests", filter: `tech_id=eq.${uid}` },
    { table: "tech_parts", filter: `tech_id=eq.${uid}` },
  ]);
  const data = live.data;

  const [tab, setTab] = useState<Tab>("jobs");
  const [openJob, setOpenJob] = useState<string | null>(null);
  const [newTask, setNewTask] = useState(false);
  const [partEditing, setPartEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Partial<Worksheet>>>({});
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [tab, openJob, newTask, partEditing]);
  // Customer/admin accounts can't use the partner app.
  useEffect(() => { if (session && !isTech) void sb().auth.signOut(); }, [session, isTech]);

  const flash = (msg: string, bad = false) => {
    setToast({ msg, bad });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), bad ? 4500 : 2000);
  };
  const run = async (p: PromiseLike<{ error: unknown }>, ok?: string) => {
    const { error } = await p;
    if (error) { flash(friendly(error), true); return false; }
    if (ok) flash(ok);
    live.reload();
    return true;
  };

  const me = data?.me;
  const jobs: Job[] = (data?.requests ?? [])
    .filter((r) => r.tech_id === uid)
    .map((r) => {
      const j = toJob(r, uid!);
      return drafts[r.id] ? { ...j, ...drafts[r.id] } : j;
    });
  const incoming = (data?.requests ?? []).filter((r) => r.status === "Requested" && r.preferred_tech_id === uid).map((r) => toJob(r, uid!));
  const sentToOps: SentTask[] = (data?.requests ?? []).filter((r) => r.raised_by === uid && r.tech_id !== uid).map((r) => ({
    id: r.id, ref: r.ref, type: r.type, customerName: r.customer_name, isoDate: r.visit_date, slot: r.slot, raisedAt: fmtStamp(r.created_at) ?? "",
    status: r.status === "Cancelled" ? "Cancelled" : r.status === "Completed" ? "Done" : r.tech_id ? "Assigned" : "With ops",
    assignedTo: r.tech_id ? TECHNICIANS.find((t) => t.id === r.tech_id)?.name : undefined,
  }));
  const riding = jobs.find((j) => j.status === "On the way" || j.status === "Arrived");

  /* ── Live location: shared only while a ride is on (the database refuses it otherwise). ── */
  useEffect(() => {
    if (!riding || !uid) { setSharing(null); return; }
    if (!navigator.geolocation) { setSharing("This phone can't share location — the customer won't see you on the map."); return; }
    let last = 0;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - last < 8000) return; // at most every 8 seconds
        last = now;
        void sb().from("tech_locations").upsert({
          tech_id: uid, lat: pos.coords.latitude, lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy, heading: pos.coords.heading, updated_at: new Date().toISOString(),
        }).then(({ error }) => setSharing(error ? `Location not sent: ${friendly(error)}` : null));
      },
      () => setSharing("Location is blocked — allow location for this site so the customer can track you."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [riding?.id, riding?.status, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPosition = () => new Promise<GeolocationPosition | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 10000 });
  });

  /* ── Job actions ── */
  const saveWorksheet = (id: string) => {
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      const j = jobs.find((x) => x.id === id);
      const d = drafts[id];
      if (!j || !d) return;
      const w = { ...j, ...d };
      const { error } = await sb().rpc("tech_save_worksheet", {
        p_request: id, p_checklist: w.checklist, p_tds_before: w.tdsBefore, p_tds_after: w.tdsAfter, p_parts: w.parts, p_notes: w.notes,
      });
      if (error) flash(friendly(error), true);
    }, 700);
  };
  // Re-run the save with the newest draft whenever one changes.
  useEffect(() => { Object.keys(drafts).forEach(saveWorksheet); }, [drafts]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateJob = async (id: string, patch: Partial<Job> | ((j: Job) => Partial<Job>)) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    const p = typeof patch === "function" ? patch(job) : patch;
    if (p.status === "On the way") {
      const pos = await currentPosition();
      const home = job.customer.lat != null && job.customer.lng != null ? { lat: job.customer.lat, lng: job.customer.lng } : null;
      const km = pos && home ? kmBetween({ lat: pos.coords.latitude, lng: pos.coords.longitude }, home) : null;
      await run(sb().rpc("tech_set_status", { p_request: id, p_status: "On the way", p_eta: km != null ? etaMinutes(km) : null, p_distance: km != null ? Number(km.toFixed(2)) : null }),
        "Ride started — the customer can now see your live location");
      return;
    }
    if (p.status === "Arrived") { await run(sb().rpc("tech_set_status", { p_request: id, p_status: "Arrived" }), "Marked as arrived"); return; }
    // Everything else is the worksheet (checklist, TDS, parts, notes).
    const fields: (keyof Worksheet)[] = ["checklist", "tdsBefore", "tdsAfter", "parts", "notes"];
    const w = Object.fromEntries(Object.entries(p).filter(([k]) => fields.includes(k as keyof Worksheet)));
    if (Object.keys(w).length) setDrafts((all) => ({ ...all, [id]: { ...all[id], ...w } }));
  };

  const startJob = async (id: string, code: string) => {
    const { error } = await sb().rpc("tech_start_job", { p_request: id, p_code: code });
    if (error) return friendly(error);
    flash("Job started"); live.reload();
    return null;
  };
  const complete = async (job: Job, payment: NonNullable<Job["payment"]>) => {
    // Make sure the latest worksheet is saved before closing.
    clearTimeout(saveTimers.current[job.id]);
    const d = drafts[job.id];
    if (d) {
      const w = { ...job, ...d };
      const { error } = await sb().rpc("tech_save_worksheet", {
        p_request: job.id, p_checklist: w.checklist, p_tds_before: w.tdsBefore, p_tds_after: w.tdsAfter, p_parts: w.parts, p_notes: w.notes,
      });
      if (error) { flash(friendly(error), true); return; }
    }
    if (await run(sb().rpc("tech_complete_job", { p_request: job.id, p_payment: payment }), "Job closed. Great work!")) {
      setDrafts((all) => { const n = { ...all }; delete n[job.id]; return n; });
    }
  };
  const reschedule = (job: Job, reason: string) => run(sb().rpc("tech_reschedule", { p_request: job.id, p_reason: reason }), "Job sent back to ops");
  const respond = async (job: Job, accept: boolean) => {
    await run(sb().rpc("tech_respond", { p_request: job.id, p_accept: accept }), accept ? "Job accepted" : "Declined — ops will assign someone else");
  };
  const submitTask = async (t: NewTask, route: TaskRoute) => {
    const ok = await run(sb().rpc("tech_create_task", {
      p_name: t.customer.name, p_phone: t.customer.phone, p_address: t.customer.address, p_pincode: t.customer.pincode,
      p_type: t.type, p_product: t.product, p_date: t.date, p_slot: t.slot, p_issue: t.issue, p_keep: route === "self",
    }), route === "self" ? "Task added to your jobs" : "Sent to ops — they'll schedule it");
    if (ok) setNewTask(false);
  };
  const setOnline = (v: boolean) => run(sb().from("technicians").update({ status: v ? "Online" : "Offline" }).eq("id", uid!), v ? "You're online" : "You're offline");
  const requestStock = (items: Record<string, number>) => run(sb().from("stock_requests").insert({ tech_id: uid, items }), "Stock request sent to ops");
  const savePincodes = (pins: string[]) => run(sb().from("technicians").update({ pincodes: pins }).eq("id", uid!), `Service area saved · ${pins.length} pincodes`);
  const setPhoto = async (dataUrl: string | null) => {
    try {
      const url = dataUrl ? await uploadAvatar("technician", dataUrl) : null;
      return await run(sb().from("technicians").update({ photo_url: url }).eq("id", uid!), url ? "Photo updated — customers will see it" : "Photo removed");
    } catch (e) { flash(friendly(e), true); return false; }
  };
  /** New photos arrive as data URLs; upload them, then drop any photos the edit removed. */
  const saveGalleryPart = async (d: GalleryDraft, existing: DbGalleryPart | null) => {
    try {
      const photos = await Promise.all(d.photos.map((p) => (p.startsWith("data:") ? uploadPartPhoto("technician", p) : Promise.resolve(p))));
      const row = { name: d.name, price: d.price, specs: d.specs, photos };
      const ok = await run(existing ? sb().from("tech_parts").update(row).eq("id", existing.id) : sb().from("tech_parts").insert({ ...row, tech_id: uid }),
        existing ? "Saved — sent to Zavtoo for approval again" : "Part added — waiting for Zavtoo approval");
      const gone = (existing?.photos ?? []).filter((p) => !photos.includes(p)).map(partPhotoPath).filter((p): p is string => !!p);
      if (ok && gone.length) void sb().storage.from("part-photos").remove(gone);
      return ok;
    } catch (e) { flash(friendly(e), true); return false; }
  };
  const deleteGalleryPart = async (p: DbGalleryPart) => {
    const ok = await run(sb().from("tech_parts").delete().eq("id", p.id), `${p.name} deleted`);
    const paths = p.photos.map(partPhotoPath).filter((x): x is string => !!x);
    if (ok && paths.length) void sb().storage.from("part-photos").remove(paths);
    return ok;
  };
  const logout = () => { setTab("jobs"); setOpenJob(null); setNewTask(false); void sb().auth.signOut(); };

  const shell = (children: React.ReactNode, nav = false) => (
    <div style={{ position: "fixed", inset: 0, background: "var(--app-bg)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: SHELL_MAX_W, height: "100%", position: "relative", background: "var(--app-bg)", overflow: "hidden", boxShadow: "var(--shadow-float)", display: "flex", flexDirection: "column" }}>
        {children}
        {nav && <PartnerNav active={tab} onChange={(t) => { setTab(t); setOpenJob(null); setNewTask(false); setPartEditing(false); }} newRequest={incoming.length > 0} />}
        {toast && (
          <div className="fade-up" role={toast.bad ? "alert" : "status"} style={{
            position: "absolute", left: 16, right: 16, bottom: nav ? 90 : 96, zIndex: 120,
            background: toast.bad ? "var(--error-text)" : "var(--ink)", color: "white", borderRadius: 14, padding: "12px 16px",
            fontSize: 13.5, fontWeight: 500, boxShadow: "var(--shadow-xl)", textAlign: "center",
          }}>{toast.msg}</div>
        )}
      </div>
    </div>
  );

  if (session === undefined) return shell(<Centered text="Loading…" />);
  if (!isTech) return shell(<LoginScreen />);
  if (live.error === "NO_TECH" || (live.error && /NO_TECH/.test(live.error))) {
    return shell(<Centered text="This login isn't linked to a technician profile yet. Ask your Zavtoo admin to finish setting it up." action={<button onClick={logout} style={linkBtn}>Log out</button>} />);
  }
  if (!data || !me) return shell(<Centered text={live.error ?? "Loading your jobs…"} action={live.error ? <button onClick={live.reload} style={linkBtn}>Try again</button> : undefined} />);

  const tech = toTechnician(me);
  const job = openJob ? jobs.find((j) => j.id === openJob) : undefined;

  // First login: technicians say which pincodes they work in before they see jobs.
  if (!me.pincodes?.length) {
    return shell(
      <div className="no-scroll fade-up" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 24px" }}>
        <span style={{ display: "inline-block", background: "var(--gold)", color: "var(--blue-dark)", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8 }}>STEP 2 OF 2</span>
        <h1 style={{ margin: "10px 0 4px", fontSize: 24, fontWeight: 800 }}>Where do you work?</h1>
        <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          Add your primary pincode and the nearby pincodes you can reach. Customers there will see you and can choose you.
        </p>
        <ServiceAreaEditor initial={[]} saveLabel="Save & continue" onSave={(p) => void savePincodes(p)} />
      </div>,
    );
  }

  const showNav = !job && !newTask && !(tab === "parts" && partEditing);
  return shell(
    <div ref={scrollRef} className="no-scroll" style={{
      flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain",
      paddingBottom: showNav ? "calc(76px + env(safe-area-inset-bottom))" : undefined,
    }}>
      {me.kyc === "Pending" && !job && !newTask && (
        <p style={{ margin: "12px 16px 0", padding: "10px 12px", borderRadius: 12, background: "var(--warning)", color: "var(--warning-text)", fontSize: 12.5, fontWeight: 600 }}>
          Your KYC is pending. You&apos;ll start getting jobs once Zavtoo verifies your documents.
        </p>
      )}
      {newTask ? (
        <NewTaskPage onBack={() => setNewTask(false)} onSubmit={(t, r) => void submitTask(t, r)} />
      ) : job ? (
        <JobDetailPage key={job.id} job={job} stock={data.stock} onBack={() => setOpenJob(null)} sharing={riding?.id === job.id ? sharing : null}
          onUpdate={(patch) => void updateJob(job.id, patch)}
          onStartJob={(code) => startJob(job.id, code)}
          onComplete={(p) => void complete(job, p)}
          onReschedule={(reason) => void reschedule(job, reason)} />
      ) : (
        <>
          {tab === "jobs" && (
            <JobsScreen techId={tech.id} techName={tech.name} rating={tech.rating} photoUrl={me.photo_url}
              online={me.status !== "Offline"} onToggleOnline={(v) => void setOnline(v)}
              jobs={jobs} incoming={incoming} onRespond={respond} onOpen={setOpenJob}
              onNewTask={() => setNewTask(true)} onProfile={() => setTab("profile")}
              footer={<SentToOpsList tasks={sentToOps} />} />
          )}
          {tab === "inventory" && <InventoryScreen stock={data.stock} requests={data.stockRequests} onRequest={requestStock} />}
          {tab === "parts" && <PartsGalleryScreen parts={data.gallery} onSave={saveGalleryPart} onDelete={deleteGalleryPart} onEditingChange={setPartEditing} />}
          {tab === "earnings" && <EarningsScreen jobs={jobs} payouts={data.payouts} />}
          {tab === "profile" && (
            <PartnerProfileScreen tech={tech} kyc={me.kyc} email={me.email ?? session!.user.email ?? ""} dealer={data.dealer} reviews={data.reviews}
              onLogout={logout} onPhoto={setPhoto} onSavePincodes={savePincodes} />
          )}
        </>
      )}
    </div>,
    showNav,
  );
}

const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--blue)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 8 };

function Centered({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
      <BrandMark size={44} />
      <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>{text}</p>
      {action}
    </div>
  );
}

/* ───────────────────────── Login ───────────────────────── */

function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [years, setYears] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  const problem = !signup ? (!email || !password ? "" : null)
    : name.trim().length < 2 ? "Enter your full name"
    : !/^[6-9]\d{9}$/.test(phone) ? "Enter a 10-digit mobile number"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ? "Enter a valid email"
    : password.length < 8 ? "Password must be at least 8 characters"
    : null;

  const login = async () => {
    const { data, error } = await sb().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    if (roleOf(data.session) !== "technician") {
      await sb().auth.signOut();
      throw new Error("This isn't a technician account. Customers should use the Zavtoo app instead.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (problem) { setErr(problem); return; }
    if (problem === "") return;
    setBusy(true); setErr(null);
    try {
      if (signup) {
        const res = await fetch("/api/technician-signup", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: name.trim(), phone, years: Number(years) || 0, email: email.trim().toLowerCase(), password }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Couldn't create your profile");
      }
      // Signed in, the app asks for their service area next.
      await login();
    } catch (e) { setErr(friendly(e)); }
    setBusy(false);
  };

  const switchMode = () => { setMode(signup ? "login" : "signup"); setErr(null); };
  const change = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { set(e.target.value); setErr(null); };

  return (
    <form onSubmit={submit} className="fade-up no-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: "0 20px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark size={48} />
          <Wordmark />
        </div>
        <span style={{ alignSelf: "flex-start", marginTop: 18, background: "var(--gold)", color: "var(--blue-dark)", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8, letterSpacing: "0.05em" }}>PARTNER APP{signup ? " · STEP 1 OF 2" : ""}</span>
        <h1 style={{ margin: "12px 0 4px", fontSize: 26, fontWeight: 800 }}>{signup ? "Become a Zavtoo partner" : "Technician login"}</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          {signup ? "Create your technician profile. You'll start getting jobs once Zavtoo verifies your KYC." : "Use the email and password Zavtoo gave you."}
        </p>

        <div style={{ marginTop: 26 }}>
          {signup && (
            <>
              <label style={label} htmlFor="t-name">Full name</label>
              <input id="t-name" autoComplete="name" value={name} onChange={change(setName)} style={field} />
              <label style={{ ...label, marginTop: 14 }} htmlFor="t-phone">Mobile number</label>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ ...field, width: "auto", color: "var(--ink-soft)" }}>+91</span>
                <input id="t-phone" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErr(null); }} style={{ ...field, flex: 1 }} />
              </div>
              <label style={{ ...label, marginTop: 14 }} htmlFor="t-years">Years of experience <span style={{ fontWeight: 400, color: "var(--ink-mute)" }}>(optional)</span></label>
              <input id="t-years" inputMode="numeric" value={years} onChange={(e) => { setYears(e.target.value.replace(/\D/g, "").slice(0, 2)); setErr(null); }} style={field} />
            </>
          )}
          <label style={{ ...label, marginTop: signup ? 14 : 0 }} htmlFor="t-email">Email</label>
          <input id="t-email" type="email" autoComplete="username" value={email} onChange={change(setEmail)} style={field} />
          <label style={{ ...label, marginTop: 14 }} htmlFor="t-pass">{signup ? "Create a password" : "Password"}</label>
          <input id="t-pass" type="password" autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={change(setPassword)} style={field}
            placeholder={signup ? "At least 8 characters" : undefined} />
          {err && <p role="alert" style={{ margin: "10px 2px 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p>}
        </div>
      </div>
      <div style={{ padding: "16px 0 calc(24px + env(safe-area-inset-bottom))" }}>
        <PrimaryButton disabled={problem === "" || busy}>{busy ? (signup ? "Creating profile…" : "Logging in…") : signup ? "Create Profile" : "Log In"}</PrimaryButton>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-soft)", margin: "14px 0 0" }}>
          {signup ? "Already a partner? " : "New technician? "}
          <button type="button" onClick={switchMode} style={{ ...linkBtn, padding: 0, fontSize: 13 }}>{signup ? "Log in" : "Create your partner profile"}</button>
        </p>
        {!signup && <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)", margin: "10px 0 0" }}>Forgot your password? Ask your Zavtoo admin to reset it.</p>}
      </div>
    </form>
  );
}

/* ───────────────────────── Bottom nav ───────────────────────── */

const NavIcon = ({ id, c }: { id: Tab; c: string }) => {
  const p = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "jobs": return <svg {...p}><rect x="4" y="5" width="16" height="15" rx="2.5" fill={c} stroke="none" /><path d="M9 3.5v3M15 3.5v3" /><path d="M8.5 13l2.3 2.3 4.7-4.7" stroke="white" /></svg>;
    case "inventory": return <svg {...p}><path d="M3.5 8L12 3.5 20.5 8v8.5L12 21l-8.5-4.5z" fill={c} stroke="none" /><path d="M3.8 8.2L12 12.5l8.2-4.3M12 12.5V21" stroke="white" strokeWidth={1.6} /></svg>;
    case "parts": return <svg {...p}><path d="M14.7 6.3a4 4 0 0 0 5 5L21 12.6a6 6 0 0 1-7.7.8L6 20.7a2 2 0 0 1-2.8-2.8l7.3-7.3a6 6 0 0 1 .8-7.7l1.3 1.3a4 4 0 0 0 2.1 2.1z" fill={c} stroke="none" /></svg>;
    case "earnings": return <svg {...p}><rect x="3" y="6" width="18" height="13" rx="2.5" fill={c} stroke="none" /><circle cx="12" cy="12.5" r="2.6" stroke="white" strokeWidth={1.7} /></svg>;
    default: return <svg {...p}><circle cx="12" cy="7.8" r="4.3" fill={c} stroke="none" /><path d="M3.8 20.2a8.2 8.2 0 0 1 16.4 0 1 1 0 0 1-1 1H4.8a1 1 0 0 1-1-1z" fill={c} stroke="none" /></svg>;
  }
};

const TABS: { id: Tab; label: string }[] = [
  { id: "jobs", label: "Jobs" }, { id: "inventory", label: "Inventory" }, { id: "parts", label: "Parts" }, { id: "earnings", label: "Earnings" }, { id: "profile", label: "Profile" },
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
