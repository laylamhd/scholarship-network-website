"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestMentorship } from "@/app/(app)/mentorship/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function MentorRequestButton({
  mentorId,
  mentorName,
  status,
}: {
  mentorId: string;
  mentorName: string;
  status: string | null; // 'pending' | 'active' | null
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (status === "active") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 16px", fontSize: 13, fontWeight: 700 }}>
        <Icon name="check" size={15} /> Your mentor
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", background: colors.bg, color: colors.inkMuted, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "9px 16px", fontSize: 13, fontWeight: 700 }}>
        <Icon name="clock" size={15} /> Request sent
      </span>
    );
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await requestMentorship(mentorId, message);
      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setMessage("");
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", boxShadow: shadow.brand }}
      >
        <Icon name="handshake" size={16} /> Request mentorship
      </button>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        autoFocus
        placeholder={`Introduce yourself to ${mentorName.split(/\s+/)[0]} and say what you'd like help with…`}
        style={{ width: "100%", padding: "10px 12px", fontSize: 13.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none", resize: "vertical", lineHeight: 1.5 }}
      />
      {error && <div style={{ fontSize: 12.5, color: "#C0392B", marginTop: 6 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          style={{ flex: 1, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}
        >
          {pending ? "Sending…" : "Send request"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          disabled={pending}
          style={{ background: "#fff", color: colors.inkMuted, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
