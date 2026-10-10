import { SignJWT, jwtVerify } from "jose";

/**
 * Session tokens (replaces Supabase Auth's JWT cookies).
 *
 * After a successful login the server sets ONE HttpOnly, Secure, SameSite=Lax
 * cookie holding a short JWT signed with SESSION_SECRET (HS256). JavaScript in
 * the browser can't read it, other sites can't send it on cross-site POSTs,
 * and it can't be forged without the secret. This file has no Node-only
 * imports, so the proxy (middleware) can verify sessions without a database
 * round trip — exactly like Supabase's getClaims() did.
 */

export const SESSION_COOKIE = "tbhf_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const RENEW_WHEN_LEFT_SECONDS = 60 * 60 * 24; // re-issue when < 1 day remains

export type SessionClaims = {
  sub: string; // user id
  email: string;
  role: "authenticated";
  tv: number; // auth.users.token_version at sign-in (password change → old sessions invalid)
  exp: number;
  iat: number;
};

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (at least 32 characters)");
  return new TextEncoder().encode(s);
}

export async function signSession(user: { id: string; email: string; tokenVersion: number }): Promise<string> {
  return new SignJWT({ email: user.email, role: "authenticated", tv: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer("tbhf")
    .setAudience("tbhf-web")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "tbhf",
      audience: "tbhf-web",
    });
    if (typeof payload.sub !== "string") return null;
    return payload as unknown as SessionClaims;
  } catch {
    return null; // expired, tampered or signed with another secret
  }
}

export function shouldRenew(claims: SessionClaims): boolean {
  return claims.exp - Math.floor(Date.now() / 1000) < RENEW_WHEN_LEFT_SECONDS;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
