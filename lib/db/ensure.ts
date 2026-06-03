import { turso } from "@/lib/turso";

/**
 * Single source of truth for the database schema. Used by both /api/db-init
 * (explicit setup + seeding) and ensureSchema() (lazy auto-healing called from
 * critical routes), so a fresh or partially-migrated Turso database never
 * silently drops user signups, bookings, or password-reset lookups.
 */
/**
 * Table definitions (CREATE TABLE IF NOT EXISTS). These run FIRST. Indexes are
 * kept separate (SCHEMA_INDEXES) and run LAST, after column migrations, because
 * an index on a column that a legacy table is still missing would otherwise
 * abort the whole bootstrap (the original "no such column: court_number" bug,
 * which in turn left `notices` and every later table uncreated).
 */
export const SCHEMA_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    slot_date TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    duration_min INTEGER NOT NULL DEFAULT 60,
    court_number INTEGER NOT NULL DEFAULT 1 CHECK (court_number BETWEEN 1 AND 9),
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    subtotal INTEGER NOT NULL DEFAULT 0,
    gst INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','no_show')),
    source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online','import','walk_in')),
    notes TEXT,
    cancelled_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS gallery_images (
    id TEXT PRIMARY KEY,
    blob_url TEXT NOT NULL,
    caption TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS venue_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notices (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT,
    category TEXT NOT NULL DEFAULT 'daily' CHECK (category IN ('daily','weekly','monthly')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS blocked_slots (
    id TEXT PRIMARY KEY,
    slot_date TEXT NOT NULL,
    slot_time TEXT,
    court_number INTEGER,
    reason TEXT,
    created_at INTEGER NOT NULL
  )`,
  // Bulk-hours credit balance per user (e.g. 12-hour package = 24 half-hour
  // slot credits). balance_min is the remaining prepaid time in minutes.
  `CREATE TABLE IF NOT EXISTS user_credits (
    user_id TEXT PRIMARY KEY,
    balance_min INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`,
  // Audit trail of credit purchases / consumption.
  `CREATE TABLE IF NOT EXISTS credit_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    delta_min INTEGER NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL
  )`,
  // Daily business expenses (food, maintenance, staff, utilities, etc.) — the
  // owner's day-to-day cost ledger that replaces the Excel sheet.
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    expense_date TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    description TEXT,
    amount INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT,
    created_at INTEGER NOT NULL
  )`,
  // Tournaments / events the club hosts (shown on the public tournaments page).
  `CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    event_date TEXT,
    format TEXT,
    prize TEXT,
    fee INTEGER DEFAULT 0,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','open','completed','cancelled')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
];

/** Indexes — created LAST, after SCHEMA_ALTERS guarantee their columns exist. */
export const SCHEMA_INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings (slot_date, slot_time)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON bookings (court_number, slot_date, slot_time)`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens (expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notices_active_created ON notices (active, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots (slot_date)`,
  `CREATE INDEX IF NOT EXISTS idx_blocked_slots_lookup ON blocked_slots (slot_date, court_number, slot_time)`,
  `CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_tournaments_active ON tournaments (active, event_date DESC)`,
];

/** Back-compat: combined list (tables + indexes) for any external reference. */
export const SCHEMA_STATEMENTS: string[] = [...SCHEMA_TABLES, ...SCHEMA_INDEXES];

/**
 * Column migrations for legacy `bookings` tables created before these columns
 * existed. Run AFTER tables and BEFORE indexes. "duplicate column" errors mean
 * the column is already present and are ignored.
 */
export const SCHEMA_ALTERS: string[] = [
  `ALTER TABLE bookings ADD COLUMN court_number INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE bookings ADD COLUMN duration_min INTEGER NOT NULL DEFAULT 60`,
  `ALTER TABLE bookings ADD COLUMN subtotal INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN gst INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN total INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN amount_paid INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed'`,
  `ALTER TABLE bookings ADD COLUMN source TEXT NOT NULL DEFAULT 'online'`,
  `ALTER TABLE bookings ADD COLUMN notes TEXT`,
  `ALTER TABLE bookings ADD COLUMN cancelled_at INTEGER`,
];

/** Run one statement, swallowing only the benign "already exists / duplicate"
 *  cases so a single legacy quirk can never abort the rest of the bootstrap. */
async function runResilient(sql: string): Promise<void> {
  try {
    await turso.execute(sql);
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? "").toLowerCase();
    // Benign + expected on already-migrated databases.
    if (msg.includes("duplicate column") || msg.includes("already exists")) return;
    // Anything else: log and continue so later statements still run.
    console.error("[applySchema statement skipped]", { sql: sql.slice(0, 60), msg });
  }
}

export async function applySchema(): Promise<void> {
  // 1. Tables first so every column target exists.
  for (const sql of SCHEMA_TABLES) await runResilient(sql);
  // 2. Backfill columns onto legacy tables before any dependent index.
  for (const sql of SCHEMA_ALTERS) await runResilient(sql);
  // 3. Indexes last — their columns are now guaranteed to exist.
  for (const sql of SCHEMA_INDEXES) await runResilient(sql);
}

// Cache so the ~18 idempotent statements run at most once per warm instance.
let ensured = false;
let ensuring: Promise<void> | null = null;

/**
 * Lazily ensure the schema exists. Safe to call at the top of any route — it
 * runs the CREATE TABLE IF NOT EXISTS batch once per process and then no-ops.
 * Never throws: a failure here must not block the request (the route's own
 * query will surface a real error if the table truly can't be created).
 */
export async function ensureSchema(): Promise<void> {
  if (ensured) return;
  if (ensuring) return ensuring;
  ensuring = (async () => {
    try {
      await applySchema();
      ensured = true;
    } catch (err) {
      console.error("[ensureSchema] failed", err);
    } finally {
      ensuring = null;
    }
  })();
  return ensuring;
}
