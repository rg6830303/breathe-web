const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

// Parse env vars from .env.local
const envPath = path.join(__dirname, "../.env.local");
let envContent = "";
try {
  envContent = fs.readFileSync(envPath, "utf8");
} catch (e) {
  console.warn("No .env.local found, reading system process env");
}
const envVars = { ...process.env };
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    envVars[match[1]] = value;
  }
});

const url = envVars.TURSO_DATABASE_URL;
const authToken = envVars.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL is not set!");
  process.exit(1);
}

const client = createClient({ url, authToken });

const STATEMENTS = [
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

async function main() {
  console.log("Creating tables on Turso database...");
  for (const sql of STATEMENTS) {
    console.log("Executing statement...");
    await client.execute(sql);
  }
  
  console.log("Seeding default venue configurations...");
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
    await client.execute({
      sql: `INSERT OR IGNORE INTO venue_config (key, value, updated_at) VALUES (?, ?, ?)`,
      args: [seed.key, seed.value, now]
    });
  }

  console.log("Seeding admin credentials...");
  const adminEmail = envVars.SEED_ADMIN_EMAIL || "breathepickleball@gmail.com";
  // Check if admin already exists
  const existingAdmin = await client.execute({
    sql: "SELECT id FROM admins WHERE email = ? LIMIT 1",
    args: [adminEmail.toLowerCase()]
  });
  
  if (existingAdmin.rows.length === 0) {
    // Standard default password if none is loaded
    const adminPassword = envVars.SEED_ADMIN_PASSWORD || "breathe-admin";
    const hash = await bcrypt.hash(adminPassword, 12);
    await client.execute({
      sql: "INSERT INTO admins (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), adminEmail.toLowerCase(), hash, now]
    });
    console.log(`✅ Admin user seeded successfully: ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`Admin user ${adminEmail} already exists, skipping seed.`);
  }
  
  console.log("🎉 Database initialized and seeded successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
