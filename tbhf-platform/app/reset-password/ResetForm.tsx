"use client";

import { useActionState } from "react";
import Link from "next/link";
import AuthCard, { buttonStyle, errorBox, fieldStyle, labelStyle } from "@/components/auth/AuthCard";
import { colors } from "@/lib/theme";
import { setNewPassword, type ResetState } from "./actions";

export default function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(setNewPassword, null);
  if (!token) {
    return (
      <AuthCard eyebrow="Password reset" title="This link is incomplete">
        <p style={{ fontSize: 14.5, color: colors.inkMuted, lineHeight: 1.55 }}>
          Open the link from your e-mail again, or <Link href="/forgot-password" style={{ color: colors.brand, fontWeight: 600 }}>ask for a new one</Link>.
        </p>
      </AuthCard>
    );
  }
  return (
    <AuthCard eyebrow="Password reset" title="Choose a new password">
      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle} htmlFor="password">New password</label>
          <input id="password" name="password" type="password" minLength={8} placeholder="At least 8 characters" autoComplete="new-password" style={fieldStyle} required />
        </div>
        <label style={labelStyle} htmlFor="confirm_password">Confirm new password</label>
        <input id="confirm_password" name="confirm_password" type="password" minLength={8} autoComplete="new-password" style={fieldStyle} required />
        {state?.error && <div style={errorBox}>{state.error}</div>}
        <button type="submit" disabled={pending} style={buttonStyle(pending)}>{pending ? "Please wait…" : "Save new password"}</button>
      </form>
    </AuthCard>
  );
}
