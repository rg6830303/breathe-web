import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT 'Club Admin',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_phone TEXT,
    court_number INTEGER NOT NULL CHECK (court_number IN (1, 2, 3)),
    slot_date TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    price REAL NOT NULL,
    addons TEXT DEFAULT '[]',
    subtotal REAL NOT NULL,
    gst REAL NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS blocked_slots (
    id TEXT PRIMARY KEY,
    court_number INTEGER NOT NULL CHECK (court_number IN (1, 2, 3)),
    slot_date TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    reason TEXT DEFAULT 'Admin block',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(slot_date)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_blocked_date ON blocked_slots(slot_date)`,
];

export async function GET() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_EMAIL and ADMIN_PASSWORD env vars are required." },
      { status: 400 },
    );
  }

  try {
    for (const statement of STATEMENTS) {
      await turso.execute(statement);
    }

    const existing = await turso.execute({
      sql: "SELECT id FROM admins WHERE email = ? LIMIT 1",
      args: [adminEmail.toLowerCase()],
    });
    let adminCreated = false;
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await turso.execute({
        sql: "INSERT INTO admins (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
        args: [uuid(), adminEmail.toLowerCase(), hash, "Club Admin"],
      });
      adminCreated = true;
    }

    return NextResponse.json({
      ok: true,
      message: "Database initialized",
      tables: ["users", "admins", "bookings", "blocked_slots"],
      adminCreated,
    });
  } catch (err) {
    console.error("[db-init]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Init failed" },
      { status: 500 },
    );
  }
}
