import { Pool, types, type PoolClient } from "pg";
import { readFileSync } from "node:fs";

/**
 * PostgreSQL connection pool for Amazon RDS.
 *
 * The website logs in as `tbhf_app`, a role that owns nothing and can read
 * nothing on its own. Every request runs inside a transaction that switches
 * to one of the API roles the database's Row Level Security policies were
 * written for, and records who the user is:
 *
 *     SET LOCAL ROLE authenticated;                       -- or anon / service_role
 *     SELECT set_config('request.jwt.claim.sub', <user id>, true);
 *
 * `auth.uid()` (deploy/aws/db/00-bootstrap.sql) reads that setting, so the
 * 200+ existing RLS policies keep working exactly as they did on Supabase.
 */

// --- Make results look like the JSON the app used to get from Supabase ---
// timestamptz / timestamp → ISO-8601 strings ("2026-07-01T06:30:10.21+00:00")
const isoTimestamp = (v: string) =>
  v.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00");
types.setTypeParser(1184, isoTimestamp); // timestamptz
types.setTypeParser(1114, (v: string) => v.replace(" ", "T")); // timestamp
types.setTypeParser(1082, (v: string) => v); // date → "YYYY-MM-DD" (not a JS Date)
types.setTypeParser(1700, (v: string) => Number(v)); // numeric → number
types.setTypeParser(20, (v: string) => Number(v)); // bigint (count(*)) → number

export type DbRole = "anon" | "authenticated" | "service_role";

let pool: Pool | null = null;

function sslConfig() {
  const mode = process.env.PGSSLMODE ?? (process.env.NODE_ENV === "production" ? "require" : "disable");
  if (mode === "disable") return false;
  const caFile = process.env.PGSSLROOTCERT; // RDS CA bundle (downloaded at boot)
  if (caFile) {
    try {
      return { ca: readFileSync(caFile, "utf8"), rejectUnauthorized: true };
    } catch {
      console.warn(`[db] cannot read PGSSLROOTCERT=${caFile}; using TLS without CA verification`);
    }
  }
  return { rejectUnauthorized: false };
}

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    pool = new Pool({
      connectionString: url,
      ssl: sslConfig(),
      max: Number(process.env.PG_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => console.error("[db] idle client error:", err.message));
  }
  return pool;
}

/**
 * Run `fn` in one transaction as `role`, with auth.uid() = `userId`.
 * The role switch is LOCAL to the transaction, so a pooled connection is
 * never left with someone else's identity.
 */
export async function withRole<T>(
  role: DbRole,
  userId: string | null,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // Role names come from the fixed DbRole union, never from user input.
    await client.query(`SET LOCAL ROLE ${role}`);
    await client.query(
      "SELECT set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)",
      [userId ?? "", role],
    );
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
