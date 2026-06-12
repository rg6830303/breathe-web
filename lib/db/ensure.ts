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
    created_at INTEGER NOT NULL,
    google_id TEXT,
    avatar_url TEXT
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
    sport TEXT NOT NULL DEFAULT 'pickleball',
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
  `CREATE TABLE IF NOT EXISTS booking_courts (
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    court_number INTEGER NOT NULL,
    slot_date TEXT NOT NULL,
    slot_time TEXT NOT NULL
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
  `CREATE INDEX IF NOT EXISTS idx_users_google ON users (google_id)`,
  // Hard guarantee against double-booking: at most one CONFIRMED booking per
  // court+date+time. Partial index so cancelled/no-show rows don't block
  // re-booking the same slot. Concurrent payments that both pass the
  // application-level availability check will now collide here, and the loser's
  // INSERT throws (handled by the booking routes with a refund).
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_confirmed_slot ON bookings (court_number, slot_date, slot_time) WHERE status = 'confirmed'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_courts_unique ON booking_courts (court_number, slot_date, slot_time)`,
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
  `ALTER TABLE bookings ADD COLUMN sport TEXT NOT NULL DEFAULT 'pickleball'`,
  // Google OAuth: link a Google account + cache its avatar onto legacy users.
  `ALTER TABLE users ADD COLUMN google_id TEXT`,
  `ALTER TABLE users ADD COLUMN avatar_url TEXT`,
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

/** Make DDL portable across SQLite (Turso) and Postgres (Supabase). Epoch-ms
 *  timestamps and money columns overflow Postgres INT4, so widen every INTEGER
 *  to BIGINT — valid in both engines (SQLite gives it INTEGER affinity). */
const portable = (sql: string): string => sql.replace(/\bINTEGER\b/g, "BIGINT");

export async function applySchema(): Promise<void> {
  const tables = SCHEMA_TABLES.map(portable);
  const alters = SCHEMA_ALTERS.map(portable);
  const indexes = SCHEMA_INDEXES.map(portable);

  // 1. Tables — pure `IF NOT EXISTS`; one batched round-trip, per-statement fallback.
  try {
    await turso.batch(tables, "write");
  } catch (e) {
    console.error("[applySchema tables batch failed — falling back]", e);
    for (const sql of tables) await runResilient(sql);
  }

  // 2. Column back-fills for legacy tables. runResilient swallows the benign
  //    "duplicate column" (SQLite) / "already exists" (Postgres) errors, so this
  //    is safe + idempotent on both engines.
  for (const sql of alters) await runResilient(sql);

  // 3. Indexes last (their columns now exist) — also pure `IF NOT EXISTS`.
  try {
    await turso.batch(indexes, "write");
  } catch (e) {
    console.error("[applySchema indexes batch failed — falling back]", e);
    for (const sql of indexes) await runResilient(sql);
  }

  // 4. Backfill existing confirmed bookings into booking_courts if empty
  try {
    const countCheck = await turso.execute("SELECT COUNT(*) as count FROM booking_courts");
    const count = Number(countCheck.rows[0]?.count ?? 0);
    if (count === 0) {
      console.log("[ensureSchema] Backfilling booking_courts table...");
      const activeBookings = await turso.execute(
        "SELECT id, court_number, slot_date, slot_time, duration_min, sport FROM bookings WHERE status = 'confirmed'"
      );
      for (const row of activeBookings.rows) {
        const id = String(row.id);
        const court = Number(row.court_number) || 1;
        const date = String(row.slot_date);
        const time = String(row.slot_time).slice(0, 5);
        const duration = Number(row.duration_min) || 60;
        const sport = row.sport ? String(row.sport) : "pickleball";

        const courts = sport === "cricket" ? [1, 2, 3] : [court];
        for (const c of courts) {
          for (let offset = 0; offset < duration; offset += 30) {
            const cellTime = addMin(time, offset);
            await turso.execute({
              sql: "INSERT OR IGNORE INTO booking_courts (booking_id, court_number, slot_date, slot_time) VALUES (?, ?, ?, ?)",
              args: [id, c, date, cellTime],
            }).catch(() => {});
          }
        }
      }
      console.log("[ensureSchema] Backfill complete.");
    }
  } catch (err) {
    console.error("[ensureSchema] Backfill failed", err);
  }
}

function addMin(t: string, mins: number): string {
  const [h, m] = t.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
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
      // FAST PATH: if a core table already exists, the schema is provisioned —
      // mark ensured and skip applySchema entirely. applySchema runs ~47
      // CREATE TABLE/ALTER/INDEX statements PLUS a booking_courts backfill scan;
      // running that on every cold serverless instance is what made admin tabs
      // (and logins) crawl. One cheap existence check replaces all of it.
      try {
        await turso.execute("SELECT 1 FROM users LIMIT 1");
        ensured = true;
        return;
      } catch {
        // Core table missing (genuinely fresh DB) → fall through to full setup.
      }
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
