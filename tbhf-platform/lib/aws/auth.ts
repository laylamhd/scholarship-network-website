import "server-only";
import bcrypt from "bcryptjs";
import { withRole } from "./db";
import { SESSION_COOKIE, cookieOptions, signSession, verifySession, type SessionClaims } from "./session";

/**
 * Server-side auth with the same method names and result shapes as Supabase
 * Auth (supabase.auth.*), backed by the auth.users table in RDS.
 *
 *  - Passwords are stored only as bcrypt hashes (cost 10).
 *  - A session is a signed, HttpOnly cookie (see session.ts).
 *  - 5 wrong passwords lock the account for 15 minutes (brute-force guard).
 *  - Changing the password bumps token_version, which logs out every other
 *    browser that still holds an old session cookie.
 *  - There is no mail server in the lab, so sign-ups are confirmed at once and
 *    the e-mail confirmation methods return a clear "not available" error.
 */

export type CookieJar = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
};

export type AuthUser = {
  id: string;
  email: string;
  aud: "authenticated";
  role: "authenticated";
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
};
export type AuthError = { message: string; code: string; status: number; name: "AuthApiError" };

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const MIN_PASSWORD = 8;
// Compared against when the e-mail is unknown, so the response takes as long
// as a real check and timing doesn't reveal which e-mails have accounts.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser-not-a-password", 10);

const authError = (message: string, code: string, status = 400): AuthError =>
  ({ message, code, status, name: "AuthApiError" });

type Row = {
  id: string; email: string; encrypted_password: string; created_at: string;
  email_confirmed_at: string | null; last_sign_in_at: string | null;
  raw_user_meta_data: Record<string, unknown>; raw_app_meta_data: Record<string, unknown>;
  token_version: number; failed_logins: number; locked_until: string | null;
};

const toUser = (r: Row): AuthUser => ({
  id: r.id,
  email: r.email,
  aud: "authenticated",
  role: "authenticated",
  created_at: r.created_at,
  email_confirmed_at: r.email_confirmed_at,
  last_sign_in_at: r.last_sign_in_at,
  user_metadata: r.raw_user_meta_data ?? {},
  app_metadata: { provider: "email", providers: ["email"], ...(r.raw_app_meta_data ?? {}) },
});

const service = <T>(fn: (q: (sql: string, p?: unknown[]) => Promise<Row[]>) => Promise<T>) =>
  withRole("service_role", null, (c) => fn(async (sql, p) => (await c.query(sql, p)).rows as Row[]));

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export class Auth {
  constructor(private jar: CookieJar) {}

  private setCookie(token: string) {
    try { this.jar.set(SESSION_COOKIE, token, cookieOptions()); } catch { /* read-only context (Server Component) */ }
  }
  private clearCookie() {
    try { this.jar.delete(SESSION_COOKIE); } catch { /* read-only context */ }
  }
  private async startSession(r: Row) {
    const token = await signSession({ id: r.id, email: r.email, tokenVersion: r.token_version });
    this.setCookie(token);
    return { access_token: token, token_type: "bearer", user: toUser(r) };
  }

  /** Verify the cookie's signature only (no database) — like Supabase getClaims(). */
  async getClaims(): Promise<{ data: { claims: SessionClaims } | null; error: AuthError | null }> {
    const claims = await verifySession(this.jar.get(SESSION_COOKIE)?.value);
    return claims ? { data: { claims }, error: null } : { data: null, error: authError("Auth session missing!", "session_not_found", 401) };
  }

  /** The signed-in user, re-checked against the database on every call. */
  async getUser(): Promise<{ data: { user: AuthUser | null }; error: AuthError | null }> {
    const claims = await verifySession(this.jar.get(SESSION_COOKIE)?.value);
    if (!claims) return { data: { user: null }, error: authError("Auth session missing!", "session_not_found", 401) };
    const rows = await service((q) => q("select * from auth.users where id = $1", [claims.sub]));
    const r = rows[0];
    if (!r || r.token_version !== claims.tv) {
      return { data: { user: null }, error: authError("Session expired", "session_expired", 401) };
    }
    return { data: { user: toUser(r) }, error: null };
  }

  async getSession() {
    const claims = await verifySession(this.jar.get(SESSION_COOKIE)?.value);
    return { data: { session: claims ? { access_token: this.jar.get(SESSION_COOKIE)?.value, expires_at: claims.exp } : null }, error: null };
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const fail = () => ({ data: { user: null, session: null }, error: authError("Invalid login credentials", "invalid_credentials") });
    const addr = String(email ?? "").trim().toLowerCase();
    const rows = await service((q) => q("select * from auth.users where email = $1", [addr]));
    const r = rows[0];
    if (!r) { await bcrypt.compare(String(password ?? ""), DUMMY_HASH); return fail(); }

    if (r.locked_until && new Date(r.locked_until) > new Date()) {
      return { data: { user: null, session: null }, error: authError("Too many login attempts. Try again later.", "over_request_rate_limit", 429) };
    }
    const good = await bcrypt.compare(String(password ?? ""), r.encrypted_password);
    if (!good) {
      await service((q) => q(
        `update auth.users set failed_logins = failed_logins + 1,
           locked_until = case when failed_logins + 1 >= $2 then now() + make_interval(mins => $3) else locked_until end
         where id = $1`, [r.id, MAX_FAILED, LOCK_MINUTES]));
      return fail();
    }
    const [fresh] = await service((q) => q(
      "update auth.users set failed_logins = 0, locked_until = null, last_sign_in_at = now() where id = $1 returning *", [r.id]));
    return { data: { user: toUser(fresh), session: await this.startSession(fresh) }, error: null };
  }

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }) {
    const addr = String(email ?? "").trim().toLowerCase();
    if (!isEmail(addr)) return { data: { user: null, session: null }, error: authError("Unable to validate email address: invalid format", "email_address_invalid") };
    if (String(password ?? "").length < MIN_PASSWORD) {
      return { data: { user: null, session: null }, error: authError(`Password should be at least ${MIN_PASSWORD} characters.`, "weak_password", 422) };
    }
    const hash = await bcrypt.hash(password, 10);
    try {
      // The on_auth_user_created trigger creates the matching profiles row.
      const [r] = await service((q) => q(
        `insert into auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
         values ($1, $2, now(), $3::jsonb) returning *`,
        [addr, hash, JSON.stringify(options?.data ?? {})]));
      return { data: { user: toUser(r), session: await this.startSession(r) }, error: null };
    } catch (e) {
      if ((e as { code?: string }).code === "23505") {
        return { data: { user: null, session: null }, error: authError("User already registered", "user_already_exists", 422) };
      }
      throw e;
    }
  }

  async signOut() {
    this.clearCookie();
    return { error: null };
  }

  async updateUser(attrs: { email?: string; password?: string; data?: Record<string, unknown> }) {
    const { data: { user } } = await this.getUser();
    if (!user) return { data: { user: null }, error: authError("Auth session missing!", "session_not_found", 401) };

    if (attrs.password !== undefined) {
      if (attrs.password.length < MIN_PASSWORD) {
        return { data: { user: null }, error: authError(`Password should be at least ${MIN_PASSWORD} characters.`, "weak_password", 422) };
      }
      const hash = await bcrypt.hash(attrs.password, 10);
      const [r] = await service((q) => q(
        `update auth.users set encrypted_password = $2, token_version = token_version + 1, updated_at = now()
         where id = $1 returning *`, [user.id, hash]));
      await this.startSession(r); // keep THIS browser signed in with the new token version
    }
    if (attrs.email !== undefined) {
      const addr = attrs.email.trim().toLowerCase();
      if (!isEmail(addr)) return { data: { user: null }, error: authError("Unable to validate email address: invalid format", "email_address_invalid") };
      try {
        const [r] = await service((q) => q("update auth.users set email = $2, updated_at = now() where id = $1 returning *", [user.id, addr]));
        // Keep the profile's copy of the e-mail in step (allowed by the member's own RLS policy).
        await withRole("authenticated", user.id, (c) => c.query("update public.profiles set email = $2 where id = $1", [user.id, addr]));
        await this.startSession(r);
      } catch (e) {
        if ((e as { code?: string }).code === "23505") return { data: { user: null }, error: authError("A user with this email address has already been registered", "email_exists", 422) };
        throw e;
      }
    }
    if (attrs.data) {
      await service((q) => q("update auth.users set raw_user_meta_data = raw_user_meta_data || $2::jsonb where id = $1", [user.id, JSON.stringify(attrs.data)]));
    }
    return this.getUser();
  }

  // ---- E-mail based flows: no mail server in the lab, sign-ups are auto-confirmed ----
  private noEmail() {
    return { data: { user: null, session: null }, error: authError("E-mail confirmation is not used on this deployment — accounts are confirmed at sign-up.", "email_provider_disabled") };
  }
  async resend(_: unknown) { return this.noEmail(); } // eslint-disable-line @typescript-eslint/no-unused-vars
  async verifyOtp(_: unknown) { return this.noEmail(); } // eslint-disable-line @typescript-eslint/no-unused-vars
  async exchangeCodeForSession(_: unknown) { return this.noEmail(); } // eslint-disable-line @typescript-eslint/no-unused-vars
}
