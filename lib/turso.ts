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
  // idle_timeout is deliberately short so a warm-but-idle Lambda releases its
  // server connection quickly instead of pinning a slot on the free tier.
  pg = postgres(PG_URL, {
    prepare: false,
    ssl: "require",
    max: 1,
    idle_timeout: 10,
    max_lifetime: 60 * 5,
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

let ensured = false;
let ensuring = false;

async function ensureSchemaLazy(): Promise<void> {
  if (ensured || ensuring) return;
  ensuring = true;
  try {
    const { applySchema } = await import("./db/ensure");
    await applySchema();
    ensured = true;
  } catch (err) {
    console.error("[lazy ensureSchema] failed", err);
  } finally {
    ensuring = false;
  }
}

export const turso = {
  execute: (async (arg: Parameters<Client["execute"]>[0]) => {
    await ensureSchemaLazy();
    return getClient().execute(arg);
  }) as Client["execute"],
  batch: (async (statements: Parameters<Client["batch"]>[0], mode?: Parameters<Client["batch"]>[1]) => {
    await ensureSchemaLazy();
    return getClient().batch(statements, mode);
  }) as Client["batch"],
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
