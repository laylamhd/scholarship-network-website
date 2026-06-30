"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createGroup, type CreateGroupState } from "@/app/(app)/groups/actions";
import { GROUP_CATEGORIES } from "@/lib/groupCategories";
import { colors, radius, shadow } from "@/lib/theme";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};

export default function CreateGroupForm() {
  const [state, formAction, pending] = useActionState<CreateGroupState, FormData>(createGroup, null);

  return (
    <form action={formAction} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "24px" }}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="name">Group name</label>
        <input id="name" name="name" placeholder="e.g. Women in STEM" style={inputStyle} required />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue="thematic" style={inputStyle}>
          {GROUP_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={4} placeholder="What is this community about? Who should join?" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
      </div>

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginBottom: 16 }}>
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={pending} style={{ minWidth: 180, padding: "13px 26px", fontSize: 15, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? "Creating…" : "Create group"}
        </button>
        <Link href="/groups" style={{ padding: "13px 24px", fontSize: 15, fontWeight: 600, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
