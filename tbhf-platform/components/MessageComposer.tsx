"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/app/(app)/messages/actions";
import { colors, radius } from "@/lib/theme";

export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    start(async () => {
      const res = await sendMessage(conversationId, text);
      if (res.error) {
        setErr(res.error);
      } else {
        setBody("");
        setErr(null);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ position: "sticky", bottom: 0, background: colors.bg, paddingTop: 12 }}>
      {err && <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 8 }}>{err}</div>}
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 10 }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
          rows={1}
          style={{ flex: 1, resize: "none", border: 0, outline: "none", fontSize: 14.5, color: colors.ink, padding: "8px 10px", maxHeight: 140, lineHeight: 1.5 }}
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          style={{ flexShrink: 0, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "10px 20px", fontSize: 14.5, fontWeight: 700, cursor: pending || !body.trim() ? "default" : "pointer", opacity: pending || !body.trim() ? 0.6 : 1 }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
