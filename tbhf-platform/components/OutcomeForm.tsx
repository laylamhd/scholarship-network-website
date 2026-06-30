"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOutcome } from "@/app/(app)/volunteer/actions";
import { PROJECT_STATUSES, statusLabel } from "@/lib/volunteerCauses";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function OutcomeForm({
  projectId,
  initialOutcome,
  initialStatus,
}: {
  projectId: string;
  initialOutcome: string | null;
  initialStatus: string;
}) {
  const [outcome, setOutcome] = useState(initialOutcome ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveOutcome(projectId, outcome, status);
      if (res.error) setError(res.error);
      else { setSaved(true); router.refresh(); }
    });
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.borderBlue}`, borderRadius: radius.lg, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
        <Icon name="sparkle" size={18} style={{ color: colors.brandDeep }} />
        <div style={{ fontSize: 15.5, fontWeight: 700, color: colors.ink }}>Organizer · project status &amp; outcome</div>
      </div>
      <p style={{ fontSize: 13, color: colors.inkFaint, margin: "0 0 14px" }}>Update the status and share the impact once the project wraps up.</p>

      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: colors.inkMuted, marginBottom: 6 }}>Status</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {PROJECT_STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} style={{
            background: status === s ? colors.brand : "#fff",
            color: status === s ? "#fff" : colors.inkMuted,
            border: `1.5px solid ${status === s ? colors.brand : colors.borderStrong}`,
            borderRadius: radius.pill, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>{statusLabel(s)}</button>
        ))}
      </div>

      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: colors.inkMuted, marginBottom: 6 }}>Outcome / impact <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
      <textarea value={outcome} onChange={(e) => { setOutcome(e.target.value); setSaved(false); }} rows={4} placeholder="What did the project achieve? People reached, results, photos to come…" style={{ width: "100%", padding: "11px 14px", fontSize: 14, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none", resize: "vertical", lineHeight: 1.55 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
        <button type="button" onClick={submit} disabled={pending} style={{ background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "9px 20px", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && !pending && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: colors.brandDeep, fontWeight: 600 }}><Icon name="check" size={15} /> Saved</span>}
        {error && <span style={{ fontSize: 12.5, color: "#C0392B" }}>{error}</span>}
      </div>
    </div>
  );
}
