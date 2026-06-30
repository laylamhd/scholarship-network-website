"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logHours } from "@/app/(app)/volunteer/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

type ProjectOpt = { id: string; title: string };

export default function LogHoursButton({
  projects = [],
  fixedProjectId,
  fixedProjectTitle,
  variant = "solid",
}: {
  projects?: ProjectOpt[];
  fixedProjectId?: string;
  fixedProjectTitle?: string;
  variant?: "solid" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    const h = parseFloat(hours);
    if (!(h > 0)) { setError("Enter a number of hours."); return; }
    start(async () => {
      const res = await logHours({ hours: h, activity, date, projectId: projectId || fixedProjectId || null });
      if (res.error) setError(res.error);
      else { setOpen(false); setHours(""); setActivity(""); router.refresh(); }
    });
  }

  const triggerStyle: React.CSSProperties = variant === "solid"
    ? { background: colors.brand, color: "#fff", border: 0, boxShadow: shadow.brand }
    : { background: "#fff", color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}` };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ ...triggerStyle, display: "inline-flex", alignItems: "center", gap: 7, borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        <Icon name="clock" size={16} /> Log hours
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(33,45,55,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: radius.lg, boxShadow: shadow.card, width: "100%", maxWidth: 420, padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: colors.ink }}>Log volunteer hours</div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ background: "none", border: 0, cursor: "pointer", color: colors.inkFaint }}><Icon name="x" size={20} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Hours</label>
                <input type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} autoFocus placeholder="e.g. 3" style={field()} />
              </div>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field()} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Activity <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
              <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="What did you do?" style={field()} />
            </div>

            {fixedProjectId ? (
              <div style={{ fontSize: 12.5, color: colors.inkFaint, marginBottom: 12 }}>For: <strong style={{ color: colors.inkMuted }}>{fixedProjectTitle}</strong></div>
            ) : projects.length > 0 ? (
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Project <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={field()}>
                  <option value="">General volunteering</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            ) : null}

            {error && <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 10 }}>{error}</div>}

            <button type="button" onClick={submit} disabled={pending} style={{ background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}>
              {pending ? "Saving…" : "Save hours"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: colors.inkMuted, marginBottom: 6 };
function field(): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", fontSize: 14, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none" };
}
