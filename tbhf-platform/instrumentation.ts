/**
 * Runs once when each server process starts.
 *
 * AWS deployment: on Supabase, pg_cron ran public.sweep_event_reminders()
 * every hour. Amazon RDS has no pg_cron without a custom parameter group, and
 * the sandbox blocks Lambda/EventBridge, so the web servers run it themselves.
 * A transaction-level advisory lock makes sure only one server does the work
 * at a time; the function itself skips reminders that were already sent.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL && !process.env.PGHOST) return;
  // In the AWS account deployment an AWS Lambda function, run hourly by Amazon
  // EventBridge Scheduler, does this job instead (deploy/aws-account/lambda).
  if (process.env.REMINDERS_MODE === "external") return;
  const { withRole } = await import("./lib/aws/db");

  const sweep = async () => {
    try {
      const sent = await withRole("service_role", null, async (c) => {
        const lock = await c.query("select pg_try_advisory_xact_lock(724001) as ok");
        if (!lock.rows[0]?.ok) return 0;
        return (await c.query("select public.sweep_event_reminders() as n")).rows[0]?.n ?? 0;
      });
      if (sent) console.log(`[reminders] sent ${sent} event reminder(s)`);
    } catch (e) {
      console.error("[reminders] sweep failed:", e instanceof Error ? e.message : e);
    }
  };
  setTimeout(sweep, 60_000).unref?.();
  setInterval(sweep, 60 * 60 * 1000).unref?.();
}
