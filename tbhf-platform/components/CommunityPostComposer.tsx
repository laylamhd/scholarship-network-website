"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCommunityPost } from "@/app/(app)/community/actions";
import MentionTextarea from "@/components/MentionTextarea";
import { serializeMentions, type MentionMember } from "@/lib/mentions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function CommunityPostComposer({
  communityId,
  members,
  canModerate = false,
}: {
  communityId: string;
  members: MentionMember[];
  canModerate?: boolean;
}) {
  const [body, setBody] = useState("");
  const [announcement, setAnnouncement] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const picks = useRef<Map<string, string>>(new Map());
  const router = useRouter();

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    const serialized = serializeMentions(
      text,
      [...picks.current].map(([full_name, id]) => ({ full_name, id })),
    );
    start(async () => {
      const res = await createCommunityPost(communityId, serialized, announcement);
      if (res.error) setErr(res.error);
      else { setBody(""); setAnnouncement(false); setErr(null); picks.current.clear(); router.refresh(); }
    });
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 16 }}>
      <MentionTextarea
        value={body}
        onChange={setBody}
        members={members}
        allowAll={canModerate}
        onMention={(m) => picks.current.set(m.full_name, m.id)}
        placeholder="Share something with your community…  Use @ to mention someone"
        rows={3}
      />
      {err && <div style={{ fontSize: 12.5, color: "#C0392B", marginTop: 6 }}>{err}</div>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        {canModerate ? (
          <button
            type="button"
            onClick={() => setAnnouncement((a) => !a)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
              background: announcement ? colors.tintBlue : "transparent",
              color: announcement ? colors.brandDeep : colors.inkMuted,
              border: `1.5px solid ${announcement ? colors.brand : colors.borderStrong}`,
              borderRadius: radius.pill, padding: "6px 12px", fontSize: 12.5, fontWeight: 700,
            }}
          >
            <Icon name="bell" size={14} /> {announcement ? "Announcement" : "Post as announcement"}
          </button>
        ) : <span />}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          style={{ background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "9px 22px", fontSize: 14, fontWeight: 700, cursor: pending || !body.trim() ? "default" : "pointer", opacity: pending || !body.trim() ? 0.6 : 1, boxShadow: shadow.brand }}
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
