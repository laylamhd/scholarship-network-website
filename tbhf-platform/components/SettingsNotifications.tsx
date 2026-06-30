"use client";

import { useActionState, useState } from "react";
import { updateNotificationPrefs, type FormState } from "@/app/(app)/settings/actions";
import { NOTIF_GROUPS, type NotifPrefs } from "@/app/(app)/settings/prefs";
import { colors, radius } from "@/lib/theme";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      style={{
        width: 44, height: 26, flexShrink: 0, borderRadius: radius.pill, border: 0, cursor: "pointer",
        padding: 3, background: on ? colors.brand : colors.borderStrong, transition: "background .15s",
        display: "flex", justifyContent: on ? "flex-end" : "flex-start", alignItems: "center",
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
    </button>
  );
}

export default function SettingsNotifications({ initial }: { initial: NotifPrefs }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateNotificationPrefs, null);
  const [prefs, setPrefs] = useState<NotifPrefs>(initial);
  const toggle = (k: string) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <form action={action}>
      {NOTIF_GROUPS.map((g) => (
        <div key={g.key}>
          <input type="hidden" name={`notif_${g.key}`} value={prefs[g.key] ? "on" : "off"} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 0", borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>{g.label}</div>
              <div style={{ fontSize: 13, color: colors.inkFaint, marginTop: 2 }}>{g.description}</div>
            </div>
            <Toggle on={!!prefs[g.key]} onClick={() => toggle(g.key)} />
          </div>
        </div>
      ))}

      {state?.error && <div style={errBox}>{state.error}</div>}
      {state?.ok && <div style={okBox}>{state.ok}</div>}

      <div style={{ marginTop: 18 }}>
        <button type="submit" disabled={pending} style={{ padding: "11px 22px", fontSize: 14.5, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}>
          {pending ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}

const errBox: React.CSSProperties = {
  fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0",
  padding: "10px 13px", borderRadius: radius.sm, marginTop: 16,
};
const okBox: React.CSSProperties = {
  fontSize: 13.5, color: "#1E7E55", background: "#E8F6EE", border: "1px solid #BFE6CF",
  padding: "10px 13px", borderRadius: radius.sm, marginTop: 16,
};
