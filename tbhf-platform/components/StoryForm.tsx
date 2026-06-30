"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { STORY_CATEGORIES } from "@/lib/storyCategories";
import type { StoryFormState } from "@/app/(app)/stories/actions";
import { colors, radius, shadow } from "@/lib/theme";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};

export type StoryInitial = {
  title: string;
  category: string;
  excerpt: string;
  body: string;
  cover_image_url: string;
  status: "draft" | "published";
  featured_consent: boolean;
};

export default function StoryForm({
  action,
  initial,
  submitLabel = "Publish story",
  pendingReview = false,
}: {
  action: (prev: StoryFormState, formData: FormData) => Promise<StoryFormState>;
  initial?: StoryInitial;
  submitLabel?: string;
  pendingReview?: boolean;
}) {
  const [state, formAction, pending] = useActionState<StoryFormState, FormData>(action, null);
  const [coverUrl, setCoverUrl] = useState(initial?.cover_image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("story-covers").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("story-covers").getPublicUrl(path);
      setCoverUrl(data.publicUrl);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "24px" }}>
      <input type="hidden" name="cover_image_url" value={coverUrl} />

      {/* Cover image */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Cover image</label>
        {coverUrl && (
          <div style={{ position: "relative", width: "100%", height: 200, borderRadius: radius.md, overflow: "hidden", marginBottom: 10, border: `1px solid ${colors.border}` }}>
            <Image src={coverUrl} alt="Cover preview" fill style={{ objectFit: "cover" }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            {uploading ? "Uploading…" : coverUrl ? "Replace image" : "Add a cover image"}
          </button>
          {coverUrl && <button type="button" onClick={() => setCoverUrl("")} style={{ background: "none", border: 0, color: colors.inkFaint, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Remove</button>}
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickCover} style={{ display: "none" }} />
        </div>
        {uploadErr && <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>{uploadErr}</div>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="title">Title</label>
        <input id="title" name="title" defaultValue={initial?.title} placeholder="Give your story a title" style={inputStyle} required />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={initial?.category ?? STORY_CATEGORIES[0]} style={inputStyle}>
          {STORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="excerpt">Short summary <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
        <textarea id="excerpt" name="excerpt" defaultValue={initial?.excerpt} rows={2} placeholder="A one or two line teaser shown on cards." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle} htmlFor="body">Your story</label>
        <textarea id="body" name="body" defaultValue={initial?.body} rows={12} placeholder="Write your story here…" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7, fontSize: 15 }} required />
      </div>

      {/* Consent to feature */}
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", background: colors.bg, borderRadius: radius.md, padding: "13px 15px", marginBottom: 18, cursor: "pointer" }}>
        <input type="checkbox" name="featured_consent" defaultChecked={initial?.featured_consent} style={{ marginTop: 3, width: 16, height: 16, accentColor: colors.brand }} />
        <span style={{ fontSize: 13.5, color: colors.inkMuted, lineHeight: 1.5 }}>
          I allow TBHF to feature this story on its website and social media channels.
          <span style={{ color: colors.inkFaint }}> You can change this anytime by editing the story.</span>
        </span>
      </label>

      {pendingReview && (
        <div style={{ display: "flex", gap: 9, fontSize: 13, color: colors.inkMuted, background: colors.tintBlue, border: `1px solid ${colors.borderBlue}`, padding: "11px 14px", borderRadius: radius.md, marginBottom: 16, lineHeight: 1.5 }}>
          <span style={{ color: colors.brandDeep, flexShrink: 0, marginTop: 1 }}><Icon name="clock" size={16} /></span>
          When you publish, your story is sent to an admin for review and will appear to the community once approved. Saving as a draft keeps it private to you.
        </div>
      )}

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginBottom: 16 }}>
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" name="publish" value="published" disabled={pending || uploading} style={{ minWidth: 170, padding: "13px 26px", fontSize: 15, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending || uploading ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? "Saving…" : pendingReview ? "Submit for review" : submitLabel}
        </button>
        <button type="submit" name="publish" value="draft" disabled={pending || uploading} style={{ padding: "13px 24px", fontSize: 15, fontWeight: 600, color: colors.brandDeep, background: colors.tintBlue, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, cursor: "pointer" }}>
          Save as draft
        </button>
        <Link href="/stories" style={{ padding: "13px 24px", fontSize: 15, fontWeight: 600, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
