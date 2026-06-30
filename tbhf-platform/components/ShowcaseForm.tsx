"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { SHOWCASE_TYPES, isImageType } from "@/lib/showcaseTypes";
import { generatePdfThumbnail } from "@/lib/pdfThumb";
import { createShowcaseItem, type ShowcaseFormState } from "@/app/(app)/showcase/actions";
import { colors, radius, shadow } from "@/lib/theme";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};

async function upload(file: Blob, ext = "bin"): Promise<string> {
  const supabase = createClient();
  const realExt = file instanceof File ? file.name.split(".").pop() || ext : ext;
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${realExt}`;
  const { error } = await supabase.storage.from("showcase").upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from("showcase").getPublicUrl(path).data.publicUrl;
}

export default function ShowcaseForm({ pendingReview = false }: { pendingReview?: boolean }) {
  const [state, formAction, pending] = useActionState<ShowcaseFormState, FormData>(createShowcaseItem, null);
  const [type, setType] = useState<string>(SHOWCASE_TYPES[0]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [thumbUrl, setThumbUrl] = useState("");
  const [busy, setBusy] = useState<"media" | "thumb" | null>(null);
  const [autoThumb, setAutoThumb] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>, which: "media" | "thumb") {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(which);
    try {
      const url = await upload(file);
      if (which === "media") {
        setMediaUrl(url);
        // Presentation with no manual thumbnail -> render its first page as the cover.
        if (type === "Presentation" && file.type === "application/pdf" && !thumbUrl) {
          try {
            const blob = await generatePdfThumbnail(file);
            if (blob) {
              const thumb = await upload(blob, "jpg");
              setThumbUrl(thumb);
              setAutoThumb(true);
            }
          } catch {
            /* non-fatal: fall back to the icon placeholder */
          }
        }
      } else {
        setThumbUrl(url);
        setAutoThumb(false);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  const img = isImageType(type);
  const acceptMedia = img ? "image/*" : type === "Video" ? "video/*" : "application/pdf,image/*";

  return (
    <form action={formAction} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "24px" }}>
      <input type="hidden" name="media_url" value={mediaUrl} />
      <input type="hidden" name="thumbnail_url" value={thumbUrl} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="title">Title</label>
          <input id="title" name="title" placeholder="e.g. Graduation 2026" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle} htmlFor="media_type">Media type</label>
          <select id="media_type" name="media_type" value={type} onChange={(e) => { setType(e.target.value); setMediaUrl(""); }} style={inputStyle}>
            {SHOWCASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="description">Description <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
        <textarea id="description" name="description" rows={3} placeholder="A short caption or context for this item." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
      </div>

      {/* Media file */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>{img ? "Image file" : type === "Video" ? "Video file" : "File (PDF / image)"}</label>
        {mediaUrl && img && (
          <div style={{ position: "relative", width: "100%", height: 200, borderRadius: radius.md, overflow: "hidden", marginBottom: 10, border: `1px solid ${colors.border}` }}>
            <Image src={mediaUrl} alt="Preview" fill style={{ objectFit: "cover" }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => mediaRef.current?.click()} disabled={busy === "media"} style={pillBtn()}>
            {busy === "media" ? "Uploading…" : mediaUrl ? "Replace file" : "Choose file"}
          </button>
          {mediaUrl && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: colors.brandDeep, fontWeight: 600 }}><Icon name="check" size={14} /> File attached</span>}
          <input ref={mediaRef} type="file" accept={acceptMedia} onChange={(e) => pick(e, "media")} style={{ display: "none" }} />
        </div>
      </div>

      {/* External link */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="external_url">External link {type === "Video" ? "(YouTube / Vimeo)" : "(optional)"}</label>
        <input id="external_url" name="external_url" type="url" placeholder="https://…" style={inputStyle} />
        <div style={{ fontSize: 12.5, color: colors.inkFaint, marginTop: 6 }}>
          {type === "Video" ? "Paste a YouTube/Vimeo link to embed, or upload a video file above." : "Upload a file and/or provide a link."}
        </div>
      </div>

      {/* Optional thumbnail for non-image media */}
      {!img && (
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Thumbnail image <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional — shown in the gallery)</span></label>
          {thumbUrl && (
            <div style={{ position: "relative", width: 150, height: 110, borderRadius: radius.md, overflow: "hidden", marginBottom: 10, border: `1px solid ${colors.border}` }}>
              <Image src={thumbUrl} alt="Thumbnail" fill style={{ objectFit: "cover" }} />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => thumbRef.current?.click()} disabled={busy === "thumb"} style={pillBtn()}>
              {busy === "thumb" ? "Uploading…" : thumbUrl ? "Replace thumbnail" : "Add thumbnail"}
            </button>
            {busy === "media" && type === "Presentation" && <span style={{ fontSize: 13, color: colors.inkFaint }}>Generating preview…</span>}
            {thumbUrl && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: colors.brandDeep, fontWeight: 600 }}>
                <Icon name="check" size={14} /> {autoThumb ? "Generated from the first page" : "Added"}
              </span>
            )}
            <input ref={thumbRef} type="file" accept="image/*" onChange={(e) => pick(e, "thumb")} style={{ display: "none" }} />
          </div>
        </div>
      )}

      {pendingReview && (
        <div style={{ display: "flex", gap: 9, fontSize: 13, color: colors.inkMuted, background: colors.tintBlue, border: `1px solid ${colors.borderBlue}`, padding: "11px 14px", borderRadius: radius.md, marginBottom: 16, lineHeight: 1.5 }}>
          <span style={{ color: colors.brandDeep, flexShrink: 0, marginTop: 1 }}><Icon name="clock" size={16} /></span>
          Your submission will be sent to an admin for review and will appear in the gallery once approved.
        </div>
      )}

      {(err || state?.error) && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginBottom: 16 }}>
          {err || state?.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={pending || busy !== null} style={{ minWidth: 180, padding: "13px 26px", fontSize: 15, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending || busy ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? (pendingReview ? "Submitting…" : "Publishing…") : pendingReview ? "Submit for review" : "Add to showcase"}
        </button>
        <Link href="/showcase" style={{ padding: "13px 24px", fontSize: 15, fontWeight: 600, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function pillBtn(): React.CSSProperties {
  return { background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" };
}
