/**
 * One-time data migration: Turso (libsql)  →  Supabase (Postgres).
 *
 * Safe + idempotent: it creates the portable schema in Supabase if missing and
 * copies every row with ON CONFLICT DO NOTHING, so re-running never duplicates.
 * It does NOT touch or delete Turso — verify the app on Supabase first, only
 * then remove the Turso integration.
 *
 * Run from the project root with your env available:
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... POSTGRES_URL=... \
 *     node scripts/migrate-turso-to-supabase.mjs
 * (It also auto-loads .env / .env.local if present.)
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import postgres from "postgres";

// --- tiny .env loader (no dependency) ---
function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const PG_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!TURSO_URL || !PG_URL) {
  console.error("Missing TURSO_DATABASE_URL or POSTGRES_URL. Set them and retry.");
  process.exit(1);
}

// Portable schema (TEXT / BIGINT / INTEGER — valid in Postgres). Mirrors lib/db/ensure.ts.
const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, phone TEXT, created_at BIGINT NOT NULL, google_id TEXT, avatar_url TEXT)`,
  `CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, user_id TEXT, slot_date TEXT NOT NULL, slot_time TEXT NOT NULL, duration_min BIGINT NOT NULL DEFAULT 60, court_number INTEGER NOT NULL DEFAULT 1, guest_name TEXT, guest_phone TEXT, guest_email TEXT, subtotal BIGINT NOT NULL DEFAULT 0, gst BIGINT NOT NULL DEFAULT 0, total BIGINT NOT NULL DEFAULT 0, amount_paid BIGINT NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'confirmed', source TEXT NOT NULL DEFAULT 'online', notes TEXT, cancelled_at BIGINT, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS gallery_images (id TEXT PRIMARY KEY, blob_url TEXT NOT NULL, caption TEXT, display_order BIGINT NOT NULL DEFAULT 0, active BIGINT NOT NULL DEFAULT 1, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS venue_config (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count BIGINT NOT NULL DEFAULT 0, window_start BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at BIGINT NOT NULL, used_at BIGINT, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS notices (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT, category TEXT NOT NULL DEFAULT 'daily', active BIGINT NOT NULL DEFAULT 1, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS blocked_slots (id TEXT PRIMARY KEY, slot_date TEXT NOT NULL, slot_time TEXT, court_number INTEGER, reason TEXT, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS user_credits (user_id TEXT PRIMARY KEY, balance_min BIGINT NOT NULL DEFAULT 0, updated_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS credit_ledger (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, delta_min BIGINT NOT NULL, reason TEXT, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, expense_date TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'other', description TEXT, amount BIGINT NOT NULL DEFAULT 0, payment_method TEXT, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tournaments (id TEXT PRIMARY KEY, name TEXT NOT NULL, event_date TEXT, format TEXT, prize TEXT, fee BIGINT DEFAULT 0, description TEXT, status TEXT NOT NULL DEFAULT 'upcoming', active BIGINT NOT NULL DEFAULT 1, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (id TEXT PRIMARY KEY, user_id TEXT, role TEXT NOT NULL DEFAULT 'user', endpoint TEXT NOT NULL UNIQUE, keys_p256dh TEXT NOT NULL, keys_auth TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT, role TEXT NOT NULL DEFAULT 'user', title TEXT NOT NULL, body TEXT, url TEXT, read_at BIGINT, created_at BIGINT NOT NULL)`,
];

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const sql = postgres(PG_URL, { prepare: false, ssl: "require", max: 3 });

async function main() {
  console.log("→ Ensuring Supabase schema…");
  for (const ddl of TABLES) await sql.unsafe(ddl);

  // Discover the tables present in Turso.
  const tRes = await turso.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%'",
  );
  const tursoTables = new Set(tRes.rows.map((r) => String(r.name)));
  const known = TABLES.map((d) => d.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)[1]);

  let grandTotal = 0;
  for (const table of known) {
    if (!tursoTables.has(table)) {
      console.log(`  • ${table}: not in Turso, skipped`);
      continue;
    }
    const rows = (await turso.execute(`SELECT * FROM ${table}`)).rows;
    if (rows.length === 0) {
      console.log(`  • ${table}: 0 rows`);
      continue;
    }
    const cols = Object.keys(rows[0]);
    let inserted = 0;
    // Insert in chunks to keep statements small.
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const values = [];
      const params = [];
      let p = 0;
      for (const row of slice) {
        const ph = cols.map(() => `$${++p}`);
        values.push(`(${ph.join(",")})`);
        for (const c of cols) params.push(row[c] === undefined ? null : row[c]);
      }
      const stmt = `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(",")}) VALUES ${values.join(",")} ON CONFLICT DO NOTHING`;
      const res = await sql.unsafe(stmt, params);
      inserted += res.count ?? slice.length;
    }
    grandTotal += inserted;
    console.log(`  • ${table}: copied ${rows.length} rows (${inserted} new)`);
  }

  console.log(`✓ Done. ${grandTotal} new rows written to Supabase.`);
  await sql.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("✗ Migration failed:", e);
  try { await sql.end(); } catch {}
  process.exit(1);
});
