"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/app/(app)/messages/actions";
import { colors, radius } from "@/lib/theme";

export type ReplyTarget = { id: string; author: string; body: string } | null;

export default function MessageComposer({
  conversationId,
  replyTo,
  onClearReply,
}: {
  conversationId: string;
  replyTo?: ReplyTarget;
  onClearReply?: () => void;
}) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Focus the box when a reply is started (like WhatsApp).
  useEffect(() => {
    if (replyTo) taRef.current?.focus();
  }, [replyTo]);

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    start(async () => {
      const res = await sendMessage(conversationId, text, replyTo?.id ?? null);
      if (res.error) {
        setErr(res.error);
      } else {
        setBody("");
        setErr(null);
        onClearReply?.();
        router.refresh();
      }
    });
  }

  return (
    <div style={{ position: "sticky", bottom: 0, background: colors.bg, paddingTop: 12, flexShrink: 0 }}>
      {err && <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 8 }}>{err}</div>}

      {/* Replying-to preview */}
      {replyTo && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${colors.border}`, borderBottom: 0, borderRadius: `${radius.lg}px ${radius.lg}px 0 0`, padding: "9px 14px" }}>
          <span style={{ width: 3, alignSelf: "stretch", background: colors.brand, borderRadius: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.brandDeep }}>Replying to {replyTo.author}</div>
            <div style={{ fontSize: 13, color: colors.inkMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{replyTo.body}</div>
          </div>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={() => onClearReply?.()}
            style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, border: "none", background: colors.bg, color: colors.inkMuted, cursor: "pointer", fontSize: 15, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#fff", border: `1px solid ${colors.border}`, borderRadius: replyTo ? `0 0 ${radius.lg}px ${radius.lg}px` : radius.lg, padding: 10 }}
      >
        <textarea
          ref={taRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          placeholder="Write a message…"
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
