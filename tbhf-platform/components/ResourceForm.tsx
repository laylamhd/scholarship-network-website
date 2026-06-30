"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { createResource, type CreateResourceState } from "@/app/(app)/resources/actions";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import type { ResourceCategory } from "@/lib/resources";
import { colors, radius, shadow } from "@/lib/theme";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};

export default function ResourceForm({
  categories,
  types,
}: {
  categories: ResourceCategory[];
  types: string[];
}) {
  const [state, formAction, pending] = useActionState<CreateResourceState, FormData>(createResource, null);
  const [fileUrl, setFileUrl] = useState("");
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
      const { error } = await supabase.storage.from("resources").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("resources").getPublicUrl(path);
      setFileUrl(data.publicUrl);
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
        <label style={labelStyle} htmlFor="title">Title</label>
        <input id="title" name="title" placeholder="e.g. CV Template for Researchers" style={inputStyle} required />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="category_id">Category</label>
          <select id="category_id" name="category_id" defaultValue="" style={inputStyle}>
            <option value="">Uncategorised</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="resource_type">Type</label>
          <select id="resource_type" name="resource_type" defaultValue={types[0] ?? "pdf"} style={inputStyle}>
            {(types.length ? types : ["pdf"]).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} placeholder="What is this resource and who is it for?" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="external_link">External link</label>
        <input id="external_link" name="external_link" type="url" placeholder="https://…" style={inputStyle} />
        <div style={{ fontSize: 12.5, color: colors.inkFaint, marginTop: 6 }}>Provide a link, and/or upload a file below.</div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Upload a file</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            {uploading ? "Uploading…" : fileUrl ? "Replace file" : "Choose file"}
          </button>
          {fileUrl && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: colors.brandDeep, fontWeight: 600 }}><Icon name="check" size={14} /> File attached</span>}
          <input ref={fileRef} type="file" onChange={onPickFile} style={{ display: "none" }} />
        </div>
        {uploadErr && <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>{uploadErr}</div>}
      </div>

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginBottom: 16 }}>
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={pending || uploading} style={{ minWidth: 180, padding: "13px 26px", fontSize: 15, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending || uploading ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? "Publishing…" : "Publish resource"}
        </button>
        <Link href="/resources" style={{ padding: "13px 24px", fontSize: 15, fontWeight: 600, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
