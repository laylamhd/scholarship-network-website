"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroupPost } from "@/app/(app)/groups/feed-actions";
import { colors, radius, shadow } from "@/lib/theme";

export default function PostComposer({ groupId }: { groupId: string }) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    start(async () => {
      const res = await createGroupPost(groupId, text);
      if (res.error) setErr(res.error);
      else { setBody(""); setErr(null); router.refresh(); }
    });
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 16 }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share something with the group…"
        rows={3}
        style={{ width: "100%", resize: "vertical", border: 0, outline: "none", fontSize: 14.5, color: colors.ink, lineHeight: 1.55 }}
      />
      {err && <div style={{ fontSize: 12.5, color: "#C0392B", marginTop: 6 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
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
