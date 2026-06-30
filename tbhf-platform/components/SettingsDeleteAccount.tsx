"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type FormState } from "@/app/(app)/settings/actions";
import { colors, radius } from "@/lib/theme";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: colors.inkMuted, display: "block", marginBottom: 7 };

export default function SettingsDeleteAccount() {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <>
        <p style={{ fontSize: 13.5, color: colors.inkMuted, lineHeight: 1.55, margin: "0 0 16px" }}>
          Permanently delete your account and everything tied to it — your profile, posts, messages,
          bookmarks, and memberships. This cannot be undone.
        </p>
        <button type="button" onClick={() => setOpen(true)} style={outlineDanger}>
          Delete account
        </button>
      </>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13.5, color: "#C0392B", fontWeight: 600, lineHeight: 1.55, margin: 0 }}>
        This is permanent. To confirm, type <strong>DELETE</strong> below and enter your password.
      </p>

      <div>
        <label htmlFor="confirm" style={labelStyle}>Type DELETE to confirm</label>
        <input id="confirm" name="confirm" type="text" placeholder="DELETE" autoComplete="off" style={inputStyle} />
      </div>
      <div>
        <label htmlFor="del_password" style={labelStyle}>Your password</label>
        <input id="del_password" name="password" type="password" autoComplete="off" style={inputStyle} />
      </div>

      {state?.error && <div style={errBox}>{state.error}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={pending} style={{ ...solidDanger, opacity: pending ? 0.7 : 1, cursor: pending ? "default" : "pointer" }}>
          {pending ? "Deleting…" : "Permanently delete my account"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={pending} style={{ padding: "11px 22px", fontSize: 14.5, fontWeight: 700, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const outlineDanger: React.CSSProperties = {
  padding: "11px 22px", fontSize: 14.5, fontWeight: 700, color: "#C0392B", background: "#fff",
  border: "1.5px solid #E8B4B0", borderRadius: radius.pill, cursor: "pointer",
};
const solidDanger: React.CSSProperties = {
  padding: "11px 22px", fontSize: 14.5, fontWeight: 700, color: "#fff", background: "#C0392B",
  border: 0, borderRadius: radius.pill,
};
const errBox: React.CSSProperties = {
  fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0",
  padding: "10px 13px", borderRadius: radius.sm,
};
