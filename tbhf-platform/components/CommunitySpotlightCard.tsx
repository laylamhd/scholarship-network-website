"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setCommunitySpotlight, clearCommunitySpotlight } from "@/app/(app)/community/actions";
import { Icon } from "@/components/Icon";
import type { CommunityMember, CommunitySpotlight } from "@/lib/communities";
import { colors, radius } from "@/lib/theme";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

export default function CommunitySpotlightCard({
  communityId,
  spotlight,
  canModerate,
  members,
}: {
  communityId: string;
  spotlight: CommunitySpotlight | null;
  canModerate: boolean;
  members: CommunityMember[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState(spotlight?.profile_id ?? "");
  const [note, setNote] = useState(spotlight?.note ?? "");
  const [err, setErr] = useState<string | null>(null);

  // Nothing to show to a regular member if no one is featured.
  if (!spotlight && !canModerate) return null;

  function save() {
    if (!pick) { setErr("Choose a member to feature."); return; }
    start(async () => {
      const res = await setCommunitySpotlight(communityId, pick, note);
      if (res.error) setErr(res.error);
      else { setErr(null); setEditing(false); router.refresh(); }
    });
  }
  function clear() {
    start(async () => {
      const res = await clearCommunitySpotlight(communityId);
      if (!res.error) { setPick(""); setNote(""); router.refresh(); }
    });
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 15, fontWeight: 700, color: colors.ink }}>
          <Icon name="sparkle" size={16} /> Member spotlight
        </div>
        {canModerate && !editing && (
          <button type="button" onClick={() => setEditing(true)} style={{ background: "none", border: 0, color: colors.brandDeep, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            {spotlight ? "Change" : "Feature"}
          </button>
        )}
      </div>

      {spotlight && !editing && (
        <div>
          <Link href={`/scholars/${spotlight.profile_id}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {spotlight.avatar_url ? (
              <Image src={spotlight.avatar_url} alt={spotlight.full_name} width={44} height={44} style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, textTransform: "uppercase" }}>
                {initials(spotlight.full_name)}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>{spotlight.full_name}</div>
              <div style={{ fontSize: 12, color: colors.inkFaint, textTransform: "capitalize" }}>{spotlight.role === "scholar" ? "Student" : spotlight.role}</div>
            </div>
          </Link>
          {spotlight.note && (
            <div style={{ fontSize: 13, color: colors.inkMuted, lineHeight: 1.55, marginTop: 12, fontStyle: "italic" }}>“{spotlight.note}”</div>
          )}
          {canModerate && (
            <button type="button" onClick={clear} disabled={pending} style={{ marginTop: 14, background: "none", border: 0, color: "#C0392B", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              Remove spotlight
            </button>
          )}
        </div>
      )}

      {canModerate && editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ padding: "9px 12px", fontSize: 13.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none" }}>
            <option value="">Choose a member…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why they're featured (optional)" maxLength={200} style={{ padding: "9px 12px", fontSize: 13.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none" }} />
          {err && <div style={{ fontSize: 12, color: "#C0392B" }}>{err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={save} disabled={pending} style={{ background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1 }}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => { setEditing(false); setErr(null); }} style={{ background: "#fff", color: colors.inkMuted, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
