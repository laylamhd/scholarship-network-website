"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { createCommunity, type CreateCommunityState } from "@/app/(app)/community/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 14.5,
  color: colors.ink,
  background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`,
  borderRadius: radius.md,
  outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: colors.inkMuted,
  marginBottom: 7,
};

function initials(name: string) {
  const t = name.trim();
  return t ? t[0].toUpperCase() : "C";
}

export default function CommunityCreateForm() {
  const [state, formAction, pending] = useActionState<CreateCommunityState, FormData>(
    createCommunity,
    null,
  );

  const [name, setName] = useState("");
  const [accent, setAccent] = useState("#3F6B3F");
  const [coverUrl, setCoverUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState<"cover" | "logo" | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  async function upload(file: File, kind: "cover" | "logo") {
    setUploadErr(null);
    setUploading(kind);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("community-media").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("community-media").getPublicUrl(path);
      if (kind === "cover") setCoverUrl(data.publicUrl);
      else setLogoUrl(data.publicUrl);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  function onPick(kind: "cover" | "logo") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file, kind);
    };
  }

  const uploadBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7, cursor: uploading ? "default" : "pointer",
    background: "#fff", color: colors.inkMuted, border: `1.5px solid ${colors.borderStrong}`,
    borderRadius: radius.pill, padding: "8px 15px", fontSize: 13, fontWeight: 700,
    opacity: uploading ? 0.6 : 1,
  };

  return (
    <form action={formAction} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 24 }}>
      {/* hidden fields carrying uploaded URLs */}
      <input type="hidden" name="cover_url" value={coverUrl} />
      <input type="hidden" name="logo_url" value={logoUrl} />

      {/* Live preview banner */}
      <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: "hidden", marginBottom: 22 }}>
        <div style={{ position: "relative", height: 84, background: coverUrl ? colors.bg : accent }}>
          {coverUrl && <Image src={coverUrl} alt="" fill style={{ objectFit: "cover" }} />}
        </div>
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ marginTop: -34 }}>
            <div style={{ position: "relative", width: 68, height: 68, borderRadius: 16, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, border: "4px solid #fff", flexShrink: 0, overflow: "hidden" }}>
              {logoUrl ? <Image src={logoUrl} alt="" fill style={{ objectFit: "cover" }} /> : initials(name)}
            </div>
          </div>
          <div style={{ marginTop: 10, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {name.trim() || "Community name"}
            </div>
            <div style={{ fontSize: 12.5, color: colors.inkFaint }}>Preview</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="name">Community name</label>
        <input id="name" name="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class of 2025, Engineering Scholars…" style={inputStyle} required />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={4} placeholder="What is this community about?" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
      </div>

      {/* Accent colour — colour wheel */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Header bar colour</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            aria-label="Accent colour"
            name="accent"
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            style={{ width: 48, height: 48, padding: 0, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, background: "none", cursor: "pointer" }}
          />
          <span style={{ fontSize: 13.5, color: colors.inkMuted, fontFamily: "monospace" }}>{accent.toUpperCase()}</span>
          <span style={{ fontSize: 12.5, color: colors.inkFaint }}>Used when no cover image is set, and behind the logo.</span>
        </div>
      </div>

      {/* Cover image */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Cover image <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional — replaces the colour bar)</span></label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input ref={coverRef} type="file" accept="image/*" onChange={onPick("cover")} style={{ display: "none" }} />
          <button type="button" onClick={() => coverRef.current?.click()} disabled={!!uploading} style={uploadBtn}>
            <Icon name="image" size={15} /> {uploading === "cover" ? "Uploading…" : coverUrl ? "Replace cover" : "Upload cover"}
          </button>
          {coverUrl && (
            <button type="button" onClick={() => setCoverUrl("")} style={{ background: "none", border: 0, color: "#C0392B", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Remove</button>
          )}
        </div>
      </div>

      {/* Logo */}
      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>Logo / image <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional — replaces the name initial)</span></label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input ref={logoRef} type="file" accept="image/*" onChange={onPick("logo")} style={{ display: "none" }} />
          <button type="button" onClick={() => logoRef.current?.click()} disabled={!!uploading} style={uploadBtn}>
            <Icon name="image" size={15} /> {uploading === "logo" ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
          </button>
          {logoUrl && (
            <button type="button" onClick={() => setLogoUrl("")} style={{ background: "none", border: 0, color: "#C0392B", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Remove</button>
          )}
        </div>
      </div>

      {uploadErr && (
        <div style={{ fontSize: 13, color: "#C0392B", marginTop: 12 }}>{uploadErr}</div>
      )}

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, margin: "14px 0 0" }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !!uploading}
        style={{ marginTop: 22, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "12px 26px", fontSize: 14.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending || uploading ? 0.7 : 1, boxShadow: shadow.brand }}
      >
        {pending ? "Creating…" : "Create community"}
      </button>
    </form>
  );
}
