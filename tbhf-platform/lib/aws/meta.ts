import "server-only";
import { getPool } from "./db";

/**
 * Schema metadata for the query builder: which tables/columns exist (every
 * identifier in a query is checked against this — nothing user-supplied is
 * ever spliced into SQL), column types (json/jsonb values are serialised),
 * foreign keys (to resolve embedded selects like `profiles(full_name)`) and
 * function signatures (for rpc()). Loaded once per server process.
 */

export type Column = { name: string; type: string; isArray: boolean; isJson: boolean };
export type ForeignKey = {
  name: string;
  srcTable: string;
  srcCols: string[];
  dstTable: string;
  dstCols: string[];
  srcColsUnique: boolean; // the FK columns are a PK/unique key of srcTable (one-to-one)
};
export type Table = { name: string; columns: Map<string, Column>; pk: string[] };
export type DbFunction = {
  name: string;
  argNames: string[];
  argTypes: string[];
  returnsSet: boolean;
  returnType: string; // format_type of the return type
  returnsComposite: boolean; // table / record / row type → SELECT * FROM fn()
};
export type Meta = {
  tables: Map<string, Table>;
  fks: ForeignKey[];
  functions: Map<string, DbFunction[]>;
};

let cached: Promise<Meta> | null = null;

export function getMeta(): Promise<Meta> {
  if (!cached) cached = load().catch((e) => { cached = null; throw e; });
  return cached;
}

async function load(): Promise<Meta> {
  const pool = getPool();
  const [cols, pks, fks, fns] = await Promise.all([
    pool.query(`
      select c.relname as table, a.attname as name,
             format_type(a.atttypid, a.atttypmod) as type,
             t.typcategory = 'A' as is_array,
             format_type(a.atttypid, null) in ('json', 'jsonb') as is_json
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_type t on t.oid = a.atttypid
      where n.nspname = 'public' and c.relkind in ('r', 'v', 'p')
        and a.attnum > 0 and not a.attisdropped
      order by c.relname, a.attnum`),
    pool.query(`
      select c.relname as table, array_agg(a.attname::text order by k.ord) as cols
      from pg_index i
      join pg_class c on c.oid = i.indrelid
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral unnest(i.indkey) with ordinality k(attnum, ord)
      join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
      where n.nspname = 'public' and i.indisprimary
      group by c.relname`),
    pool.query(`
      select con.conname as name, src.relname as src_table, dst.relname as dst_table,
             array(select a.attname::text from unnest(con.conkey) with ordinality k(n, o)
                   join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.n order by k.o) as src_cols,
             array(select a.attname::text from unnest(con.confkey) with ordinality k(n, o)
                   join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.n order by k.o) as dst_cols,
             exists (select 1 from pg_index i where i.indrelid = con.conrelid and i.indisunique
                     and (select array_agg(x order by x) from unnest(i.indkey::int2[]) x)
                       = (select array_agg(x order by x) from unnest(con.conkey) x)) as src_unique
      from pg_constraint con
      join pg_class src on src.oid = con.conrelid
      join pg_class dst on dst.oid = con.confrelid
      join pg_namespace sn on sn.oid = src.relnamespace
      join pg_namespace dn on dn.oid = dst.relnamespace
      where con.contype = 'f' and sn.nspname = 'public' and dn.nspname = 'public'`),
    pool.query(`
      select p.proname as name, p.proretset as returns_set,
             format_type(p.prorettype, null) as return_type,
             (rt.typtype = 'c' or p.prorettype = 'record'::regtype) as returns_composite,
             coalesce(p.proargnames, '{}') as all_names,
             coalesce(p.proargmodes::text[], '{}') as modes,
             array(select format_type(x, null) from unnest(p.proargtypes) with ordinality u(x, o) order by o) as in_types
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_type rt on rt.oid = p.prorettype
      where n.nspname = 'public' and p.prokind = 'f'`),
  ]);

  const tables = new Map<string, Table>();
  for (const r of cols.rows) {
    let t = tables.get(r.table);
    if (!t) tables.set(r.table, (t = { name: r.table, columns: new Map(), pk: [] }));
    t.columns.set(r.name, { name: r.name, type: r.type, isArray: r.is_array, isJson: r.is_json });
  }
  for (const r of pks.rows) {
    const t = tables.get(r.table);
    if (t) t.pk = r.cols;
  }

  const functions = new Map<string, DbFunction[]>();
  for (const r of fns.rows) {
    // Input argument names: all names whose mode is IN/INOUT/VARIADIC (or no modes = all IN).
    const names: string[] = r.all_names;
    const modes: string[] = r.modes;
    const inNames = modes.length === 0 ? names.slice(0, r.in_types.length)
      : names.filter((_, i) => ["i", "b", "v"].includes(modes[i]));
    const fn: DbFunction = {
      name: r.name,
      argNames: inNames,
      argTypes: r.in_types,
      returnsSet: r.returns_set,
      returnType: r.return_type,
      returnsComposite: r.returns_composite,
    };
    const list = functions.get(r.name) ?? [];
    list.push(fn);
    functions.set(r.name, list);
  }

  return {
    tables,
    functions,
    fks: fks.rows.map((r) => ({
      name: r.name,
      srcTable: r.src_table,
      srcCols: r.src_cols,
      dstTable: r.dst_table,
      dstCols: r.dst_cols,
      srcColsUnique: r.src_unique,
    })),
  };
}
