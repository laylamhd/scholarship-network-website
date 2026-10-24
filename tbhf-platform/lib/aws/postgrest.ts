import "server-only";
import type { PoolClient } from "pg";
import { withRole, type DbRole } from "./db";
import { getMeta, type Meta, type Table, type ForeignKey } from "./meta";

/**
 * A small, Supabase-compatible query builder that talks to RDS directly.
 *
 * The app was written against supabase-js (`supabase.from("t").select(...)
 * .eq(...)`, `supabase.rpc("fn", {...})`). Instead of rewriting ~230 queries
 * by hand, this class implements the subset of that API the app uses and
 * turns each call into ONE parameterised SQL statement:
 *
 *   select (incl. embedded relations `profiles!fk(id, full_name)`, count/head),
 *   insert / update / upsert / delete (+ .select() for RETURNING),
 *   eq neq gt gte lt lte like ilike is in contains match not or filter,
 *   order, limit, range, single, maybeSingle, and rpc().
 *
 * Safety: identifiers are only ever taken from the live schema metadata
 * (unknown table/column → error), and every value is a bind parameter ($1…),
 * so nothing user-supplied is concatenated into SQL. Each statement runs as
 * `authenticated`/`anon` inside withRole(), so Row Level Security applies.
 */

export type PostgrestError = { message: string; code: string; details: string | null; hint: string | null };
export type PostgrestResult<T = unknown> = {
  data: T | null;
  error: PostgrestError | null;
  count: number | null;
  status: number;
  statusText: string;
};

export type Identity = { role: DbRole; userId: string | null };

const IDENT = /^[a-z_][a-z0-9_]*$/;
const q = (id: string) => {
  if (!IDENT.test(id)) throw new QueryError(`invalid identifier "${id}"`, "PGRST100");
  return `"${id}"`;
};

class QueryError extends Error {
  constructor(message: string, public code = "PGRST100") {
    super(message);
  }
}

function toError(e: unknown): PostgrestError {
  const err = e as { message?: string; code?: string; detail?: string; hint?: string };
  return {
    message: err?.message ?? String(e),
    code: err?.code ?? "PGRST000",
    details: err?.detail ?? null,
    hint: err?.hint ?? null,
  };
}

// ---------------------------------------------------------------------------
// select-string parsing:  "id, title, author:profiles!fk_name(id, full_name), *"
type SelNode =
  | { kind: "star" }
  | { kind: "col"; name: string; alias: string }
  | { kind: "embed"; rel: string; hint?: string; alias: string; children: SelNode[] };

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

export function parseSelect(s: string): SelNode[] {
  return splitTop(s.replace(/\s+/g, " ")).map((item) => {
    if (item === "*") return { kind: "star" } as const;
    const open = item.indexOf("(");
    if (open !== -1) {
      if (!item.endsWith(")")) throw new QueryError(`bad select item "${item}"`);
      let head = item.slice(0, open).trim();
      const inner = item.slice(open + 1, -1);
      let alias: string | undefined;
      if (head.includes(":")) [alias, head] = head.split(":").map((x) => x.trim());
      const [rel, ...hints] = head.split("!").map((x) => x.trim());
      const hint = hints.find((h) => h !== "inner" && h !== "left");
      return { kind: "embed", rel, hint, alias: alias ?? rel, children: parseSelect(inner) } as const;
    }
    let name = item, alias: string | undefined;
    if (item.includes(":") && !item.includes("::")) [alias, name] = item.split(":").map((x) => x.trim());
    name = name.split("::")[0].trim();
    return { kind: "col", name, alias: alias ?? name } as const;
  });
}

// ---------------------------------------------------------------------------
type Params = unknown[];
const bind = (params: Params, v: unknown) => { params.push(v); return `$${params.length}`; };

function column(table: Table, name: string) {
  const c = table.columns.get(name);
  if (!c) throw new QueryError(`column ${table.name}.${name} does not exist`, "42703");
  return c;
}

function findRelation(meta: Meta, parent: string, rel: string, hint?: string) {
  const match = (fk: ForeignKey) =>
    !hint || fk.name === hint || fk.srcCols.join(",") === hint;
  const many2one = meta.fks.filter((fk) => fk.srcTable === parent && fk.dstTable === rel && match(fk));
  const one2many = meta.fks.filter((fk) => fk.srcTable === rel && fk.dstTable === parent && match(fk));
  const all = [...many2one.map((fk) => ({ fk, dir: "m2o" as const })), ...one2many.map((fk) => ({ fk, dir: "o2m" as const }))];
  if (all.length !== 1) {
    throw new QueryError(
      all.length === 0
        ? `no relationship between ${parent} and ${rel}`
        : `ambiguous relationship between ${parent} and ${rel} — add !<constraint_name>`,
      "PGRST200",
    );
  }
  return all[0];
}

/** SQL expression producing the JSON for one embedded resource. */
function embedSql(meta: Meta, parentTable: Table, parentAlias: string, node: Extract<SelNode, { kind: "embed" }>, depth: number): string {
  const target = meta.tables.get(node.rel);
  if (!target) throw new QueryError(`table ${node.rel} does not exist`, "42P01");
  const { fk, dir } = findRelation(meta, parentTable.name, node.rel, node.hint);
  const a = `e${depth}`;
  const obj = objectSql(meta, target, a, node.children, depth + 1);
  if (dir === "m2o") {
    const on = fk.srcCols.map((c, i) => `${a}.${q(fk.dstCols[i])} = ${parentAlias}.${q(c)}`).join(" AND ");
    return `(SELECT ${obj} FROM public.${q(target.name)} ${a} WHERE ${on} LIMIT 1)`;
  }
  const on = fk.srcCols.map((c, i) => `${a}.${q(c)} = ${parentAlias}.${q(fk.dstCols[i])}`).join(" AND ");
  if (fk.srcColsUnique) return `(SELECT ${obj} FROM public.${q(target.name)} ${a} WHERE ${on} LIMIT 1)`;
  return `COALESCE((SELECT json_agg(${obj}) FROM public.${q(target.name)} ${a} WHERE ${on}), '[]'::json)`;
}

/** json object for a row of `table` (alias `a`) containing the selected nodes. */
function objectSql(meta: Meta, table: Table, a: string, nodes: SelNode[], depth: number): string {
  const pairs: string[] = [];
  let star = false;
  for (const n of nodes) {
    if (n.kind === "star") { star = true; continue; }
    q(n.alias); // validates the key (letters, digits, _) — safe inside '...'
    if (n.kind === "col") { column(table, n.name); pairs.push(`'${n.alias}', ${a}.${q(n.name)}`); }
    else pairs.push(`'${n.alias}', ${embedSql(meta, table, a, n, depth)}`);
  }
  if (star && pairs.length === 0) return `to_json(${a})`;
  if (star) return `(to_jsonb(${a}) || jsonb_build_object(${pairs.join(", ")}))`;
  return `json_build_object(${pairs.join(", ")})`;
}

/** Top-level select list (real columns, so pg returns plain row objects). */
function selectListSql(meta: Meta, table: Table, nodes: SelNode[]): string {
  const parts: string[] = [];
  for (const n of nodes) {
    if (n.kind === "star") parts.push("t.*");
    else if (n.kind === "col") { column(table, n.name); parts.push(`t.${q(n.name)} AS ${q(n.alias)}`); }
    else parts.push(`${embedSql(meta, table, "t", n, 1)} AS ${q(n.alias)}`);
  }
  return parts.join(", ") || "t.*";
}

// ---------------------------------------------------------------------------
// Filters
type Cond =
  | { op: string; col: string; value: unknown; negate?: boolean }
  | { or: string; negate?: boolean };

function valueFor(table: Table, col: string, v: unknown) {
  const c = column(table, col);
  if (c.isJson && v !== null && v !== undefined) return JSON.stringify(v);
  return v;
}

/** Parse a PostgREST value list "(a,b,"c d")" → ["a","b","c d"]. */
function parseList(v: string): string[] {
  const inner = v.trim().replace(/^\(|\)$/g, "");
  return splitTop(inner).map((x) => x.replace(/^"(.*)"$/, "$1"));
}

function condSql(table: Table, c: Cond, params: Params): string {
  if ("or" in c) {
    const parts = splitTop(c.or).map((p) => {
      let neg = false, s = p;
      if (s.startsWith("not.")) { neg = true; s = s.slice(4); }
      const i1 = s.indexOf("."), i2 = s.indexOf(".", i1 + 1);
      if (i1 < 0 || i2 < 0) throw new QueryError(`bad or() condition "${p}"`);
      const col = s.slice(0, i1), op = s.slice(i1 + 1, i2), raw = s.slice(i2 + 1);
      let value: unknown = raw;
      if (op === "in") value = parseList(raw);
      if (op === "is") value = raw === "null" ? null : raw === "true" ? true : raw === "false" ? false : raw;
      return condSql(table, { op, col, value, negate: neg }, params);
    });
    const sql = `(${parts.join(" OR ")})`;
    return c.negate ? `NOT ${sql}` : sql;
  }
  const col = `t.${q(c.col)}`;
  const meta = column(table, c.col);
  let sql: string;
  switch (c.op) {
    case "eq": sql = `${col} = ${bind(params, valueFor(table, c.col, c.value))}`; break;
    case "neq": sql = `${col} <> ${bind(params, valueFor(table, c.col, c.value))}`; break;
    case "gt": sql = `${col} > ${bind(params, c.value)}`; break;
    case "gte": sql = `${col} >= ${bind(params, c.value)}`; break;
    case "lt": sql = `${col} < ${bind(params, c.value)}`; break;
    case "lte": sql = `${col} <= ${bind(params, c.value)}`; break;
    case "like": sql = `${col}::text LIKE ${bind(params, String(c.value).replace(/\*/g, "%"))}`; break;
    case "ilike": sql = `${col}::text ILIKE ${bind(params, String(c.value).replace(/\*/g, "%"))}`; break;
    case "is":
      if (c.value === null || c.value === "null") sql = `${col} IS NULL`;
      else if (c.value === true || c.value === "true") sql = `${col} IS TRUE`;
      else if (c.value === false || c.value === "false") sql = `${col} IS FALSE`;
      else throw new QueryError(`bad is() value`);
      break;
    case "in": {
      const list = Array.isArray(c.value) ? c.value : parseList(String(c.value));
      sql = list.length === 0 ? "FALSE" : `${col} = ANY(${bind(params, list)})`;
      break;
    }
    case "cs":
    case "contains":
      sql = meta.isJson
        ? `${col} @> ${bind(params, JSON.stringify(c.value))}::jsonb`
        : `${col} @> ${bind(params, typeof c.value === "string" ? c.value : c.value)}`;
      break;
    case "cd":
    case "containedBy":
      sql = meta.isJson
        ? `${col} <@ ${bind(params, JSON.stringify(c.value))}::jsonb`
        : `${col} <@ ${bind(params, c.value)}`;
      break;
    case "ov": sql = `${col} && ${bind(params, Array.isArray(c.value) ? c.value : parseList(String(c.value)))}`; break;
    default: throw new QueryError(`unsupported filter operator "${c.op}"`);
  }
  return c.negate ? `NOT (${sql})` : sql;
}

// ---------------------------------------------------------------------------
type Action = "select" | "insert" | "update" | "upsert" | "delete";
type Order = { col: string; ascending: boolean; nullsFirst?: boolean };

// Row = one row's type (any, like an untyped supabase-js client); Result = rows array, or one row after single().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class QueryBuilder<Row = any, Result = Row[]> implements PromiseLike<PostgrestResult<Result>> {
  private action: Action = "select";
  private columns = "*";
  private returning = false;
  private countMode: "exact" | null = null;
  private head = false;
  private conds: Cond[] = [];
  private orders: Order[] = [];
  private limitN: number | null = null;
  private offsetN: number | null = null;
  private singleMode: "one" | "maybe" | null = null;
  private values: Record<string, unknown>[] = [];
  private onConflict: string | null = null;
  private ignoreDuplicates = false;

  constructor(private table: string, private who: () => Promise<Identity>) {}

  // ----- actions -----
  select(columns = "*", opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    if (this.action === "select") this.columns = columns;
    else { this.returning = true; this.columns = columns; }
    if (opts?.count) this.countMode = "exact";
    if (opts?.head) this.head = true;
    return this;
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.action = "insert"; this.values = Array.isArray(values) ? values : [values]; return this;
  }
  upsert(values: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.action = "upsert"; this.values = Array.isArray(values) ? values : [values];
    this.onConflict = opts?.onConflict ?? null; this.ignoreDuplicates = !!opts?.ignoreDuplicates; return this;
  }
  update(values: Record<string, unknown>) { this.action = "update"; this.values = [values]; return this; }
  delete() { this.action = "delete"; return this; }

  // ----- filters -----
  eq(col: string, value: unknown) { this.conds.push({ op: "eq", col, value }); return this; }
  neq(col: string, value: unknown) { this.conds.push({ op: "neq", col, value }); return this; }
  gt(col: string, value: unknown) { this.conds.push({ op: "gt", col, value }); return this; }
  gte(col: string, value: unknown) { this.conds.push({ op: "gte", col, value }); return this; }
  lt(col: string, value: unknown) { this.conds.push({ op: "lt", col, value }); return this; }
  lte(col: string, value: unknown) { this.conds.push({ op: "lte", col, value }); return this; }
  like(col: string, value: string) { this.conds.push({ op: "like", col, value }); return this; }
  ilike(col: string, value: string) { this.conds.push({ op: "ilike", col, value }); return this; }
  is(col: string, value: null | boolean) { this.conds.push({ op: "is", col, value }); return this; }
  in(col: string, values: readonly unknown[]) { this.conds.push({ op: "in", col, value: [...values] }); return this; }
  contains(col: string, value: unknown) { this.conds.push({ op: "contains", col, value }); return this; }
  containedBy(col: string, value: unknown) { this.conds.push({ op: "containedBy", col, value }); return this; }
  overlaps(col: string, value: unknown) { this.conds.push({ op: "ov", col, value }); return this; }
  match(obj: Record<string, unknown>) { for (const [k, v] of Object.entries(obj)) this.eq(k, v); return this; }
  not(col: string, op: string, value: unknown) { this.conds.push({ op, col, value, negate: true }); return this; }
  or(filters: string) { this.conds.push({ or: filters }); return this; }
  filter(col: string, op: string, value: unknown) { this.conds.push({ op, col, value }); return this; }

  // ----- modifiers -----
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({ col, ascending: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst }); return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  range(from: number, to: number) { this.offsetN = from; this.limitN = to - from + 1; return this; }
  /** Exactly one row → that row as an object; 0 or 2+ rows → error PGRST116. */
  single() { this.singleMode = "one"; return this as unknown as QueryBuilder<Row, Row>; }
  /** 0 rows → null; 1 row → the row; 2+ rows → error. */
  maybeSingle() { this.singleMode = "maybe"; return this as unknown as QueryBuilder<Row, Row | null>; }

  then<A = PostgrestResult<Result>, B = never>(
    onfulfilled?: ((value: PostgrestResult<Result>) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.execute().then(onfulfilled, onrejected);
  }

  async execute(): Promise<PostgrestResult<Result>> {
    try {
      const meta = await getMeta();
      const table = meta.tables.get(this.table);
      if (!table) throw new QueryError(`relation "public.${this.table}" does not exist`, "42P01");
      const who = await this.who();
      const { sql, params, kind } = this.build(meta, table);
      const rows = await withRole(who.role, who.userId, async (c: PoolClient) => (await c.query(sql, params)).rows);
      return this.shape(rows, kind);
    } catch (e) {
      return { data: null, error: toError(e), count: null, status: 400, statusText: "Bad Request" };
    }
  }

  private whereSql(table: Table, params: Params) {
    return this.conds.length ? ` WHERE ${this.conds.map((c) => condSql(table, c, params)).join(" AND ")}` : "";
  }

  private build(meta: Meta, table: Table): { sql: string; params: Params; kind: "rows" | "count" | "mutation" } {
    const params: Params = [];
    const T = `public.${q(table.name)}`;
    const nodes = parseSelect(this.columns);

    if (this.action === "select") {
      if (this.head && this.countMode) {
        return { sql: `SELECT count(*)::bigint AS count FROM ${T} t${this.whereSql(table, params)}`, params, kind: "count" };
      }
      let sql = `SELECT ${selectListSql(meta, table, nodes)}${this.countMode ? ", count(*) OVER () AS __count" : ""} FROM ${T} t${this.whereSql(table, params)}`;
      if (this.orders.length) {
        sql += " ORDER BY " + this.orders.map((o) => {
          column(table, o.col);
          return `t.${q(o.col)} ${o.ascending ? "ASC" : "DESC"}${o.nullsFirst === undefined ? "" : o.nullsFirst ? " NULLS FIRST" : " NULLS LAST"}`;
        }).join(", ");
      }
      if (this.limitN !== null) sql += ` LIMIT ${Math.max(0, Math.floor(this.limitN))}`;
      if (this.offsetN !== null) sql += ` OFFSET ${Math.max(0, Math.floor(this.offsetN))}`;
      return { sql, params, kind: "rows" };
    }

    if (nodes.some((n) => n.kind === "embed") && this.returning) {
      throw new QueryError("embedded resources are not supported after insert/update/delete");
    }
    const returning = this.returning ? ` RETURNING ${selectListSql(meta, table, nodes)}` : "";

    if (this.action === "delete") {
      return { sql: `DELETE FROM ${T} AS t${this.whereSql(table, params)}${returning}`, params, kind: "mutation" };
    }

    if (this.action === "update") {
      const sets = Object.entries(this.values[0] ?? {}).filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${q(k)} = ${bind(params, valueFor(table, k, v))}`);
      if (!sets.length) throw new QueryError("update() needs at least one column");
      return { sql: `UPDATE ${T} AS t SET ${sets.join(", ")}${this.whereSql(table, params)}${returning}`, params, kind: "mutation" };
    }

    // insert / upsert
    const cols = [...new Set(this.values.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
    cols.forEach((c) => column(table, c));
    if (!cols.length) throw new QueryError("insert() needs at least one column");
    const rowsSql = this.values.map((r) =>
      `(${cols.map((c) => (r[c] === undefined ? "DEFAULT" : bind(params, valueFor(table, c, r[c])))).join(", ")})`,
    );
    let sql = `INSERT INTO ${T} AS t (${cols.map(q).join(", ")}) VALUES ${rowsSql.join(", ")}`;
    if (this.action === "upsert") {
      const target = (this.onConflict ? this.onConflict.split(",").map((s) => s.trim()) : table.pk);
      target.forEach((c) => column(table, c));
      const updates = cols.filter((c) => !target.includes(c));
      sql += ` ON CONFLICT (${target.map(q).join(", ")}) ` +
        (this.ignoreDuplicates || !updates.length
          ? "DO NOTHING"
          : `DO UPDATE SET ${updates.map((c) => `${q(c)} = EXCLUDED.${q(c)}`).join(", ")}`);
    }
    return { sql: sql + returning, params, kind: "mutation" };
  }

  private shape(rows: Record<string, unknown>[], kind: "rows" | "count" | "mutation"): PostgrestResult<Result> {
    const ok = (data: unknown, count: number | null = null): PostgrestResult<Result> =>
      ({ data: data as Result, error: null, count, status: 200, statusText: "OK" });
    if (kind === "count") return ok(null, Number(rows[0]?.count ?? 0));

    let count: number | null = null;
    if (this.countMode && kind === "rows") {
      count = rows.length ? Number(rows[0].__count) : 0;
      rows.forEach((r) => delete r.__count);
    }
    if (kind === "mutation" && !this.returning) return ok(null);
    if (this.singleMode) {
      if (rows.length === 1) return ok(rows[0], count);
      if (rows.length === 0 && this.singleMode === "maybe") return ok(null, count);
      return {
        data: null, count, status: 406, statusText: "Not Acceptable",
        error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116",
          details: `The result contains ${rows.length} rows`, hint: null },
      };
    }
    return ok(rows, count);
  }
}
