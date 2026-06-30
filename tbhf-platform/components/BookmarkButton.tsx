"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBookmark } from "@/app/(app)/resources/actions";
import { colors, radius } from "@/lib/theme";

export default function BookmarkButton({
  resourceId,
  initialBookmarked,
}: {
  resourceId: string;
  initialBookmarked: boolean;
}) {
  const [saved, setSaved] = useState(initialBookmarked);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    const prev = saved;
    setSaved(!prev);
    start(async () => {
      const res = await toggleBookmark(resourceId, prev);
      if (res.error) setSaved(prev);
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={saved ? "Remove bookmark" : "Save for later"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: saved ? colors.tintBlue : "#fff",
        color: saved ? colors.brandDeep : colors.inkMuted,
        border: `1.5px solid ${saved ? colors.borderBlue : colors.borderStrong}`,
        borderRadius: radius.pill, padding: "8px 14px", fontSize: 13, fontWeight: 700,
        cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? colors.brandDeep : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
