"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { EVENT_TYPES, formatMode } from "@/lib/eventTypes";
import { createEvent, type EventFormState } from "@/app/(app)/events/actions";
import { colors, radius, shadow } from "@/lib/theme";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 };
const inputStyle: React.CSSProperties = {
  width: "100%", minWidth: 0, boxSizing: "border-box", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};

export default function EventForm({ modes, defaultStart, pendingReview = false }: { modes: string[]; defaultStart?: string; pendingReview?: boolean }) {
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(createEvent, null);
  const [posterUrl, setPosterUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  const modeOptions = modes.length ? modes : ["online", "in_person"];

  async function onPickPoster(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("event-posters").upload(path, file, { upsert: false });
      if (error) throw error;
      setPosterUrl(supabase.storage.from("event-posters").getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "24px" }}>
      <input type="hidden" name="cover_image_url" value={posterUrl} />

      <div className="field-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="title">Title</label>
          <input id="title" name="title" placeholder="e.g. CV Masterclass with TBHF Alumni" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle} htmlFor="event_type">Type</label>
          <select id="event_type" name="event_type" defaultValue={EVENT_TYPES[0]} style={inputStyle}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={4} placeholder="What is this event about, who is it for, and what will attendees gain?" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
      </div>

      <div className="field-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="start_at">Starts</label>
          <input id="start_at" name="start_at" type="datetime-local" defaultValue={defaultStart} style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle} htmlFor="end_at">Ends <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
          <input id="end_at" name="end_at" type="datetime-local" style={inputStyle} />
        </div>
      </div>

      <div className="field-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="mode">Format</label>
          <select id="mode" name="mode" defaultValue={modeOptions[0]} style={inputStyle}>
            {modeOptions.map((m) => <option key={m} value={m}>{formatMode(m)}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="location">Location / venue <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
          <input id="location" name="location" placeholder="e.g. TBHF HQ, Sharjah" style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="online_link">Online joining link <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional — Zoom / Meet)</span></label>
        <input id="online_link" name="online_link" type="url" placeholder="https://…" style={inputStyle} />
      </div>

      <div className="field-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="registration_link">Registration link <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
          <input id="registration_link" name="registration_link" type="url" placeholder="https://…" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="recording_url">Recording link <span style={{ fontWeight: 400, color: colors.inkFaint }}>(after event)</span></label>
          <input id="recording_url" name="recording_url" type="url" placeholder="https://…" style={inputStyle} />
        </div>
      </div>

      {/* Poster */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Poster / cover image <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
        {posterUrl && (
          <div style={{ position: "relative", width: "100%", height: 220, borderRadius: radius.md, overflow: "hidden", marginBottom: 10, border: `1px solid ${colors.border}` }}>
            <Image src={posterUrl} alt="Poster preview" fill style={{ objectFit: "cover" }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => posterRef.current?.click()} disabled={uploading} style={{ background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            {uploading ? "Uploading…" : posterUrl ? "Replace poster" : "Add a poster"}
          </button>
          {posterUrl && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: colors.brandDeep, fontWeight: 600 }}><Icon name="check" size={14} /> Added</span>}
          <input ref={posterRef} type="file" accept="image/*" onChange={onPickPoster} style={{ display: "none" }} />
        </div>
        {uploadErr && <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>{uploadErr}</div>}
      </div>

      {pendingReview && (
        <div style={{ display: "flex", gap: 9, fontSize: 13, color: colors.inkMuted, background: colors.tintBlue, border: `1px solid ${colors.borderBlue}`, padding: "11px 14px", borderRadius: radius.md, marginBottom: 16, lineHeight: 1.5 }}>
          <span style={{ color: colors.brandDeep, flexShrink: 0, marginTop: 1 }}><Icon name="clock" size={16} /></span>
          Your event will be sent to an admin for review and will appear on the calendar once approved.
        </div>
      )}

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginBottom: 16 }}>
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={pending || uploading} style={{ minWidth: 170, padding: "13px 26px", fontSize: 15, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending || uploading ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? (pendingReview ? "Submitting…" : "Publishing…") : pendingReview ? "Submit for review" : "Publish event"}
        </button>
        <Link href="/events" style={{ padding: "13px 24px", fontSize: 15, fontWeight: 600, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
