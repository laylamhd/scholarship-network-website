"use client";

import { useState, useTransition } from "react";
import { safeUrl } from "@/lib/safeUrl";
import { useRouter } from "next/navigation";
import { toggleOppBookmark, setApplied } from "@/app/(app)/opportunities/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function OpportunityActions({
  opportunityId,
  applicationLink,
  initialBookmarked,
  initialApplied,
}: {
  opportunityId: string;
  applicationLink: string;
  initialBookmarked: boolean;
  initialApplied: boolean;
}) {
  const [saved, setSaved] = useState(initialBookmarked);
  const [applied, setAppliedState] = useState(initialApplied);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSave() {
    const prev = saved;
    setSaved(!prev);
    start(async () => {
      const res = await toggleOppBookmark(opportunityId, prev);
      if (res.error) setSaved(prev);
      else router.refresh();
    });
  }

  function onApplied() {
    const prev = applied;
    setAppliedState(!prev);
    start(async () => {
      const res = await setApplied(opportunityId, prev);
      if (res.error) setAppliedState(prev);
      else router.refresh();
    });
  }

  const iconBtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    background: active ? colors.tintBlue : "#fff",
    color: active ? colors.brandDeep : colors.inkMuted,
    border: `1.5px solid ${active ? colors.borderBlue : colors.borderStrong}`,
    borderRadius: radius.pill, padding: "8px 13px", fontSize: 12.5, fontWeight: 700,
    cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
  });

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <a href={safeUrl(applicationLink)} target="_blank" rel="noreferrer" onClick={() => { if (!applied) onApplied(); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, boxShadow: shadow.brand }}>
        Apply <Icon name="externalLink" size={14} />
      </a>
      <button type="button" onClick={onApplied} disabled={pending} style={iconBtn(applied)}>
        <Icon name="check" size={14} /> {applied ? "Applied" : "Mark applied"}
      </button>
      <button type="button" onClick={onSave} disabled={pending} style={iconBtn(saved)} title={saved ? "Remove bookmark" : "Save for later"}>
        <Icon name="bookmark" size={14} fill={saved ? colors.brandDeep : "none"} />
        {saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
