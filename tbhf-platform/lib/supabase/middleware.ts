import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "media-src 'self' https://*.supabase.co",
    "worker-src 'self' blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Refreshes the Supabase auth session on every request and gates protected routes.
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

  let supabaseResponse = NextResponse.next({
    request: { headers: buildRequestHeaders() },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // buildRequestHeaders() snapshots request.headers *after* the cookie
          // writes above (RequestCookies is backed by the cookie header), so the
          // refreshed session and the CSP/nonce headers are forwarded together.
          supabaseResponse = NextResponse.next({
            request: { headers: buildRequestHeaders() },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and the auth call.
  // getClaims() verifies the session JWT's signature locally (the project uses an
  // asymmetric ES256 signing key), avoiding the ~185ms network round trip that
  // getUser() makes on every request. It still refreshes an about-to-expire
  // session (writing new cookies via setAll above), and forged tokens are
  // rejected. A signed-out token remains accepted for navigation until it
  // expires — the same signature-based check the database RLS already applies to
  // every query, so this doesn't widen data access.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/verify-email") ||
    path.startsWith("/admin-access");
  const isPublicAsset = path.startsWith("/auth"); // auth callback handlers

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
