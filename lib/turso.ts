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

/**
 * Inspect POSTGRES_URL *without exposing the secret* — we only surface the port
 * and a coarse "is this the pooler?" verdict. On Vercel serverless the URL MUST
 * be the Supabase Transaction pooler (Supavisor, port 6543), which multiplexes
 * many short-lived Lambda clients onto a small fixed set of server connections.
 * If it points at the direct connection (port 5432, host db.<ref>.supabase.co)
 * every concurrent Lambda opens its own real Postgres backend, so a burst of
 * traffic blows past the free-tier connection ceiling (~60) → new connections
 * stall up to connect_timeout (the "slow login") and then error with
 * "remaining connection slots are reserved" / "Max client connections reached".
 */
export type DbConnInfo = {
  configured: boolean;
  /** Port in the URL, e.g. "6543" (pooler) or "5432" (direct/session). */
  port: string | null;
  /** "transaction-pooler" | "direct-or-session" | "unknown" — never the host. */
  endpoint: "transaction-pooler" | "direct-or-session" | "unknown";
  /** True only when we're confident the URL is the serverless-safe pooler. */
  pooled: boolean;
};

export function dbConnInfo(): DbConnInfo {
  if (!PG_URL) return { configured: false, port: null, endpoint: "unknown", pooled: false };
  try {
    const u = new URL(PG_URL);
    const port = u.port || null;
    const host = u.hostname.toLowerCase();
    const isPooler = port === "6543" || host.includes("pooler.supabase");
    const isDirect = port === "5432" || host.startsWith("db.");
    const endpoint = isPooler ? "transaction-pooler" : isDirect ? "direct-or-session" : "unknown";
    return { configured: true, port, endpoint, pooled: isPooler };
  } catch {
    return { configured: true, port: null, endpoint: "unknown", pooled: false };
  }
}

// Loud one-time warning in the server logs when the URL is NOT the pooler — this
// is the single biggest cause of connection-limit exhaustion + slow logins.
{
  const info = dbConnInfo();
  if (info.configured && !info.pooled) {
    console.warn(
      `[turso] POSTGRES_URL is NOT the Supabase Transaction pooler (port=${info.port ?? "?"}, ` +
        `endpoint=${info.endpoint}). On serverless this exhausts the free-tier connection ` +
        `limit and slows logins. Use the :6543 transaction-pooler string.`,
    );
  }
}

type Pg = ReturnType<typeof postgres>;
let pg: Pg | null = null;
function getPg(): Pg {
  if (pg) return pg;
  if (!PG_URL) throw new Error("POSTGRES_URL is not set");
  // Serverless-tuned pool: one connection per instance (the pooler multiplexes),
  // no prepared statements (required for pgbouncer transaction mode), fail fast.
  //
  // idle_timeout: 30 — NOT lower. A 2s idle timeout (tried previously) made a
  // warm Lambda drop its connection between user actions, so nearly every
  // request paid a fresh TCP+TLS+auth handshake → bursty pooler load + visible
  // lag. 30s keeps the connection warm across consecutive clicks while still
  // releasing the slot quickly when the instance goes quiet. The pooler client
  // limit is 200 and one connection per warm instance is tiny.
  //
  // fetch_types: false — skips postgres.js's extra type-discovery round trip on
  // first connect (we only use text/int/bigint and convert with Number()).
  pg = postgres(PG_URL, {
    prepare: false,
    ssl: "require",
    // max: 3 lets a single request run a few independent queries CONCURRENTLY
    // (e.g. the analytics dashboard's aggregates) instead of serializing them on
    // one connection. Still tiny against the pooler's 200-client ceiling, so it
    // stays safe on the free tier even with many simultaneous instances.
    max: 3,
    idle_timeout: 30,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
    fetch_types: false,
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

async function pgBatch(statements: Array<string | { sql: string; args?: unknown[] }>, _mode?: string) {
  const client = getPg();
  for (const st of statements) {
    const text = typeof st === "string" ? st : st.sql;
    const args = typeof st === "string" ? [] : (st.args ?? []);
    await client.unsafe(toPg(text), args as never[]);
  }
  return [] as unknown;
}

// IMPORTANT: turso.execute / batch run the query DIRECTLY — they do NOT trigger
// a schema bootstrap. A previous "lazy ensureSchema on every execute" wrapped
// EVERY query and, on each cold serverless instance, ran the full ~47-statement
// CREATE TABLE/ALTER/INDEX bootstrap before the real query. That flooded
// Supabase with redundant DDL and timed out cold-start logins ("Failed to
// fetch"). The schema is provisioned by /api/db-init and by the explicit
// ensureSchema()/ensure*Table() calls in the routes that need it, so the hot
// path must stay lean.
export const turso = {
  execute: (arg: Parameters<typeof pgExecute>[0]) => pgExecute(arg),
  batch: (statements: Parameters<typeof pgBatch>[0], mode?: string) => pgBatch(statements, mode),
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
