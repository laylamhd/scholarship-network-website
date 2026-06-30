"use client";

import { useState, useTransition } from "react";
import { deleteCommunity } from "@/app/(app)/community/actions";
import { Icon } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";

export default function DeleteCommunityButton({ communityId, name }: { communityId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function onDelete() {
    start(async () => {
      await deleteCommunity(communityId);
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#C0392B", border: `1.5px solid #F5C6C0`, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        <Icon name="x" size={14} /> Delete
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12.5, color: colors.inkMuted }}>Delete “{name}”?</span>
      <button type="button" disabled={pending} onClick={onDelete}
        style={{ background: "#C0392B", color: "#fff", border: 0, borderRadius: radius.pill, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" onClick={() => setConfirming(false)}
        style={{ background: "#fff", color: colors.inkMuted, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        Cancel
      </button>
    </div>
  );
}
