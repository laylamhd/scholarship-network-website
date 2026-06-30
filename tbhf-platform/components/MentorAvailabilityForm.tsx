"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMentorAvailability } from "@/app/(app)/mentorship/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function MentorAvailabilityForm({
  initialWilling,
  initialTopics,
}: {
  initialWilling: boolean;
  initialTopics: string | null;
}) {
  const [willing, setWilling] = useState(initialWilling);
  const [topics, setTopics] = useState(initialTopics ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save(nextWilling: boolean) {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await setMentorAvailability(nextWilling, topics);
      if (res.error) {
        setError(res.error);
        setWilling(initialWilling);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.borderBlue}`, borderRadius: radius.lg, padding: "22px 24px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="handshake" size={24} />
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink }}>Become a mentor</div>
            <div style={{ fontSize: 13.5, color: colors.inkFaint, marginTop: 2, lineHeight: 1.5 }}>
              {willing
                ? "You're listed in the mentor directory. Scholars can request your guidance."
                : "Turn this on to appear in the mentor directory for current scholars."}
            </div>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={willing}
          onClick={() => { const next = !willing; setWilling(next); save(next); }}
          disabled={pending}
          style={{ width: 52, height: 30, borderRadius: 999, border: 0, padding: 3, cursor: pending ? "default" : "pointer", background: willing ? colors.brand : colors.borderStrong, transition: "background .15s", flexShrink: 0 }}
        >
          <span style={{ display: "block", width: 24, height: 24, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transform: willing ? "translateX(22px)" : "translateX(0)", transition: "transform .15s" }} />
        </button>
      </div>

      {willing && (
        <div style={{ marginTop: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 }} htmlFor="topics">
            What can you help mentees with?
          </label>
          <textarea
            id="topics"
            value={topics}
            onChange={(e) => { setTopics(e.target.value); setSaved(false); }}
            rows={2}
            placeholder="e.g. Graduate school applications, breaking into tech, research careers, work-life balance…"
            style={{ width: "100%", padding: "11px 14px", fontSize: 14, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none", resize: "vertical", lineHeight: 1.5 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => save(willing)}
              disabled={pending}
              style={{ background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "9px 20px", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}
            >
              {pending ? "Saving…" : "Save"}
            </button>
            {saved && !pending && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: colors.brandDeep, fontWeight: 600 }}>
                <Icon name="check" size={15} /> Saved
              </span>
            )}
          </div>
        </div>
      )}
      {error && <div style={{ fontSize: 12.5, color: "#C0392B", marginTop: 10 }}>{error}</div>}
    </div>
  );
}
