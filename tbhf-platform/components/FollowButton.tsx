"use client";

import { useState, useTransition } from "react";
import { followScholar, unfollowScholar } from "@/app/(app)/community/actions";
import { colors, radius, shadow } from "@/lib/theme";

export default function FollowButton({
  targetId,
  initialFollowing,
  size = "md",
  block = false,
}: {
  targetId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
  block?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function onClick() {
    // Optimistic flip; revert on failure.
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      const res = next
        ? await followScholar(targetId)
        : await unfollowScholar(targetId);
      if (!res.ok) setFollowing(!next);
    });
  }

  const pad = size === "sm" ? "8px 16px" : "11px 18px";
  const font = size === "sm" ? 13 : 14.5;

  const style: React.CSSProperties = following
    ? {
        background: colors.tintBlue, color: colors.brandDeep,
        border: `1.5px solid ${colors.borderBlue}`,
      }
    : {
        background: colors.brand, color: "#fff", border: 0, boxShadow: shadow.brand,
      };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      style={{
        ...style,
        width: block ? "100%" : undefined,
        flex: block ? 1 : undefined,
        borderRadius: radius.pill,
        padding: pad,
        fontSize: font,
        fontWeight: 700,
        cursor: pending ? "default" : "pointer",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
