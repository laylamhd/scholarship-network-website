import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and gates protected routes.
 * Called from the root middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
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
    path.startsWith("/admin-access");
  const isPublicAsset = path.startsWith("/auth"); // auth callback handlers

  // Not signed in and trying to reach a protected page -> send to /login
  if (!user && !isAuthRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already signed in and visiting login/signup -> send to home. /admin-access is
  // deliberately excluded: a just-confirmed member returns there (signed in) to
  // enter their access code and redeem the admin role (pentest PT3-02).
  const isLoginOrSignup = path.startsWith("/login") || path.startsWith("/signup");
  if (user && isLoginOrSignup) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
