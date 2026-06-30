"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleCollaborate } from "@/app/(app)/research/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function ResearchCollabButton({
  postId,
  initialInterested,
  count,
  block = false,
}: {
  postId: string;
  initialInterested: boolean;
  count: number;
  block?: boolean;
}) {
  const [interested, setInterested] = useState(initialInterested);
  const [n, setN] = useState(count);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    const prev = interested;
    setInterested(!prev);
    setN((c) => c + (prev ? -1 : 1));
    start(async () => {
      const res = await toggleCollaborate(postId, prev);
      if (res.error) { setInterested(prev); setN((c) => c + (prev ? 1 : -1)); }
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        width: block ? "100%" : undefined,
        background: interested ? colors.tintBlue : colors.brand,
        color: interested ? colors.brandDeep : "#fff",
        border: interested ? `1.5px solid ${colors.borderBlue}` : 0,
        borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700,
        cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
        boxShadow: interested ? "none" : shadow.brand,
      }}
    >
      <Icon name={interested ? "check" : "users"} size={16} />
      {interested ? "Interested" : "I'd like to collaborate"}
      {n > 0 && <span style={{ opacity: 0.75, fontWeight: 600 }}>· {n}</span>}
    </button>
  );
}
