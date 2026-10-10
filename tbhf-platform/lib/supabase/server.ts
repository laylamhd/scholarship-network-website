import { cookies } from "next/headers";
import { Auth } from "@/lib/aws/auth";
import { QueryBuilder, type Identity } from "@/lib/aws/postgrest";
import { RpcCall } from "@/lib/aws/rpc";
import { StorageBucket } from "@/lib/aws/storage";
import { SESSION_COOKIE, verifySession } from "@/lib/aws/session";

/**
 * Data-access client for Server Components, Server Actions and Route Handlers.
 *
 * AWS deployment: this used to create a Supabase client. It now returns an
 * object with the SAME shape (`from`, `rpc`, `auth`, `storage`), backed by
 * Amazon RDS for PostgreSQL and Amazon S3 (see lib/aws/*). Every page and
 * action that calls `createClient()` keeps working without changes.
 */
export async function createClient() {
  const jar = await cookies();

  // Who is asking? Verified from the signed session cookie once per client.
  let identity: Promise<Identity> | null = null;
  const who = () =>
    (identity ??= verifySession(jar.get(SESSION_COOKIE)?.value).then((c) =>
      c ? { role: "authenticated" as const, userId: c.sub } : { role: "anon" as const, userId: null },
    ));

  return {
    from: (table: string) => new QueryBuilder(table, who),
    rpc: (fn: string, args: Record<string, unknown> = {}) => new RpcCall(fn, args, who),
    auth: new Auth(jar),
    storage: { from: (bucket: string) => new StorageBucket(bucket, who) },
  };
}
