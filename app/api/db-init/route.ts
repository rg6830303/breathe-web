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
  
  // 3. bookings
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    slot_date TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    duration_min INTEGER NOT NULL DEFAULT 60,
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','no_show')),
    source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online','import','walk_in')),
    notes TEXT,
    cancelled_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  
  // Indexes
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
  )`
];

export async function GET() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "breathepickleball@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "breathe-admin";
  
  try {
    // Execute all table creations
    for (const sql of STATEMENTS) {
      await turso.execute(sql);
    }

    // Seed venue configurations
    const now = Date.now();
    const configSeeds = [
      { key: "total_courts", value: "3" },
      { key: "slot_duration_min", value: "60" },
      { key: "open_time", value: "06:00" },
      { key: "close_time", value: "23:00" },
      { key: "default_price", value: "700" },
      { key: "prime_price", value: "900" },
      { key: "prime_start", value: "17:00" },
      { key: "prime_end", value: "22:00" }
    ];
    
    for (const seed of configSeeds) {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO venue_config (key, value, updated_at) VALUES (?, ?, ?)`,
        args: [seed.key, seed.value, now]
      });
    }

    // Seed admin credentials
    const existingAdmin = await turso.execute({
      sql: "SELECT id FROM admins WHERE email = ? LIMIT 1",
      args: [adminEmail.toLowerCase()]
    });
    
    let adminCreated = false;
    if (existingAdmin.rows.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await turso.execute({
        sql: "INSERT INTO admins (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        args: [uuid(), adminEmail.toLowerCase(), hash, now]
      });
      adminCreated = true;
    }

    return NextResponse.json({
      ok: true,
      message: "Database initialized and seeded successfully",
      tables: ["users", "admins", "bookings", "gallery_images", "venue_config"],
      adminCreated,
      adminEmail
    });
  } catch (err: unknown) {
    console.error("[db-init]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Initialization failed" },
      { status: 500 }
    );
  }
}
