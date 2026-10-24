import "server-only";
import { withRole } from "./db";
import { getMeta } from "./meta";
import type { Identity, PostgrestError, PostgrestResult } from "./postgrest";

/**
 * supabase.rpc("fn", { p_arg: value }) → SELECT … FROM public.fn(p_arg => $1::type)
 *
 * The function signature is read from the database, so each argument is cast
 * to its declared type, json/jsonb arguments are serialised, and the result is
 * shaped the way PostgREST shapes it: scalar → the value, set/table → array of
 * rows, row type → one object, void → null.
 */
const IDENT = /^[a-z_][a-z0-9_]*$/;

export class RpcCall<T = any> implements PromiseLike<PostgrestResult<T>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  private singleMode: "one" | "maybe" | null = null;

  constructor(private fn: string, private args: Record<string, unknown>, private who: () => Promise<Identity>) {}

  single() { this.singleMode = "one"; return this; }
  maybeSingle() { this.singleMode = "maybe"; return this; }

  then<A = PostgrestResult<T>, B = never>(
    onfulfilled?: ((value: PostgrestResult<T>) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.execute().then(onfulfilled, onrejected);
  }

  async execute(): Promise<PostgrestResult<T>> {
    try {
      if (!IDENT.test(this.fn)) throw Object.assign(new Error(`invalid function name`), { code: "PGRST100" });
      const meta = await getMeta();
      const candidates = meta.functions.get(this.fn) ?? [];
      const keys = Object.keys(this.args).filter((k) => this.args[k] !== undefined);
      // Pick the overload whose argument names cover every key we were given.
      const fn = candidates.find((f) => keys.every((k) => f.argNames.includes(k)));
      if (!fn) {
        throw Object.assign(new Error(`Could not find the function public.${this.fn}(${keys.join(", ")})`), { code: "PGRST202" });
      }
      const params: unknown[] = [];
      const argSql = keys.map((k) => {
        const type = fn.argTypes[fn.argNames.indexOf(k)];
        let v = this.args[k];
        if ((type === "jsonb" || type === "json") && v !== null) v = JSON.stringify(v);
        params.push(v);
        return `"${k}" => $${params.length}::${type}`;
      });
      const call = `public."${this.fn}"(${argSql.join(", ")})`;
      const composite = fn.returnsSet || fn.returnsComposite;
      const sql = composite ? `SELECT * FROM ${call}` : `SELECT ${call} AS v`;

      const who = await this.who();
      const rows = await withRole(who.role, who.userId, async (c) => (await c.query(sql, params)).rows);

      let data: unknown;
      if (!composite) data = fn.returnType === "void" ? null : rows[0]?.v ?? null;
      else if (fn.returnsSet) data = rows;
      else data = rows[0] ?? null;

      if (this.singleMode && Array.isArray(data)) {
        if (data.length === 1) data = data[0];
        else if (data.length === 0 && this.singleMode === "maybe") data = null;
        else return { data: null, count: null, status: 406, statusText: "Not Acceptable",
          error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116", details: null, hint: null } };
      }
      return { data: data as T, error: null, count: null, status: 200, statusText: "OK" };
    } catch (e) {
      const err = e as { message?: string; code?: string; detail?: string; hint?: string };
      const error: PostgrestError = { message: err.message ?? String(e), code: err.code ?? "PGRST000", details: err.detail ?? null, hint: err.hint ?? null };
      return { data: null, error, count: null, status: 400, statusText: "Bad Request" };
    }
  }
}
