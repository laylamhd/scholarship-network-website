"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setMemberRole, setMemberActive } from "@/app/(app)/admin/actions";
import { Icon } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";
import type { AdminMember } from "@/lib/admin";

const ROLES = ["scholar", "alumni", "admin"];

export default function AdminMemberRow({ m, isSelf }: { m: AdminMember; isSelf: boolean }) {
  const [role, setRole] = useState(m.role);
  const [active, setActive] = useState(m.is_active);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function changeRole(next: string) {
    if (next === role) return;
    const prev = role;
    setRole(next);
    setError(null);
    start(async () => {
      const res = await setMemberRole(m.id, next);
      if (res.error) { setRole(prev); setError(res.error); }
      else router.refresh();
    });
  }

  function toggleActive() {
    const next = !active;
    setActive(next);
    setError(null);
    start(async () => {
      const res = await setMemberActive(m.id, next);
      if (res.error) { setActive(!next); setError(res.error); }
      else router.refresh();
    });
  }

  const joined = new Date(m.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) 1.1fr 1fr 1.2fr auto", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: `1px solid ${colors.border}`, opacity: active ? 1 : 0.55 }}>
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

      {/* Role selector */}
      <select
        value={role}
        disabled={pending || isSelf}
        onChange={(e) => changeRole(e.target.value)}
        style={{ fontSize: 12.5, fontWeight: 600, color: colors.ink, padding: "6px 10px", borderRadius: radius.md, border: `1.5px solid ${colors.borderStrong}`, background: "#fff", textTransform: "capitalize", cursor: isSelf ? "not-allowed" : "pointer", maxWidth: 130 }}
        title={isSelf ? "You can't change your own role" : undefined}
      >
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>

      {/* Active toggle */}
      <button
        type="button"
        onClick={toggleActive}
        disabled={pending || isSelf}
        title={isSelf ? "You can't deactivate yourself" : active ? "Deactivate" : "Activate"}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: radius.pill, cursor: isSelf ? "not-allowed" : "pointer",
          border: `1.5px solid ${active ? "#BDE9D8" : colors.borderStrong}`, background: active ? "#0F8F6B12" : "#fff", color: active ? "#0F8F6B" : colors.inkFaint }}
      >
        <Icon name={active ? "check" : "x"} size={13} /> {active ? "Active" : "Inactive"}
      </button>

      {error && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#C0392B" }}>{error}</div>}
    </div>
  );
}
