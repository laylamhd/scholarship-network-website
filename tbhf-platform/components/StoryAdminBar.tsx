"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStoryFeatured } from "@/app/(app)/stories/actions";
import { Icon } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";

/** Admin-only: feature / unfeature a story for the TBHF website & socials. */
export default function StoryAdminBar({
  storyId,
  initialFeatured,
  consent,
}: {
  storyId: string;
  initialFeatured: boolean;
  consent: boolean;
}) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !featured;
    setError(null);
    setFeatured(next);
    start(async () => {
      const res = await setStoryFeatured(storyId, next);
      if (res.error) {
        setFeatured(!next);
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div style={{ background: colors.tintBlue, border: `1px solid ${colors.borderBlue}`, borderRadius: radius.lg, padding: "16px 18px", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="sparkle" size={18} style={{ color: colors.brandDeep }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink }}>Admin · Featured stories</div>
            <div style={{ fontSize: 12.5, color: colors.inkMuted, marginTop: 1 }}>
              {consent
                ? "The author has consented to featuring on TBHF channels."
                : "The author has not yet consented — featuring is disabled."}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={pending || (!featured && !consent)}
          style={{
            background: featured ? colors.brand : "#fff",
            color: featured ? "#fff" : colors.brandDeep,
            border: `1.5px solid ${featured ? colors.brand : colors.borderBlue}`,
            borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700,
            cursor: pending || (!featured && !consent) ? "not-allowed" : "pointer",
            opacity: pending || (!featured && !consent) ? 0.55 : 1,
          }}
        >
          {featured ? "Featured" : "Feature this story"}
        </button>
      </div>
      {error && <div style={{ fontSize: 12.5, color: "#C0392B", marginTop: 10 }}>{error}</div>}
    </div>
  );
}
