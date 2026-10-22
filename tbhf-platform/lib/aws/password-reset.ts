import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { withRole } from "./db";
import { sendMail } from "./mailer";

/**
 * "Forgot password" by e-mail (AWS account edition, sent with Amazon SES).
 *
 *  - The link carries a random 256-bit token; the database stores only its
 *    SHA-256 hash, so a database leak cannot be used to reset passwords.
 *  - A token works once and expires after 60 minutes.
 *  - At most 3 links per account per hour.
 *  - The answer is the same whether or not the e-mail has an account
 *    (no account enumeration).
 *  - A successful reset bumps token_version (logs out every old session) and
 *    clears any login lockout.
 */
const TTL_MINUTES = 60;
const MAX_PER_HOUR = 3;
const MIN_PASSWORD = 8;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const service = <T>(fn: (q: (sql: string, p?: unknown[]) => Promise<Record<string, unknown>[]>) => Promise<T>) =>
  withRole("service_role", null, (c) => fn(async (sql, p) => (await c.query(sql, p)).rows));

/** The site's own address for links in e-mails. Never taken from the request's
 *  Host header, which an attacker could set to their own domain. */
function siteUrl(): string | null {
  const u = process.env.SITE_URL?.replace(/\/+$/, "");
  return u && /^https?:\/\//.test(u) ? u : null;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const addr = String(email ?? "").trim().toLowerCase();
  const base = siteUrl();
  if (!addr || !base) {
    if (!base) console.warn("[reset] SITE_URL is not set — cannot build reset links");
    return;
  }
  const token = randomBytes(32).toString("base64url");
  const sent = await service(async (q) => {
    const [user] = await q("select id from auth.users where email = $1", [addr]);
    if (!user) return false;
    const [recent] = await q(
      "select count(*)::int as n from auth.password_resets where user_id = $1 and created_at > now() - interval '1 hour'",
      [user.id]);
    if ((recent?.n as number) >= MAX_PER_HOUR) return false;
    await q(
      `insert into auth.password_resets (token_hash, user_id, expires_at)
       values ($1, $2, now() + make_interval(mins => $3))`,
      [sha256(token), user.id, TTL_MINUTES]);
    return true;
  });
  if (!sent) return;

  const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail(
    addr,
    "Reset your TBHF Scholars Network password",
    `Someone asked to reset the password for this e-mail address on the TBHF Scholars Network.\n\n` +
      `To choose a new password, open this link within ${TTL_MINUTES} minutes:\n${link}\n\n` +
      `If you did not ask for this, you can ignore this e-mail — your password stays the same.`,
    `<p>Someone asked to reset the password for this e-mail address on the TBHF Scholars Network.</p>` +
      `<p><a href="${link}">Choose a new password</a> (the link works once, for ${TTL_MINUTES} minutes).</p>` +
      `<p>If you did not ask for this, you can ignore this e-mail — your password stays the same.</p>`,
  );
}

export type ResetResult = { ok: true } | { ok: false; error: string };

export async function resetPassword(token: string, password: string): Promise<ResetResult> {
  if (!token) return { ok: false, error: "This reset link is invalid." };
  if (String(password ?? "").length < MIN_PASSWORD) {
    return { ok: false, error: `Your new password needs at least ${MIN_PASSWORD} characters.` };
  }
  const hash = await bcrypt.hash(password, 10);
  return service(async (q) => {
    // Claim the token atomically so it can only ever be used once.
    const [row] = await q(
      `update auth.password_resets set used_at = now()
       where token_hash = $1 and used_at is null and expires_at > now()
       returning user_id`, [sha256(token)]);
    if (!row) return { ok: false, error: "This reset link has expired or was already used. Ask for a new one." } as ResetResult;
    await q(
      `update auth.users set encrypted_password = $2, token_version = token_version + 1,
         failed_logins = 0, locked_until = null, updated_at = now()
       where id = $1`, [row.user_id, hash]);
    // Any other outstanding links for this account stop working too.
    await q("update auth.password_resets set used_at = now() where user_id = $1 and used_at is null", [row.user_id]);
    return { ok: true } as ResetResult;
  });
}
