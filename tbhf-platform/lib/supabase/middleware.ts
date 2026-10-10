import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, cookieOptions, shouldRenew, signSession, verifySession } from "@/lib/aws/session";

// SECURITY (R3-01): a nonce-based Content-Security-Policy. The old CSP allowed
// `script-src 'unsafe-inline'`, which let any HTML-injection foothold run as a
// script. Here every response instead carries a fresh per-request nonce and
// `'strict-dynamic'`, so only Next's own nonce-stamped bootstrap script (and the
// chunks it loads) can execute — inline injected scripts cannot. The CSP is built
// per request (nonce must be unique), which is why it lives here and not in the
// static `next.config.ts` headers. `style-src 'unsafe-inline'` is retained: the UI
// renders React inline `style={{…}}` attributes, which nonces don't cover and
// which can't execute code (low risk). Applied in production only — dev keeps
// stock Next responses so Turbopack/HMR is never disturbed.
const isProd = process.env.NODE_ENV === "production";

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    // AWS deployment: files are served by this site at /media/..., and the
    // browser only talks to this origin — no third-party hosts needed.
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "connect-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Checks the session cookie on every request and gates protected routes.
 * Called from the root middleware.ts (proxy.ts).
 */
export async function updateSession(request: NextRequest) {
  // Fresh nonce per request; forwarded to Next via the request's CSP header so it
  // stamps the same nonce onto its inline bootstrap/hydration scripts.
  const nonce = isProd ? btoa(crypto.randomUUID()) : "";
  const csp = isProd ? buildCsp(nonce) : "";

  // Build the request headers Next will see. Rebuilt again inside setAll below so
  // a refreshed auth cookie and these CSP/nonce headers are forwarded together.
  const buildRequestHeaders = () => {
    const h = new Headers(request.headers);
    if (isProd) {
      h.set("x-nonce", nonce);
      h.set("content-security-policy", csp);
    }
    return h;
  };

  // Set the enforced CSP on whatever response we ultimately return.
  const withCsp = <T extends NextResponse>(res: T): T => {
    if (isProd) res.headers.set("content-security-policy", csp);
    return res;
  };

  const supabaseResponse = NextResponse.next({
    request: { headers: buildRequestHeaders() },
  });

  // AWS deployment: the session is our own signed cookie (lib/aws/session.ts).
  // Verifying it is a local signature check — no database round trip, the
  // same trade-off the Supabase version made with getClaims(). Data access is
  // still re-checked by Row Level Security on every query.
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (user && shouldRenew(user)) {
    // Sliding expiry: re-issue a fresh 7-day cookie for active members.
    const token = await signSession({ id: user.sub, email: user.email, tokenVersion: user.tv });
    supabaseResponse.cookies.set(SESSION_COOKIE, token, cookieOptions());
  }

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/verify-email") ||
    path.startsWith("/admin-access");
  // auth callback handlers, and /media (the file route enforces its own rules)
  const isPublicAsset = path.startsWith("/auth") || path.startsWith("/media/");

  // Not signed in and trying to reach a protected page -> send to /login
  if (!user && !isAuthRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withCsp(NextResponse.redirect(url));
  }

  // Already signed in and visiting login/signup -> send to home. /admin-access is
  // deliberately excluded: a just-confirmed member returns there (signed in) to
  // enter their access code and redeem the admin role (pentest PT3-02).
  const isLoginOrSignup = path.startsWith("/login") || path.startsWith("/signup");
  if (user && isLoginOrSignup) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return withCsp(NextResponse.redirect(url));
  }

  return withCsp(supabaseResponse);
}
