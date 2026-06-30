"use client";

import { useActionState } from "react";
import { createCommunity, type CreateCommunityState } from "@/app/(app)/community/actions";
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

export default function CommunityCreateForm() {
  const [state, formAction, pending] = useActionState<CreateCommunityState, FormData>(
    createCommunity,
    null,
  );

  return (
    <form action={formAction} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="name">Community name</label>
        <input id="name" name="name" type="text" placeholder="e.g. Class of 2025, Engineering Scholars…" style={inputStyle} required />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={4} placeholder="What is this community about?" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle} htmlFor="accent">Accent colour <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
        <input id="accent" name="accent" type="text" placeholder="#11A6D6" style={{ ...inputStyle, maxWidth: 180 }} />
      </div>

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, margin: "14px 0 0" }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{ marginTop: 22, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "12px 26px", fontSize: 14.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}
      >
        {pending ? "Creating…" : "Create community"}
      </button>
    </form>
  );
}
