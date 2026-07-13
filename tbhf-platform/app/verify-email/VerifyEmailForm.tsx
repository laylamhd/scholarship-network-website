"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  resendSignupOtp,
  verifyEmailOtp,
  type AuthState,
} from "../login/actions";
import { colors, radius, shadow } from "@/lib/theme";

export default function VerifyEmailForm({ email }: { email: string }) {
  const [state, verifyAction, verifying] = useActionState<AuthState, FormData>(
    verifyEmailOtp,
    null,
  );
  const [resendState, resendAction, resending] = useActionState<
    AuthState,
    FormData
  >(resendSignupOtp, null);
  const [code, setCode] = useState("");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: colors.tintBlue,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: shadow.avatar,
            marginBottom: 22,
          }}
        >
          <Image src="/tbhf-mark.png" alt="TBHF" width={44} height={44} style={{ objectFit: "contain" }} />
        </div>

        <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.ink, margin: "0 0 10px" }}>
          Check your email
        </h1>
        <p style={{ fontSize: 14.5, color: colors.inkMuted, lineHeight: 1.6, margin: "0 0 26px" }}>
          {email ? (
            <>We&apos;ve sent a 6-digit code to <strong style={{ color: colors.ink }}>{email}</strong>. Enter it below to activate your account.</>
          ) : (
            <>Enter the 6-digit code we emailed you to activate your account.</>
          )}
        </p>

        {!email ? (
          <p style={{ fontSize: 14, color: colors.inkMuted }}>
            We couldn&apos;t tell which account this is for.{" "}
            <Link href="/signup" style={{ color: colors.brand, fontWeight: 600 }}>Start sign-up again</Link>.
          </p>
        ) : (
          <>
            <form action={verifyAction}>
              <input type="hidden" name="email" value={email} />
              <input
                name="token"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                aria-label="6-digit code"
                maxLength={6}
                required
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "0.5em",
                  textAlign: "center",
                  color: colors.ink,
                  background: "#fff",
                  border: `1.5px solid ${colors.borderStrong}`,
                  borderRadius: radius.md,
                  outline: "none",
                }}
              />

              {state?.error && (
                <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, margin: "14px 0 0" }}>
                  {state.error}
                </div>
              )}

              <button
                type="submit"
                disabled={verifying || code.length !== 6}
                style={{
                  width: "100%",
                  marginTop: 18,
                  padding: "14px",
                  fontSize: 15.5,
                  fontWeight: 700,
                  color: "#fff",
                  background: colors.brand,
                  border: 0,
                  borderRadius: radius.pill,
                  cursor: verifying || code.length !== 6 ? "default" : "pointer",
                  opacity: verifying || code.length !== 6 ? 0.6 : 1,
                  boxShadow: shadow.brand,
                }}
              >
                {verifying ? "Verifying…" : "Verify & continue"}
              </button>
            </form>

            <div style={{ marginTop: 22, fontSize: 14, color: colors.inkMuted }}>
              Didn&apos;t get it?{" "}
              <form action={resendAction} style={{ display: "inline" }}>
                <input type="hidden" name="email" value={email} />
                <button
                  type="submit"
                  disabled={resending}
                  style={{
                    background: "none",
                    border: 0,
                    padding: 0,
                    color: colors.brand,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: resending ? "default" : "pointer",
                  }}
                >
                  {resending ? "Sending…" : "Resend code"}
                </button>
              </form>
            </div>

            {resendState?.notice && (
              <div style={{ fontSize: 13, color: "#1E6B4E", marginTop: 12 }}>{resendState.notice}</div>
            )}
            {resendState?.error && (
              <div style={{ fontSize: 13, color: "#C0392B", marginTop: 12 }}>{resendState.error}</div>
            )}
          </>
        )}

        <div style={{ marginTop: 28, fontSize: 14, color: colors.inkMuted }}>
          <Link href="/login" style={{ color: colors.brand, fontWeight: 600 }}>Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
