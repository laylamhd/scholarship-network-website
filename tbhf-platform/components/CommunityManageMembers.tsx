"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  addCommunityMember,
  removeCommunityMember,
  searchAddableProfiles,
} from "@/app/(app)/community/actions";
import { Icon } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";
import type { CommunityMember } from "@/lib/communities";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

function roleLabel(role: string): string {
  return role === "scholar" ? "Student" : role.charAt(0).toUpperCase() + role.slice(1);
}

type Addable = { id: string; full_name: string; email: string | null; role: string; avatar_url: string | null };

function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  return url ? (
    <Image src={url} alt={name} width={size} height={size} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, textTransform: "uppercase" }}>
      {initials(name)}
    </div>
  );
}

export default function CommunityManageMembers({
  communityId,
  members,
}: {
  communityId: string;
  members: CommunityMember[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Addable[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, start] = useTransition();

  async function runSearch(q: string) {
    setQuery(q);
    setSearching(true);
    const res = await searchAddableProfiles(communityId, q);
    setResults(res);
    setSearching(false);
  }

  function add(profileId: string) {
    start(async () => {
      await addCommunityMember(communityId, profileId);
      setResults((r) => r.filter((p) => p.id !== profileId));
      router.refresh();
    });
  }

  function remove(profileId: string) {
    start(async () => {
      await removeCommunityMember(communityId, profileId);
      router.refresh();
    });
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>
          Members <span style={{ color: colors.inkFaint, fontWeight: 600 }}>· {members.length}</span>
        </div>
        <button
          type="button"
          onClick={() => { setOpen((o) => !o); if (!open && results.length === 0) runSearch(""); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: open ? colors.bg : colors.brand, color: open ? colors.inkMuted : "#fff", border: 0, borderRadius: radius.pill, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          <Icon name={open ? "x" : "plus"} size={14} /> {open ? "Done" : "Add"}
        </button>
      </div>

      {open && (
        <div style={{ marginBottom: 16, padding: 14, background: colors.bg, borderRadius: radius.md }}>
          <input
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search students & alumni by name or email…"
            style={{ width: "100%", padding: "9px 13px", fontSize: 13.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }}
          />
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
            {searching ? (
              <div style={{ fontSize: 13, color: colors.inkFaint, padding: "6px 2px" }}>Searching…</div>
            ) : results.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.inkFaint, padding: "6px 2px" }}>No one left to add.</div>
            ) : (
              results.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={p.full_name} url={p.avatar_url} size={32} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.full_name}</div>
                    <div style={{ fontSize: 11.5, color: colors.inkFaint }}>{roleLabel(p.role)}</div>
                  </div>
                  <button type="button" disabled={pending} onClick={() => add(p.id)}
                    style={{ background: colors.tintBlue, color: colors.brandDeep, border: 0, borderRadius: radius.pill, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {members.length === 0 ? (
          <div style={{ fontSize: 13, color: colors.inkFaint }}>No members yet — add some above.</div>
        ) : (
          members.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={m.full_name} url={m.avatar_url} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.ink }}>{m.full_name}</div>
                <div style={{ fontSize: 12, color: colors.inkFaint }}>{roleLabel(m.role)}</div>
              </div>
              <button type="button" disabled={pending} onClick={() => remove(m.id)} aria-label={`Remove ${m.full_name}`}
                style={{ background: "none", border: 0, cursor: "pointer", color: colors.inkFaint, padding: 4 }}>
                <Icon name="x" size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
