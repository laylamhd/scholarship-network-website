"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updatePassword, type FormState } from "@/app/(app)/settings/actions";
import { colors, radius } from "@/lib/theme";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 42px 11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: colors.inkMuted, display: "block", marginBottom: 7 };

function EyeIcon({ on }: { on: boolean }) {
  return on ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l20 20" />
      <path d="M6.7 6.7C3.6 8.4 1.5 12 1.5 12S5 19 12 19c1.7 0 3.2-.4 4.5-1" />
      <path d="M9.9 5.2C10.6 5.1 11.3 5 12 5c7 0 10.5 7 10.5 7s-1 2-3 3.8" />
    </svg>
  );
}

function PasswordField({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={name} style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input id={name} name={name} type={show ? "text" : "password"} placeholder={placeholder} style={inputStyle} autoComplete="off" />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          title={show ? "Hide" : "Show"}
          style={{ position: "absolute", insetInlineEnd: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, padding: 6, cursor: "pointer", color: colors.inkFaint, display: "flex" }}
        >
          <EyeIcon on={show} />
        </button>
      </div>
    </div>
  );
}

export default function SettingsPassword() {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful change.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form action={action} ref={formRef} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PasswordField name="current_password" label="Current password" />
      <PasswordField name="new_password" label="New password" placeholder="At least 8 characters" />
      <PasswordField name="confirm_password" label="Confirm new password" />

      {state?.error && <div style={errBox}>{state.error}</div>}
      {state?.ok && <div style={okBox}>{state.ok}</div>}

      <div>
        <button type="submit" disabled={pending} style={{ padding: "11px 22px", fontSize: 14.5, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

const errBox: React.CSSProperties = {
  fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0",
  padding: "10px 13px", borderRadius: radius.sm,
};
const okBox: React.CSSProperties = {
  fontSize: 13.5, color: "#1E7E55", background: "#E8F6EE", border: "1px solid #BFE6CF",
  padding: "10px 13px", borderRadius: radius.sm,
};
