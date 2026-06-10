import postgres from "postgres";

/**
 * Database access layer (Supabase Postgres).
 *
 * The whole app calls `turso.execute({ sql, args })` with `?` placeholders and
 * SQLite-flavoured SQL (kept for historical reasons). In Postgres mode we
 * translate that on the fly (`?`→`$n`, `INSERT OR IGNORE`→`ON CONFLICT DO
 * NOTHING`, `strftime('%w',…)`→`EXTRACT(DOW …)`). The schema uses types valid in
 * Postgres (TEXT, BIGINT, INTEGER). Turso/libsql has been fully removed.
 *
 * POSTGRES_URL must be the Supabase *Transaction pooler* string
 * (…pooler.supabase.com:6543) for serverless — not the direct :5432 connection.
 */
const PG_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
export const USE_PG = true;

type Pg = ReturnType<typeof postgres>;
let pg: Pg | null = null;
function getPg(): Pg {
  if (pg) return pg;
  if (!PG_URL) throw new Error("POSTGRES_URL is not set");
  // Serverless-tuned pool: one connection per instance (the pooler multiplexes),
  // no prepared statements (required for pgbouncer transaction mode), fail fast.
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
  s = s.replace(/strftime\(\s*'%w'\s*,\s*([^)]+?)\)/gi, "EXTRACT(DOW FROM ($1)::date)");
  let i = 0;
  s = s.replace(/\?/g, () => `$${++i}`);
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

async function pgBatch(statements: Array<string | { sql: string; args?: unknown[] }>) {
  const client = getPg();
  for (const st of statements) {
    const text = typeof st === "string" ? st : st.sql;
    const args = typeof st === "string" ? [] : (st.args ?? []);
    await client.unsafe(toPg(text), args as never[]);
  }
  return [] as unknown;
}

export const turso = {
  execute: (arg: InStmt) => pgExecute(arg),
  // Second arg (libsql transaction mode) is accepted for call-site compatibility
  // and ignored — pgBatch runs the statements sequentially.
  batch: (statements: Array<string | { sql: string; args?: unknown[] }>, _mode?: string) => pgBatch(statements),
};

/**
 * Idempotently ensure the first-class `blocked_slots` table exists. Called by
 * the admin block/unblock endpoints. NULL slot_time = whole day; NULL
 * court_number = all courts.
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
