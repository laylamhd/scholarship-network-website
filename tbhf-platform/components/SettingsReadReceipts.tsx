"use client";

import { useState, useTransition } from "react";
import { updateReadReceipts } from "@/app/(app)/settings/actions";
import { colors, radius } from "@/lib/theme";

/** Privacy → Read receipts toggle (phase36). Saves immediately on change. */
export default function SettingsReadReceipts({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next); // optimistic
    start(async () => {
      const res = await updateReadReceipts(next);
      if (res.error) {
        setOn(!next); // roll back
        setErr(res.error);
      } else {
        setErr(null);
      }
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>Read receipts</div>
          <div style={{ fontSize: 13, color: colors.inkFaint, marginTop: 2, lineHeight: 1.5 }}>
            When on, people see &ldquo;Seen&rdquo; ticks once you&apos;ve read their messages.
            Turn this off and you won&apos;t send read receipts, but you won&apos;t see other
            people&apos;s either.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Read receipts"
          onClick={toggle}
          disabled={pending}
          style={{
            width: 44, height: 26, flexShrink: 0, borderRadius: radius.pill, border: 0,
            cursor: pending ? "default" : "pointer", padding: 3,
            background: on ? colors.brand : colors.borderStrong,
            transition: "background .15s", opacity: pending ? 0.7 : 1,
            display: "flex", justifyContent: on ? "flex-end" : "flex-start", alignItems: "center",
          }}
        >
          <span style={{ width: 20, height: 20, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
        </button>
      </div>
      {err && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginTop: 12 }}>
          {err}
        </div>
      )}
    </div>
  );
}
