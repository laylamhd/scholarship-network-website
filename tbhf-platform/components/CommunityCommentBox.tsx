"use client";

import { useRef, useState } from "react";
import MentionTextarea from "@/components/MentionTextarea";
import { serializeMentions, type MentionMember } from "@/lib/mentions";
import { colors, radius } from "@/lib/theme";

export default function CommunityCommentBox({
  members,
  allowAll = false,
  onSubmit,
  pending = false,
  placeholder = "Write a comment…",
  submitLabel = "Send",
  initialText = "",
  initialPicks = [],
  autoFocus = false,
  onCancel,
}: {
  members: MentionMember[];
  allowAll?: boolean;
  onSubmit: (serialized: string) => void;
  pending?: boolean;
  placeholder?: string;
  submitLabel?: string;
  initialText?: string;
  initialPicks?: MentionMember[];
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initialText);
  const picks = useRef<Map<string, string>>(new Map(initialPicks.map((p) => [p.full_name, p.id])));

  function send() {
    const t = text.trim();
    if (!t || pending) return;
    const serialized = serializeMentions(
      t,
      [...picks.current].map(([full_name, id]) => ({ full_name, id })),
    );
    onSubmit(serialized);
    setText("");
    picks.current.clear();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <MentionTextarea
          value={text}
          onChange={setText}
          members={members}
          allowAll={allowAll}
          onMention={(m) => picks.current.set(m.full_name, m.id)}
          onSubmit={send}
          placeholder={placeholder}
          rows={2}
          compact
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || !text.trim()}
          style={{ background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: pending || !text.trim() ? "default" : "pointer", opacity: pending || !text.trim() ? 0.6 : 1, flexShrink: 0 }}
        >
          {submitLabel}
        </button>
      </div>
      {onCancel && (
        <button type="button" onClick={onCancel} style={{ alignSelf: "flex-start", background: "none", border: 0, color: colors.inkFaint, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Cancel
        </button>
      )}
    </div>
  );
}
