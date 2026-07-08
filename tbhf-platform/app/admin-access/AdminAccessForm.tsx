"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { adminSignup, redeemAdminCode, type AuthState } from "../login/actions";
import { Icon } from "@/components/Icon";
import { colors, gradients, radius, shadow } from "@/lib/theme";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  fontSize: 15,
  color: colors.ink,
  background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`,
  borderRadius: radius.md,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: colors.inkMuted,
  marginBottom: 7,
};

export default function AdminAccessForm({ authed }: { authed: boolean }) {
  // Signed in (just confirmed) -> redeem the code. Otherwise -> create the account.
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    authed ? redeemAdminCode : adminSignup,
    null,
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        action={formAction}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: gradients.hero,
            color: "#fff",
            padding: "30px 32px 26px",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: shadow.avatar,
              marginBottom: 16,
            }}
          >
            <Image src="/tbhf-mark.png" alt="TBHF" width={38} height={38} style={{ objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 21, fontWeight: 700 }}>
            <Icon name="award" size={20} /> Admin access
          </div>
          <div style={{ fontSize: 14, opacity: 0.94, marginTop: 8, lineHeight: 1.55 }}>
            {authed
              ? "You're signed in. Enter the access code provided by the platform owner to activate admin access on your account."
              : "Restricted. Enter the access code provided by the platform owner to create an administrator account."}
          </div>
        </div>

        <div style={{ padding: "26px 32px 30px" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="code">Admin access code</label>
            <input id="code" name="code" type="password" placeholder="••••••••" style={inputStyle} required />
          </div>

          {!authed && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="full_name">Full name</label>
                <input id="full_name" name="full_name" type="text" placeholder="e.g. Layla Haddad" style={inputStyle} required />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="email">Email</label>
                <input id="email" name="email" type="email" placeholder="name@example.com" style={inputStyle} required />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle} htmlFor="password">Password</label>
                <input id="password" name="password" type="password" placeholder="••••••••" style={inputStyle} required />
              </div>
            </>
          )}

          {state?.error && (
            <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, margin: "14px 0 0" }}>
              {state.error}
            </div>
          )}

          {state?.notice && (
            <div style={{ fontSize: 13.5, color: "#1E6B4E", background: "#E8F6EF", border: "1px solid #B6E3CD", padding: "12px 14px", borderRadius: radius.sm, margin: "14px 0 0", lineHeight: 1.5 }}>
              {state.notice}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              width: "100%",
              marginTop: 22,
              padding: "14px",
              fontSize: 15.5,
              fontWeight: 700,
              color: "#fff",
              background: colors.brand,
              border: 0,
              borderRadius: radius.pill,
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.7 : 1,
              boxShadow: shadow.brand,
            }}
          >
            {pending
              ? "Please wait…"
              : authed
                ? "Activate admin access"
                : "Create admin account"}
          </button>

          <div style={{ marginTop: 18, fontSize: 14, color: colors.inkMuted, textAlign: "center" }}>
            {authed ? (
              <Link href="/" style={{ color: colors.brand, fontWeight: 600 }}>Back to home</Link>
            ) : (
              <>Already an admin? <Link href="/login" style={{ color: colors.brand, fontWeight: 600 }}>Sign in</Link></>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
