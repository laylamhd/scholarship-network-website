"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOffer } from "@/app/(app)/alumni/actions";
import { colors, radius } from "@/lib/theme";

export default function OfferDeleteButton({ offerId }: { offerId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!confirm) {
    return <button type="button" onClick={() => setConfirm(true)} style={btn(false)}>Delete</button>;
  }
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 13, color: colors.inkMuted }}>Sure?</span>
      <button type="button" disabled={pending} onClick={() => start(async () => { await deleteOffer(offerId); router.refresh(); })} style={btn(true)}>
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" onClick={() => setConfirm(false)} style={btn(false)}>Cancel</button>
    </span>
  );
}

function btn(danger: boolean): React.CSSProperties {
  return {
    background: danger ? "#FDEDEC" : "#fff",
    color: danger ? "#C0392B" : colors.inkMuted,
    border: `1.5px solid ${danger ? "#F5C6C0" : colors.borderStrong}`,
    borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
}
