"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { login, signup, type AuthState } from "./actions";
import { colors, gradients, radius, shadow } from "@/lib/theme";

const PORTALS = ["Palestine", "Lebanon", "Egypt", "Jordan"];

const ROLES = [
  { id: "scholar", label: "Student" },
  { id: "alumni", label: "Alumni" },
];

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

// Password inputs leave room on the trailing edge for the show/hide eye button.
const pwInputStyle: React.CSSProperties = { ...inputStyle, paddingInlineEnd: 46 };

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: colors.inkMuted,
  marginBottom: 7,
};

function EyeIcon({ on }: { on: boolean }) {
  return on ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l20 20" />
      <path d="M6.7 6.7C3.6 8.4 1.5 12 1.5 12S5 19 12 19c1.7 0 3.2-.4 4.5-1" />
      <path d="M9.9 5.2C10.6 5.1 11.3 5 12 5c7 0 10.5 7 10.5 7s-1 2-3 3.8" />
    </svg>
  );
}

/** Password input with an inline show/hide toggle. Controlled by the parent so
 *  the field can be cleared on error while name/email are preserved. */
function PwField({
  name,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
  minLength,
  inputRef,
}: {
  name: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle} htmlFor={name}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={minLength}
          autoComplete={autoComplete}
          ref={inputRef}
          style={pwInputStyle}
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          title={show ? "Hide" : "Show"}
          style={{
            position: "absolute",
            insetInlineEnd: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: 0,
            padding: 6,
            cursor: "pointer",
            color: colors.inkFaint,
            display: "flex",
          }}
        >
          <EyeIcon on={show} />
        </button>
      </div>
    </div>
  );
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const action = isSignup ? signup : login;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );
  const [portal, setPortal] = useState("Palestine");
  const [role, setRole] = useState("scholar");

  // Name + email are controlled so a failed submit keeps them (React 19 resets
  // uncontrolled fields after an action). Passwords are controlled too, but we
  // clear them on error — the user re-enters only the password, not everything.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const confirmRef = useRef<HTMLInputElement>(null);

  // On any server error, clear just the password fields.
  useEffect(() => {
    if (state?.error) {
      setPassword("");
      setConfirm("");
    }
  }, [state]);

  // Native "passwords must match" — blocks submit and shows the browser bubble
  // (belt-and-braces with the server-side check).
  useEffect(() => {
    const el = confirmRef.current;
    if (el) {
      el.setCustomValidity(
        confirm && confirm !== password ? "Passwords do not match" : "",
      );
    }
  }, [password, confirm]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#fff" }}>
      {/* ---- Left: welcome panel ---- */}
      <div
        style={{
          flex: "1 1 0",
          position: "relative",
          overflow: "hidden",
          background: gradients.heroSide,
          color: "#fff",
          padding: "0 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
        className="auth-hero"
      >
        <svg
          viewBox="0 0 480 600"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }}
        >
          <path d="M0 200 C80 150 150 280 260 200 C360 130 420 280 480 200" fill="none" stroke="#fff" strokeWidth="2.5" />
          <path d="M0 280 C80 230 150 360 260 280 C360 210 420 360 480 280" fill="none" stroke="#fff" strokeWidth="2.5" />
          <path d="M0 360 C80 310 150 440 260 360 C360 290 420 440 480 360" fill="none" stroke="#fff" strokeWidth="2.5" />
        </svg>

        <div style={{ paddingTop: 56 }} />

        <div style={{ position: "relative", paddingBottom: 56 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: shadow.avatar,
              marginBottom: 22,
            }}
          >
            <Image src="/tbhf-mark.png" alt="TBHF" width={56} height={56} style={{ objectFit: "contain" }} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.2 }}>
            Welcome to your
            <br />
            scholars network
          </div>
          <div style={{ fontSize: 15.5, opacity: 0.92, marginTop: 16, maxWidth: 360, lineHeight: 1.6 }}>
            Find resources, opportunities and a community that understands.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 28, fontSize: 13, opacity: 0.9 }}>
            <span>Powered by</span>
            <span style={{ background: "rgba(255,255,255,.18)", padding: "7px 12px", borderRadius: radius.sm, fontWeight: 600 }}>
              The Big Heart Foundation
            </span>
          </div>
        </div>
      </div>

      {/* ---- Right: form ---- */}
      <div
        style={{
          flex: "1 1 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 40px",
        }}
      >
        <form action={formAction} style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ fontSize: 14.5, color: colors.inkFaint, marginBottom: 6 }}>
            {isSignup ? "Create your account" : "Sign in to continue"}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "0 0 26px" }}>
            {isSignup ? "Join the network" : "Welcome back"}
          </h1>

          {isSignup && (
            <>
              {/* Portal picker */}
              <label style={labelStyle}>Choose your portal</label>
              <input type="hidden" name="portal" value={portal} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {PORTALS.map((p) => {
                  const active = portal === p;
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPortal(p)}
                      style={{
                        textAlign: "start",
                        padding: "12px 14px",
                        borderRadius: radius.md,
                        cursor: "pointer",
                        background: active ? colors.tintBlue : colors.surface,
                        border: `1.5px solid ${active ? colors.brand : colors.borderStrong}`,
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: active ? colors.brandDeep : colors.ink }}>{p}</div>
                    </button>
                  );
                })}
              </div>

              <input type="hidden" name="role" value={role} />
              <label style={labelStyle}>I am joining as</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {ROLES.map((r) => {
                  const active = role === r.id;
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      style={{
                        textAlign: "center",
                        padding: "11px 8px",
                        borderRadius: radius.md,
                        cursor: "pointer",
                        background: active ? colors.tintBlue : colors.surface,
                        border: `1.5px solid ${active ? colors.brand : colors.borderStrong}`,
                        color: active ? colors.brandDeep : colors.ink,
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="full_name">Full name</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  placeholder="e.g. Layla Haddad"
                  style={inputStyle}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <PwField
            name="password"
            label="Password"
            placeholder={isSignup ? "At least 8 characters" : "••••••••"}
            value={password}
            onChange={setPassword}
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 8 : undefined}
          />

          {isSignup && (
            <PwField
              name="confirm_password"
              label="Confirm password"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              inputRef={confirmRef}
            />
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
            {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>

          <div style={{ marginTop: 20, fontSize: 14, color: colors.inkMuted, textAlign: "center" }}>
            {isSignup ? (
              <>Already a member? <Link href="/login" style={{ color: colors.brand, fontWeight: 600 }}>Sign in</Link></>
            ) : (
              <>New scholar? <Link href="/signup" style={{ color: colors.brand, fontWeight: 600 }}>Create an account</Link></>
            )}
          </div>
        </form>
      </div>

      <style>{`@media (max-width: 760px){ .auth-hero{ display:none !important; } }`}</style>
    </div>
  );
}
