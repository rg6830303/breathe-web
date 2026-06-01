import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATEMENTS: string[] = [
  // 1. users
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at INTEGER NOT NULL
  )`,

  // 2. admins
  `CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,

  // 3. bookings (court_number/subtotal/gst/total added via ALTER below for existing DBs)
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

  // Indexes (only the ones that don't need court_number — that column may not exist on old DBs
  // until the ALTERS below run; see LATE_INDEXES for the court_number index)
  `CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings (slot_date, slot_time)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status)`,

  // 4. gallery_images
  `CREATE TABLE IF NOT EXISTS gallery_images (
    id TEXT PRIMARY KEY,
    blob_url TEXT NOT NULL,
    caption TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,

  // 5. venue_config
  `CREATE TABLE IF NOT EXISTS venue_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  // 6. rate_limits — per-IP throttling for auth endpoints
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start INTEGER NOT NULL
  )`,

  // 7. password_reset_tokens — sha256 hashes of single-use reset tokens
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens (expires_at)`,

  // 8. notices — admin notice board (rendered on homepage/dashboard)
  `CREATE TABLE IF NOT EXISTS notices (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT,
    category TEXT NOT NULL DEFAULT 'daily' CHECK (category IN ('daily','weekly','monthly')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notices_active_created ON notices (active, created_at DESC)`,

  // 9. blocked_slots — first-class admin block model (separate from bookings)
  //    NULL slot_time = entire day; NULL court_number = all courts.
  `CREATE TABLE IF NOT EXISTS blocked_slots (
    id TEXT PRIMARY KEY,
    slot_date TEXT NOT NULL,
    slot_time TEXT,
    court_number INTEGER,
    reason TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots (slot_date)`,
  `CREATE INDEX IF NOT EXISTS idx_blocked_slots_lookup ON blocked_slots (slot_date, court_number, slot_time)`,
];

// ALTER statements that may fail with "duplicate column" on already-migrated DBs
// — wrap in tryAlter so a partial-migration replay is a no-op.
const ALTERS: string[] = [
  `ALTER TABLE bookings ADD COLUMN court_number INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE bookings ADD COLUMN subtotal INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN gst INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN total INTEGER NOT NULL DEFAULT 0`,
];

// Indexes that depend on columns added by ALTERS — must run after ALTERS complete.
const LATE_INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON bookings (court_number, slot_date, slot_time)`,
];

async function tryAlter(sql: string) {
  try {
    await turso.execute(sql);
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? "").toLowerCase();
    // Ignore expected idempotency errors:
    // - "duplicate column" when ALTER TABLE re-runs on an already-migrated DB
    // - "already exists" when CREATE INDEX re-runs
    if (msg.includes("duplicate column") || msg.includes("already exists")) return;
    throw e;
  }
}


export async function GET() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "breathepickleball@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "breathe-admin";

  try {
    for (const sql of STATEMENTS) {
      await turso.execute(sql);
    }

    for (const sql of ALTERS) {
      await tryAlter(sql);
    }

    // Create indexes that depend on columns added in ALTERS
    for (const sql of LATE_INDEXES) {
      await tryAlter(sql);
    }

    // Backfill total from amount_paid for any rows where total = 0 but amount_paid > 0
    // (rows created before the GST split). Subtotal ≈ 84.7% of total, GST = 15.3%.
    try {
      await turso.execute(`
        UPDATE bookings
        SET total = amount_paid,
            subtotal = CAST(amount_paid * 0.847 AS INTEGER),
            gst = amount_paid - CAST(amount_paid * 0.847 AS INTEGER)
        WHERE total = 0 AND amount_paid > 0
      `);
    } catch (err) {
      console.warn("[db-init backfill warning]", err);
    }

    const now = Date.now();
    const configSeeds = [
      { key: "total_courts", value: "3" },
      { key: "slot_duration_min", value: "60" },
      { key: "open_time", value: "06:00" },
      { key: "close_time", value: "23:00" },
      { key: "default_price", value: "700" },
      { key: "prime_price", value: "900" },
      { key: "prime_start", value: "17:00" },
      { key: "prime_end", value: "22:00" },
    ];

    for (const seed of configSeeds) {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO venue_config (key, value, updated_at) VALUES (?, ?, ?)`,
        args: [seed.key, seed.value, now],
      });
    }

    const existingAdmin = await turso.execute({
      sql: "SELECT id FROM admins WHERE email = ? LIMIT 1",
      args: [adminEmail.toLowerCase()],
    });

    let adminCreated = false;
    if (existingAdmin.rows.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await turso.execute({
        sql: "INSERT INTO admins (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        args: [uuid(), adminEmail.toLowerCase(), hash, now],
      });
      adminCreated = true;
    }

    return NextResponse.json({
      ok: true,
      message: "Database initialized and seeded successfully",
      tables: [
        "users",
        "admins",
        "bookings",
        "gallery_images",
        "venue_config",
        "rate_limits",
        "password_reset_tokens",
        "notices",
        "blocked_slots",
      ],
      adminCreated,
      adminEmail,
    });
  } catch (err: unknown) {
    console.error("[db-init]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Initialization failed" },
      { status: 500 },
    );
  }
}
