"use client";

import { useActionState } from "react";
import Link from "next/link";
import AuthCard, { buttonStyle, errorBox, fieldStyle, labelStyle, noticeBox } from "@/components/auth/AuthCard";
import { colors } from "@/lib/theme";
import { forgotPassword, type ForgotState } from "./actions";

export default function ForgotForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(forgotPassword, null);
  return (
    <AuthCard eyebrow="Forgot your password?" title="Reset your password">
      <form action={formAction}>
        <p style={{ fontSize: 14.5, color: colors.inkMuted, margin: "0 0 18px", lineHeight: 1.55 }}>
          Enter the e-mail you sign in with and we will send you a link to choose a new password.
        </p>
        <label style={labelStyle} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="name@example.com" style={fieldStyle} autoComplete="email" required />
        {state?.error && <div style={errorBox}>{state.error}</div>}
        {state?.notice && <div style={noticeBox}>{state.notice}</div>}
        <button type="submit" disabled={pending} style={buttonStyle(pending)}>{pending ? "Please wait…" : "Send reset link"}</button>
        <div style={{ marginTop: 18, fontSize: 14, textAlign: "center", color: colors.inkMuted }}>
          <Link href="/login" style={{ color: colors.brand, fontWeight: 600 }}>Back to sign in</Link>
        </div>
      </form>
    </AuthCard>
  );
}
