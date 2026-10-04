"use client";

import { useState } from "react";
import { PhotoViewer } from "../components/PhotoPicker";
import { inr } from "../lib/data";
import { fmtDateOnly } from "../lib/db";
import type { AdminTech } from "../lib/adminData";
import type { DbGalleryPart, GalleryStatus } from "../lib/partsGallery";
import { Badge, Btn, Filter, Modal, Panel, SearchBox, Table, fieldLabel, input, muted } from "./kit";

/* Spare parts technicians add to their gallery; each one needs approval before
 * the technician can share it with customers. */

type PartFilter = "Pending" | "Approved" | "Rejected" | "All";

export function SparePartsSection({ parts, techs, onReview }: {
  parts: DbGalleryPart[]; techs: AdminTech[];
  onReview: (p: DbGalleryPart, status: Exclude<GalleryStatus, "Pending">, reason?: string) => Promise<boolean>;
}) {
  const [f, setF] = useState<PartFilter>("Pending");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<DbGalleryPart | null>(null);
  const [rejecting, setRejecting] = useState<DbGalleryPart | null>(null);
  const [view, setView] = useState<string | null>(null);
  const techOf = (id: string) => techs.find((t) => t.id === id);

  const needle = q.trim().toLowerCase();
  const rows = parts
    .filter((p) => f === "All" || p.status === f)
    .filter((p) => !needle || [p.name, p.specs, techOf(p.tech_id)?.name, techOf(p.tech_id)?.code].some((s) => s?.toLowerCase().includes(needle)));
  const counts = {
    Pending: parts.filter((p) => p.status === "Pending").length, Approved: parts.filter((p) => p.status === "Approved").length,
    Rejected: parts.filter((p) => p.status === "Rejected").length, All: parts.length,
  };

  return (
    <Panel title="Technician spare parts" pad={false} actions={<SearchBox value={q} onChange={setQ} placeholder="Search part, technician" />}>
      <div style={{ padding: "12px 16px" }}>
        <Filter<PartFilter> options={["Pending", "Approved", "Rejected", "All"]} value={f} onChange={setF} counts={counts} />
      </div>
      <Table rows={rows} rowKey={(p) => p.id} empty={f === "Pending" ? "No parts waiting for approval." : "No spare parts here."} cols={[
        { key: "ph", head: "", width: 64, render: (p) => (
          <button onClick={() => setView(p.photos[0])} aria-label={`View photo of ${p.name}`} style={{ width: 48, height: 48, padding: 0, border: "none", borderRadius: 10, overflow: "hidden", cursor: "zoom-in", background: "var(--bg-secondary)", display: "block" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.photos[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </button>
        ) },
        { key: "n", head: "Part", render: (p) => (
          <div style={{ maxWidth: 320 }}>
            <b>{p.name}</b>
            {p.specs && <div style={{ ...muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.specs.split("\n")[0]}</div>}
          </div>
        ) },
        { key: "p", head: "Price", align: "right", render: (p) => <b>{inr(p.price)}</b> },
        { key: "t", head: "Technician", render: (p) => { const t = techOf(p.tech_id); return t ? <>{t.name}<div style={muted}>{t.code}</div></> : <span style={muted}>—</span>; } },
        { key: "d", head: "Updated", render: (p) => <span style={muted}>{fmtDateOnly(p.updated_at)}</span> },
        { key: "s", head: "Status", render: (p) => <Badge tone={p.status === "Approved" ? "green" : p.status === "Rejected" ? "red" : "amber"}>{p.status}</Badge> },
        { key: "x", head: "", align: "right", render: (p) => (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <Btn small kind="ghost" onClick={() => setOpen(p)}>View</Btn>
            {p.status !== "Approved" && <Btn small onClick={() => void onReview(p, "Approved")}>Approve</Btn>}
            {p.status !== "Rejected" && <Btn small kind="danger" onClick={() => setRejecting(p)}>Reject</Btn>}
          </div>
        ) },
      ]} />

      {open && (
        <Modal title={open.name} onClose={() => setOpen(null)} footer={<>
          {open.status !== "Rejected" && <Btn kind="danger" onClick={() => { setRejecting(open); setOpen(null); }}>Reject</Btn>}
          {open.status !== "Approved" && <Btn onClick={async () => { if (await onReview(open, "Approved")) setOpen(null); }}>Approve</Btn>}
        </>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {open.photos.map((src, i) => (
              <button key={src} onClick={() => setView(src)} aria-label={`View photo ${i + 1}`} style={{ aspectRatio: "1 / 1", padding: 0, border: "none", borderRadius: 10, overflow: "hidden", cursor: "zoom-in", background: "var(--bg-secondary)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${open.name} photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 6px" }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{inr(open.price)}</span>
            <Badge tone={open.status === "Approved" ? "green" : open.status === "Rejected" ? "red" : "amber"}>{open.status}</Badge>
          </div>
          <p style={{ ...muted, margin: "0 0 10px" }}>By {techOf(open.tech_id)?.name ?? "a technician"} · updated {fmtDateOnly(open.updated_at)}</p>
          <span style={fieldLabel}>Specifications</span>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-line" }}>{open.specs || <span style={muted}>None given</span>}</p>
          {open.status === "Rejected" && open.reject_reason && <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>Rejected: {open.reject_reason}</p>}
        </Modal>
      )}
      {rejecting && <RejectModal part={rejecting} onClose={() => setRejecting(null)} onReject={async (reason) => { if (await onReview(rejecting, "Rejected", reason)) setRejecting(null); }} />}
      {view && <PhotoViewer src={view} onClose={() => setView(null)} />}
    </Panel>
  );
}

function RejectModal({ part, onClose, onReject }: { part: DbGalleryPart; onClose: () => void; onReject: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Reject · ${part.name}`} onClose={onClose} footer={<>
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn kind="danger" disabled={busy} onClick={async () => { setBusy(true); await onReject(reason.trim()); setBusy(false); }}>{busy ? "Saving…" : "Reject part"}</Btn>
    </>}>
      <label>
        <span style={fieldLabel}>Reason (the technician sees this)</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder="e.g. Photo is blurry, price is too high" style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
      </label>
    </Modal>
  );
}
