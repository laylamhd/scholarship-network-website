"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { resendConfirmationEmail, type AuthState } from "../login/actions";
import { colors, radius, shadow } from "@/lib/theme";

export default function VerifyEmailForm({ email }: { email: string }) {
  const [resendState, resendAction, resending] = useActionState<
    AuthState,
    FormData
  >(resendConfirmationEmail, null);

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
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
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

        <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.ink, margin: "0 0 12px" }}>
          Check your email
        </h1>

        {!email ? (
          <p style={{ fontSize: 14.5, color: colors.inkMuted, lineHeight: 1.6 }}>
            We couldn&apos;t tell which account this is for.{" "}
            <Link href="/signup" style={{ color: colors.brand, fontWeight: 600 }}>Start sign-up again</Link>.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 14.5, color: colors.inkMuted, lineHeight: 1.65, margin: "0 0 8px" }}>
              We&apos;ve sent a confirmation link to{" "}
              <strong style={{ color: colors.ink }}>{email}</strong>.
            </p>
            <p style={{ fontSize: 14.5, color: colors.inkMuted, lineHeight: 1.65, margin: "0 0 28px" }}>
              Open it to activate your account, you&apos;ll be signed in automatically.
            </p>

            <div
              style={{
                background: colors.surface,
                border: `1px solid ${colors.borderStrong}`,
                borderRadius: radius.md,
                padding: "16px 18px",
                fontSize: 13.5,
                color: colors.inkMuted,
                lineHeight: 1.6,
                textAlign: "start",
                marginBottom: 24,
              }}
            >
              Didn&apos;t get it? Check your spam folder, or resend the link below. It
              can take a minute or two to arrive.
            </div>

            <form action={resendAction}>
              <input type="hidden" name="email" value={email} />
              <button
                type="submit"
                disabled={resending}
                style={{
                  width: "100%",
                  padding: "13px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  background: colors.brand,
                  border: 0,
                  borderRadius: radius.pill,
                  cursor: resending ? "default" : "pointer",
                  opacity: resending ? 0.7 : 1,
                  boxShadow: shadow.brand,
                }}
              >
                {resending ? "Sending…" : "Resend confirmation link"}
              </button>
            </form>

            {resendState?.notice && (
              <div style={{ fontSize: 13.5, color: "#1E6B4E", background: "#E8F6EF", border: "1px solid #B6E3CD", padding: "10px 13px", borderRadius: radius.sm, marginTop: 14 }}>
                {resendState.notice}
              </div>
            )}
            {resendState?.error && (
              <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginTop: 14 }}>
                {resendState.error}
              </div>
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
