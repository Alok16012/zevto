"use client";

import { useRef, useState } from "react";
import { CloseIcon, EditIcon, ShareIcon, TrashIcon } from "../components/icons";
import { Footer, PageHeader, PrimaryButton, card, field, label } from "../components/ui";
import { PhotoViewer, compressImage } from "../components/PhotoPicker";
import { inr } from "../lib/data";
import { MAX_PART_PHOTOS, sharePart, type DbGalleryPart, type GalleryDraft, type GalleryStatus } from "../lib/partsGallery";

/* Technician's spare-parts gallery: list parts with photos, price and specs.
 * Every new part or edit waits for admin approval; approved parts can be shared. */

const small: React.CSSProperties = { margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 };

const STATUS_STYLE: Record<GalleryStatus, { bg: string; fg: string; label: string }> = {
  Pending: { bg: "var(--warning)", fg: "var(--warning-text)", label: "Waiting for approval" },
  Approved: { bg: "var(--success)", fg: "var(--success-text)", label: "Approved" },
  Rejected: { bg: "var(--error)", fg: "var(--error-text)", label: "Not approved" },
};

function StatusPill({ status }: { status: GalleryStatus }) {
  const s = STATUS_STYLE[status];
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap", background: s.bg, color: s.fg }}>{s.label}</span>;
}

export function PartsGalleryScreen({ parts, onSave, onDelete, onEditingChange }: {
  parts: DbGalleryPart[];
  /** The add/edit form is full-screen, so the app hides its bottom nav meanwhile. */
  onEditingChange: (editing: boolean) => void;
  onSave: (draft: GalleryDraft, existing: DbGalleryPart | null) => Promise<boolean>;
  onDelete: (p: DbGalleryPart) => Promise<boolean>;
}) {
  const [editing, setEditingState] = useState<DbGalleryPart | "new" | null>(null);
  const setEditing = (e: DbGalleryPart | "new" | null) => { setEditingState(e); onEditingChange(e !== null); };
  const [view, setView] = useState<string | null>(null);

  if (editing) {
    const existing = editing === "new" ? null : editing;
    return <PartEditor key={existing?.id ?? "new"} part={existing} onBack={() => setEditing(null)}
      onSave={async (d) => { if (await onSave(d, existing)) setEditing(null); }} />;
  }

  const count = (s: GalleryStatus) => parts.filter((p) => p.status === s).length;

  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="Spare Parts Gallery" right={
        <button onClick={() => setEditing("new")} className="press" style={{ border: "none", borderRadius: 999, background: "var(--blue)", color: "white", fontSize: 13, fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>+ Add part</button>
      } />
      <div style={{ padding: "0 16px" }}>
        <div style={{ ...card, padding: "14px 16px", display: "flex" }}>
          {([["Approved", count("Approved")], ["Waiting", count("Pending")], ["Not approved", count("Rejected")]] as const).map(([l, v], i) => (
            <div key={l} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{v}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>{l}</p>
            </div>
          ))}
        </div>
        <p style={{ ...small, fontSize: 12, margin: "10px 4px 14px" }}>
          Add the spare parts you supply with photos, price and specifications. Zavtoo approves each one — then you can share it with customers.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {parts.map((p) => (
            <div key={p.id} style={{ ...card, padding: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setView(p.photos[0])} aria-label={`View photo of ${p.name}`} style={{ width: 76, height: 76, flexShrink: 0, padding: 0, border: "none", borderRadius: 12, overflow: "hidden", background: "var(--bg-secondary)", cursor: "zoom-in" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photos[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{p.name}</p>
                    <StatusPill status={p.status} />
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 800, color: "var(--blue)" }}>{inr(p.price)}</p>
                  {p.specs && <p style={{ ...small, fontSize: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-line" }}>{p.specs}</p>}
                  {p.photos.length > 1 && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ink-mute)" }}>{p.photos.length} photos</p>}
                </div>
              </div>
              {p.status === "Rejected" && (
                <p style={{ margin: "10px 0 0", padding: "8px 10px", borderRadius: 10, background: "var(--error)", color: "var(--error-text)", fontSize: 12, fontWeight: 600 }}>
                  {p.reject_reason ? `Reason: ${p.reject_reason}` : "Not approved by Zavtoo."} Edit and save to send it again.
                </p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {p.status === "Approved" && (
                  <button onClick={() => void sharePart(p)} className="press" style={{ ...actionBtn, flex: 1, background: "var(--success-text)", color: "white" }}>
                    <ShareIcon s={15} c="white" /> Share with customer
                  </button>
                )}
                <button onClick={() => setEditing(p)} className="press" style={{ ...actionBtn, flex: p.status === "Approved" ? undefined : 1 }} aria-label={`Edit ${p.name}`}>
                  <EditIcon s={15} c="var(--blue)" />{p.status === "Approved" ? "" : " Edit"}
                </button>
                <button onClick={() => { if (confirm(`Delete "${p.name}" from your gallery?`)) void onDelete(p); }} className="press" style={{ ...actionBtn, color: "var(--red)", background: "var(--error)" }} aria-label={`Delete ${p.name}`}>
                  <TrashIcon s={15} c="var(--red)" />
                </button>
              </div>
            </div>
          ))}
          {parts.length === 0 && (
            <div style={{ ...card, padding: "28px 18px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 30 }}>🧰</p>
              <p style={{ margin: "6px 0 2px", fontSize: 14.5, fontWeight: 700 }}>No spare parts yet</p>
              <p style={{ ...small, marginBottom: 14 }}>Add your first part with a photo, price and specifications.</p>
              <PrimaryButton onClick={() => setEditing("new")}>+ Add spare part</PrimaryButton>
            </div>
          )}
        </div>
      </div>
      {view && <PhotoViewer src={view} onClose={() => setView(null)} />}
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", borderRadius: 12,
  padding: "9px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "var(--blue-tint)", color: "var(--blue)",
};

/* ───────────────────────── Add / edit ───────────────────────── */

function PartEditor({ part, onBack, onSave }: { part: DbGalleryPart | null; onBack: () => void; onSave: (d: GalleryDraft) => Promise<void> }) {
  const [name, setName] = useState(part?.name ?? "");
  const [price, setPrice] = useState(part ? String(part.price) : "");
  const [specs, setSpecs] = useState(part?.specs ?? "");
  const [photos, setPhotos] = useState<string[]>(part?.photos ?? []);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const left = MAX_PART_PHOTOS - photos.length;

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoBusy(true); setPhotoErr(null);
    try {
      const picked = Array.from(files).slice(0, left);
      const urls = await Promise.all(picked.map((f) => compressImage(f, 1080, 0.78)));
      setPhotos([...photos, ...urls]);
      if (files.length > left) setPhotoErr(`Only ${MAX_PART_PHOTOS} photos allowed — extra ones were skipped.`);
    } catch (e) {
      setPhotoErr(e instanceof Error ? e.message : "Couldn't add that photo.");
    }
    setPhotoBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const priceNum = Number(price);
  const err = !photos.length ? "Add at least one photo"
    : name.trim().length < 2 ? "Enter the part name"
    : !(priceNum > 0) ? "Enter the price"
    : null;

  const save = async () => {
    if (err) return;
    setBusy(true);
    await onSave({ name: name.trim(), price: Math.round(priceNum), specs: specs.trim(), photos });
    setBusy(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <PageHeader title={part ? "Edit spare part" : "Add spare part"} onBack={onBack} />
      <div style={{ padding: "0 16px", flex: 1 }}>
        {part?.status === "Approved" && (
          <p style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: 12, background: "var(--warning)", color: "var(--warning-text)", fontSize: 12.5, fontWeight: 600 }}>
            Saving changes sends this part for approval again. You can share it once Zavtoo approves it.
          </p>
        )}

        <span style={label}>Photos</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {photos.map((p, i) => (
            <div key={p.slice(-40) + i} style={{ position: "relative", aspectRatio: "1 / 1" }}>
              <button onClick={() => setView(p)} aria-label={`View photo ${i + 1}`} style={{ width: "100%", height: "100%", padding: 0, border: "none", borderRadius: 12, overflow: "hidden", cursor: "zoom-in", background: "var(--bg-secondary)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt={`Part photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
              <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`} style={{
                position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: "2px solid white",
                background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0,
              }}><CloseIcon s={11} c="white" w={3} /></button>
            </div>
          ))}
          {left > 0 && (
            <button onClick={() => inputRef.current?.click()} disabled={photoBusy} className="press" aria-label="Add part photo" style={{
              aspectRatio: "1 / 1", borderRadius: 12, border: "1.5px dashed var(--blue)", background: "var(--blue-tint)", cursor: photoBusy ? "wait" : "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "var(--blue)", padding: 0,
            }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{photoBusy ? "⏳" : "📷"}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700 }}>{photoBusy ? "Adding…" : photos.length ? "Add more" : "Add photo"}</span>
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
        <p style={{ margin: "6px 2px 0", fontSize: 11, color: photoErr ? "var(--error-text)" : "var(--ink-mute)", fontWeight: photoErr ? 600 : 400 }}>
          {photoErr ?? `${photos.length}/${MAX_PART_PHOTOS} photos · first photo is the cover`}
        </p>

        <label style={{ ...label, marginTop: 16 }} htmlFor="gp-name">Part name</label>
        <input id="gp-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. RO membrane 80 GPD" style={field} />

        <label style={{ ...label, marginTop: 14 }} htmlFor="gp-price">Price (₹)</label>
        <input id="gp-price" value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="e.g. 1800" style={field} />

        <label style={{ ...label, marginTop: 14 }} htmlFor="gp-specs">Specifications</label>
        <textarea id="gp-specs" value={specs} maxLength={1000} rows={5} onChange={(e) => setSpecs(e.target.value)}
          placeholder={"Brand, model, capacity, size, warranty…\ne.g. Vontron 80 GPD, 12-month warranty"} style={{ ...field, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
        <p style={{ margin: "4px 2px 0", fontSize: 11, color: "var(--ink-mute)", textAlign: "right" }}>{specs.length}/1000</p>
      </div>
      <Footer>
        {err && (name || price || photos.length > 0) ? <p style={{ margin: "0 0 8px", textAlign: "center", fontSize: 12.5, color: "var(--error-text)", fontWeight: 600 }}>{err}</p> : null}
        <PrimaryButton disabled={!!err || busy} onClick={() => void save()}>{busy ? "Saving…" : part ? "Save & send for approval" : "Send for approval"}</PrimaryButton>
      </Footer>
      {view && <PhotoViewer src={view} onClose={() => setView(null)} />}
    </div>
  );
}
