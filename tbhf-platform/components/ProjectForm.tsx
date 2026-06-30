"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { VOLUNTEER_CAUSES, PROJECT_STATUSES, statusLabel } from "@/lib/volunteerCauses";
import type { ProjectFormState } from "@/app/(app)/volunteer/actions";
import { colors, radius, shadow } from "@/lib/theme";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};

export type ProjectInitial = {
  title: string;
  cause: string;
  description: string;
  location: string;
  image_url: string;
  start_date: string;
  end_date: string;
  status: string;
};

export default function ProjectForm({
  action,
  initial,
  submitLabel = "Create project",
}: {
  action: (prev: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  initial?: ProjectInitial;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(action, null);
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("projects").upload(path, file, { upsert: false });
      if (error) throw error;
      setImageUrl(supabase.storage.from("projects").getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "24px" }}>
      <input type="hidden" name="image_url" value={imageUrl} />

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Cover image <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
        {imageUrl && (
          <div style={{ position: "relative", width: "100%", height: 200, borderRadius: radius.md, overflow: "hidden", marginBottom: 10, border: `1px solid ${colors.border}` }}>
            <Image src={imageUrl} alt="Cover preview" fill style={{ objectFit: "cover" }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Add a cover image"}
          </button>
          {imageUrl && <button type="button" onClick={() => setImageUrl("")} style={{ background: "none", border: 0, color: colors.inkFaint, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Remove</button>}
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
        </div>
        {uploadErr && <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>{uploadErr}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="title">Title</label>
          <input id="title" name="title" defaultValue={initial?.title} placeholder="e.g. Weekend literacy classes" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle} htmlFor="cause">Cause</label>
          <select id="cause" name="cause" defaultValue={initial?.cause ?? VOLUNTEER_CAUSES[0]} style={inputStyle}>
            {VOLUNTEER_CAUSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={initial?.description} rows={6} placeholder="What is the project, who does it help, and what will volunteers do?" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} required />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="location">Location <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
          <input id="location" name="location" defaultValue={initial?.location} placeholder="City / online" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="start_date">Starts</label>
          <input id="start_date" name="start_date" type="date" defaultValue={initial?.start_date} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="end_date">Ends</label>
          <input id="end_date" name="end_date" type="date" defaultValue={initial?.end_date} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle} htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={initial?.status ?? "recruiting"} style={inputStyle}>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginBottom: 16 }}>
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={pending || uploading} style={{ minWidth: 170, padding: "13px 26px", fontSize: 15, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending || uploading ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href="/events?tab=volunteering" style={{ padding: "13px 24px", fontSize: 15, fontWeight: 600, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
