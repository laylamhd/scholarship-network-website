"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondMentorship, endMentorship } from "@/app/(app)/mentorship/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

/** Accept / decline an incoming pending request (mentor side). */
export function RespondActions({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function act(accept: boolean) {
    setError(null);
    start(async () => {
      const res = await respondMentorship(id, accept);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => act(true)}
          disabled={pending}
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}
        >
          <Icon name="check" size={15} /> Accept
        </button>
        <button
          type="button"
          onClick={() => act(false)}
          disabled={pending}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", color: colors.inkMuted, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: pending ? "default" : "pointer" }}
        >
          <Icon name="x" size={15} /> Decline
        </button>
      </div>
      {error && <div style={{ fontSize: 12.5, color: "#C0392B", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

/** End an active mentorship / cancel a pending request (either side). */
export function EndButton({ id, label = "End" }: { id: string; label?: string }) {
  const [hover, setHover] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    start(async () => {
      const res = await endMentorship(id);
      if (!res.error) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={pending}
      style={{
        background: hover ? "#FDEDEC" : "#fff",
        color: hover ? "#C0392B" : colors.inkMuted,
        border: `1.5px solid ${hover ? "#F5C6C0" : colors.borderStrong}`,
        borderRadius: radius.pill,
        padding: "9px 16px",
        fontSize: 13,
        fontWeight: 600,
        cursor: pending ? "default" : "pointer",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}
