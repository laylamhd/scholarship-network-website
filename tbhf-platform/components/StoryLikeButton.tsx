"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleStoryLike } from "@/app/(app)/stories/actions";
import { Icon } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";

export default function StoryLikeButton({
  storyId,
  initialLiked,
  initialCount,
}: {
  storyId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    const prev = liked;
    setLiked(!prev);
    setCount((c) => c + (prev ? -1 : 1));
    start(async () => {
      const res = await toggleStoryLike(storyId, prev);
      if (res.error) {
        setLiked(prev);
        setCount((c) => c + (prev ? 1 : -1));
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={liked ? "Remove like" : "Like this story"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        background: liked ? colors.tintBlue : "#fff",
        color: liked ? colors.brandDeep : colors.inkMuted,
        border: `1.5px solid ${liked ? colors.borderBlue : colors.borderStrong}`,
        borderRadius: radius.pill, padding: "8px 16px", fontSize: 13.5, fontWeight: 700,
        cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
      }}
    >
      <Icon name="heart" size={16} fill={liked ? colors.brandDeep : "none"} />
      {count} {count === 1 ? "like" : "likes"}
    </button>
  );
}
