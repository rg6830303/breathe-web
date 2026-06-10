import { createClient, type Client } from "@libsql/client";
import postgres from "postgres";

/**
 * Database access layer with a portable SQL interface.
 *
 * Backend selection (reversible — flip with one env var):
 *   - If POSTGRES_URL (Supabase) is set  → Postgres backend (production target).
 *   - Otherwise                          → Turso/libsql backend (legacy).
 *
 * The whole app calls `turso.execute({ sql, args })` with `?` placeholders and
 * SQLite-flavoured SQL. In Postgres mode we translate that on the fly
 * (`?`→`$n`, `INSERT OR IGNORE`→`ON CONFLICT DO NOTHING`, `strftime('%w',…)`→
 * `EXTRACT(DOW …)`) so not a single route has to change. The schema uses types
 * valid in both engines (TEXT, BIGINT, INTEGER).
 */
const PG_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
export const USE_PG = !!PG_URL;

// ---------------------------------------------------------------- Turso (libsql)
let libsql: Client | null = null;
function getLibsql(): Client {
  if (libsql) return libsql;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  libsql = createClient({ url, authToken });
  return libsql;
}

// ----------------------------------------------------------------- Postgres (pg)
type Pg = ReturnType<typeof postgres>;
let pg: Pg | null = null;
function getPg(): Pg {
  if (pg) return pg;
  // Serverless-tuned pool for the Supabase transaction pooler (pgbouncer):
  //  - prepare:false  → required (transaction mode can't keep prepared stmts)
  //  - max:1          → one connection per function instance; the pooler does the
  //                     real multiplexing. Avoids opening several cross-region
  //                     connections per cold start (the main cause of slow logins).
  //  - connect_timeout:10 → fail fast instead of hanging for minutes if a
  //                     connection stalls.
  //  - idle_timeout/max_lifetime → recycle connections promptly on serverless.
  // IMPORTANT: POSTGRES_URL must be the *Transaction pooler* string
  // (…pooler.supabase.com:6543), not the direct 5432 connection.
  pg = postgres(PG_URL, {
    prepare: false,
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    connect_timeout: 10,
  });
  return pg;
}

/** Translate SQLite-flavoured SQL + `?` placeholders into Postgres. */
export function toPg(sql: string): string {
  let s = sql;
  const hadOrIgnore = /INSERT\s+OR\s+IGNORE/i.test(s);
  s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT INTO");
  // strftime('%w', col) → day-of-week 0..6
  s = s.replace(/strftime\(\s*'%w'\s*,\s*([^)]+?)\)/gi, "EXTRACT(DOW FROM ($1)::date)");
  // Positional placeholders: ? → $1, $2, ...
  let i = 0;
  s = s.replace(/\?/g, () => `$${++i}`);
  // Re-add the IGNORE semantics if the query didn't already declare a conflict
  // clause (our INSERT OR IGNORE statements don't).
  if (hadOrIgnore && !/ON\s+CONFLICT/i.test(s)) {
    s = s.replace(/\s*;?\s*$/, "") + " ON CONFLICT DO NOTHING";
  }
  return s;
}

type InStmt = string | { sql: string; args?: unknown[] | Record<string, unknown> };

async function pgExecute(arg: InStmt) {
  const text = typeof arg === "string" ? arg : arg.sql;
  const rawArgs = typeof arg === "string" ? [] : arg.args ?? [];
  const args = Array.isArray(rawArgs) ? rawArgs : Object.values(rawArgs);
  const rows = (await getPg().unsafe(toPg(text), args as never[])) as unknown as Record<string, unknown>[];
  return {
    rows,
    rowsAffected: (rows as { count?: number }).count ?? rows.length ?? 0,
    columns: [] as string[],
    lastInsertRowid: undefined,
  };
}

async function pgBatch(statements: Parameters<Client["batch"]>[0]) {
  const client = getPg();
  const list = statements as unknown as Array<string | { sql: string; args?: unknown[] }>;
  for (const st of list) {
    const text = typeof st === "string" ? st : st.sql;
    const args = typeof st === "string" ? [] : (st.args ?? []);
    await client.unsafe(toPg(text), args as never[]);
  }
  return [] as unknown;
}

export const turso = {
  execute: ((arg: InStmt) =>
    USE_PG ? pgExecute(arg) : getLibsql().execute(arg as never)) as unknown as Client["execute"],
  batch: ((statements: Parameters<Client["batch"]>[0], mode?: Parameters<Client["batch"]>[1]) =>
    USE_PG ? pgBatch(statements) : getLibsql().batch(statements, mode)) as unknown as Client["batch"],
};

/**
 * Idempotently ensure the first-class `blocked_slots` table exists. Called by
 * the admin block/unblock endpoints. BIGINT/TEXT types are valid in both
 * engines. NULL slot_time = whole day; NULL court_number = all courts.
 */
let blockedSlotsEnsured = false;
export async function ensureBlockedSlotsTable(): Promise<void> {
  if (blockedSlotsEnsured) return;
  await turso.execute(
    `CREATE TABLE IF NOT EXISTS blocked_slots (
      id TEXT PRIMARY KEY,
      slot_date TEXT NOT NULL,
      slot_time TEXT,
      court_number INTEGER,
      reason TEXT,
      created_at BIGINT NOT NULL
    )`,
  );
  blockedSlotsEnsured = true;
}
