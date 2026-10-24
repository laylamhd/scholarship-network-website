/**
 * tbhf-reminders — AWS Lambda function, invoked every hour by Amazon
 * EventBridge Scheduler. It replaces the pg_cron job the site had on Supabase:
 * it calls public.sweep_event_reminders(), which creates the in-app reminders
 * for events that start soon and skips any reminder already sent.
 *
 * Runs inside the VPC (private subnets) so it can reach the private RDS
 * database. It logs in as the website's own role (tbhf_app) and switches to
 * service_role for this one transaction, exactly like the web servers do.
 * The password is read from AWS Secrets Manager at cold start.
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const sm = new SecretsManagerClient({});
let pool;

async function getPool() {
  if (pool) return pool;
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_PASSWORD_SECRET_ARN }));
  pool = new pg.Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE ?? "tbhf",
    user: process.env.PGUSER ?? "tbhf_app",
    password: secret.SecretString,
    ssl: { ca: readFileSync(new URL("./rds-ca.pem", import.meta.url), "utf8"), rejectUnauthorized: true },
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  return pool;
}

export async function handler() {
  const client = await (await getPool()).connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE service_role");
    await client.query("select set_config('request.jwt.claim.role', 'service_role', true)");
    // Only one sweep at a time, even if a run is retried while another is active.
    const lock = await client.query("select pg_try_advisory_xact_lock(724001) as ok");
    let sent = 0;
    if (lock.rows[0]?.ok) {
      sent = (await client.query("select public.sweep_event_reminders() as n")).rows[0]?.n ?? 0;
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ msg: "reminder sweep finished", sent, locked: !lock.rows[0]?.ok }));
    return { sent };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("reminder sweep failed:", err.message);
    throw err; // marks the invocation as failed -> CloudWatch alarm on Errors
  } finally {
    client.release();
  }
}
