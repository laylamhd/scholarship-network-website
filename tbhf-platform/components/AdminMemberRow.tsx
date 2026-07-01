"use client";

import Link from "next/link";
import { colors, radius } from "@/lib/theme";
import type { AdminMember } from "@/lib/admin";

export default function AdminMemberRow({ m, isSelf }: { m: AdminMember; isSelf: boolean }) {
  const joined = new Date(m.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) 1.1fr 1fr", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: `1px solid ${colors.border}`, opacity: m.is_active ? 1 : 0.55 }}>
      {/* Name + email */}
      <div style={{ minWidth: 0 }}>
        <Link href={`/scholars/${m.id}`} style={{ fontSize: 14, fontWeight: 700, color: colors.ink, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {m.full_name || "Unnamed"}{isSelf && <span style={{ fontSize: 11, fontWeight: 600, color: colors.inkFaint }}> · you</span>}
        </Link>
        <span style={{ fontSize: 12, color: colors.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{m.email}</span>
      </div>

      {/* Completion */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ flex: 1, height: 6, background: colors.bg, borderRadius: radius.pill, overflow: "hidden", maxWidth: 90 }}>
            <div style={{ width: `${m.completion}%`, height: "100%", background: m.completion >= 75 ? "#0F8F6B" : m.completion >= 40 ? colors.brand : "#E0922E", borderRadius: radius.pill }} />
          </div>
          <span style={{ fontSize: 12, color: colors.inkMuted, fontWeight: 600 }}>{m.completion}%</span>
        </div>
      </div>

      {/* Joined */}
      <span style={{ fontSize: 12.5, color: colors.inkMuted }}>{joined}</span>
    </div>
  );
}
