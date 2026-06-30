"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { RESEARCH_KINDS, researchKindBlurb } from "@/lib/researchKinds";
import type { ResearchFormState } from "@/app/(app)/research/actions";
import { colors, radius, shadow } from "@/lib/theme";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};

export type ResearchInitial = {
  title: string;
  kind: string;
  field: string;
  summary: string;
  link_url: string;
  file_url: string;
  seeking_collaborators: boolean;
};

export default function ResearchForm({
  action,
  initial,
  submitLabel = "Publish",
  pendingReview = false,
}: {
  action: (prev: ResearchFormState, formData: FormData) => Promise<ResearchFormState>;
  initial?: ResearchInitial;
  submitLabel?: string;
  pendingReview?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ResearchFormState, FormData>(action, null);
  const [kind, setKind] = useState(initial?.kind ?? RESEARCH_KINDS[0]);
  const [fileUrl, setFileUrl] = useState(initial?.file_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("research").upload(path, file, { upsert: false });
      if (error) throw error;
      setFileUrl(supabase.storage.from("research").getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "24px" }}>
      <input type="hidden" name="file_url" value={fileUrl} />

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="kind">Category</label>
        <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} style={inputStyle}>
          {RESEARCH_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <div style={{ fontSize: 12.5, color: colors.inkFaint, marginTop: 6 }}>{researchKindBlurb(kind)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="title">Title</label>
          <input id="title" name="title" defaultValue={initial?.title} placeholder="e.g. Water access in refugee settlements" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle} htmlFor="field">Field / topic <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
          <input id="field" name="field" defaultValue={initial?.field} placeholder="e.g. Public health" style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="summary">Summary / description</label>
        <textarea id="summary" name="summary" defaultValue={initial?.summary} rows={7} placeholder="Describe your research summary or opportunity…" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} required />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="link_url">External link <span style={{ fontWeight: 400, color: colors.inkFaint }}>(paper, dataset, competition…)</span></label>
        <input id="link_url" name="link_url" type="url" defaultValue={initial?.link_url} placeholder="https://…" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Attach a file <span style={{ fontWeight: 400, color: colors.inkFaint }}>(PDF, dataset… optional)</span></label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            {uploading ? "Uploading…" : fileUrl ? "Replace file" : "Choose file"}
          </button>
          {fileUrl && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: colors.brandDeep, fontWeight: 600 }}><Icon name="check" size={14} /> File attached</span>}
          <input ref={fileRef} type="file" onChange={onPickFile} style={{ display: "none" }} />
        </div>
        {uploadErr && <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>{uploadErr}</div>}
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", background: colors.bg, borderRadius: radius.md, padding: "13px 15px", marginBottom: 18, cursor: "pointer" }}>
        <input type="checkbox" name="seeking_collaborators" defaultChecked={initial?.seeking_collaborators} style={{ marginTop: 3, width: 16, height: 16, accentColor: colors.brand }} />
        <span style={{ fontSize: 13.5, color: colors.inkMuted, lineHeight: 1.5 }}>
          I’m looking for collaborators on this.
          <span style={{ color: colors.inkFaint }}> Members can flag their interest and you can reach out via messages.</span>
        </span>
      </label>

      {pendingReview && (
        <div style={{ display: "flex", gap: 9, fontSize: 13, color: colors.inkMuted, background: colors.tintBlue, border: `1px solid ${colors.borderBlue}`, padding: "11px 14px", borderRadius: radius.md, marginBottom: 16, lineHeight: 1.5 }}>
          <span style={{ color: colors.brandDeep, flexShrink: 0, marginTop: 1 }}><Icon name="clock" size={16} /></span>
          Your submission will be sent to an admin for review and will appear in the hub once approved.
        </div>
      )}

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginBottom: 16 }}>
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={pending || uploading} style={{ minWidth: 170, padding: "13px 26px", fontSize: 15, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending || uploading ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? "Saving…" : pendingReview ? "Submit for review" : submitLabel}
        </button>
        <Link href="/research" style={{ padding: "13px 24px", fontSize: 15, fontWeight: 600, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
