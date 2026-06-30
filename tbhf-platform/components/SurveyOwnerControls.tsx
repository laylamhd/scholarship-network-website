"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { setSurveyOpen, deleteSurvey } from "@/app/(app)/surveys/actions";
import { colors, radius } from "@/lib/theme";

export default function SurveyOwnerControls({ surveyId, isOpen }: { surveyId: string; isOpen: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function toggle() {
    start(async () => {
      await setSurveyOpen(surveyId, !isOpen);
      router.refresh();
    });
  }
  function remove() {
    if (!confirming) { setConfirming(true); return; }
    start(async () => { await deleteSurvey(surveyId); });
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={toggle} disabled={pending} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: isOpen ? "#fff" : colors.tintBlue, color: isOpen ? colors.inkMuted : colors.brandDeep, border: `1.5px solid ${isOpen ? colors.borderStrong : colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
        <Icon name={isOpen ? "x" : "check"} size={15} /> {isOpen ? "Close survey" : "Reopen survey"}
      </button>
      <button onClick={remove} disabled={pending} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: confirming ? "#D9534F" : "#fff", color: confirming ? "#fff" : "#C0392B", border: `1.5px solid ${confirming ? "#D9534F" : "#F5C6C0"}`, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
        <Icon name="x" size={15} /> {confirming ? "Click again to delete" : "Delete"}
      </button>
    </div>
  );
}
