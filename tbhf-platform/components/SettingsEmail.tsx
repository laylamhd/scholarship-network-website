"use client";

import { useActionState } from "react";
import { updateEmail, type FormState } from "@/app/(app)/settings/actions";
import { colors, radius } from "@/lib/theme";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};

export default function SettingsEmail({ currentEmail }: { currentEmail: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateEmail, null);

  return (
    <form action={action}>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 }}>Current email</div>
      <div style={{ fontSize: 14.5, color: colors.ink, fontWeight: 600, marginBottom: 16 }}>{currentEmail}</div>

      <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600, color: colors.inkMuted, display: "block", marginBottom: 7 }}>
        New email address
      </label>
      <input id="email" name="email" type="email" placeholder="you@example.com" style={inputStyle} />

      <Feedback state={state} />

      <div style={{ marginTop: 16 }}>
        <button type="submit" disabled={pending} style={submitStyle(pending)}>
          {pending ? "Sending…" : "Update email"}
        </button>
      </div>
    </form>
  );
}

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <div style={errBox}>{state.error}</div>;
  if (state?.ok) return <div style={okBox}>{state.ok}</div>;
  return null;
}

const submitStyle = (pending: boolean): React.CSSProperties => ({
  padding: "11px 22px", fontSize: 14.5, fontWeight: 700, color: "#fff", background: colors.brand,
  border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
});
const errBox: React.CSSProperties = {
  fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0",
  padding: "10px 13px", borderRadius: radius.sm, marginTop: 14,
};
const okBox: React.CSSProperties = {
  fontSize: 13.5, color: "#1E7E55", background: "#E8F6EE", border: "1px solid #BFE6CF",
  padding: "10px 13px", borderRadius: radius.sm, marginTop: 14,
};
