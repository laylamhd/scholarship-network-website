"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createOpportunity, type CreateOppState } from "@/app/(app)/opportunities/actions";
import { colors, radius, shadow } from "@/lib/theme";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};

export default function OpportunityForm({ types }: { types: string[] }) {
  const [state, formAction, pending] = useActionState<CreateOppState, FormData>(createOpportunity, null);

  return (
    <form action={formAction} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="title">Title</label>
          <input id="title" name="title" placeholder="e.g. Research Assistant Internship" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle} htmlFor="company_name">Organisation</label>
          <input id="company_name" name="company_name" placeholder="e.g. UNRWA" style={inputStyle} required />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="opportunity_type">Type</label>
          <select id="opportunity_type" name="opportunity_type" defaultValue={types[0] ?? ""} style={inputStyle}>
            {types.length === 0 && <option value="">—</option>}
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="deadline">Application deadline</label>
          <input id="deadline" name="deadline" type="date" style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 16, alignItems: "end" }}>
        <div>
          <label style={labelStyle} htmlFor="location">Location</label>
          <input id="location" name="location" placeholder="e.g. Amman, Jordan" style={inputStyle} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: colors.ink, paddingBottom: 11, cursor: "pointer" }}>
          <input type="checkbox" name="is_remote" /> Remote
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="application_link">Application link</label>
        <input id="application_link" name="application_link" type="url" placeholder="https://…" style={inputStyle} required />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={5} placeholder="Role, responsibilities, eligibility, etc." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} required />
      </div>

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginBottom: 16 }}>
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={pending} style={{ minWidth: 180, padding: "13px 26px", fontSize: 15, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? "Posting…" : "Post opportunity"}
        </button>
        <Link href="/opportunities" style={{ padding: "13px 24px", fontSize: 15, fontWeight: 600, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
