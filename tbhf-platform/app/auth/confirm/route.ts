import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Email-confirmation / magic-link landing route (SECURITY pentest PT3-02).
 *
 * With email confirmation enabled, Supabase emails a link that lands here so the
 * server can establish the session cookie. Supports both flows:
 *   - token_hash + type  (verifyOtp)      — used if the email template links to
 *                                            /auth/confirm?token_hash=...&type=email
 *   - code               (PKCE exchange)  — the default template's redirect
 * On success we redirect to `next` (an internal path only); on failure to /login.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = ok ? next : "/login";
  if (!ok) url.searchParams.set("error", "confirm");
  return NextResponse.redirect(url);
}

/**
 * Only allow redirects to internal paths (open-redirect guard). `next` comes
 * straight from the URL, so reject absolute URLs and protocol-relative paths.
 */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/welcome";
}
