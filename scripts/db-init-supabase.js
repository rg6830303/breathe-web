const postgres = require("postgres");
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

const postgresUrl = envVars.POSTGRES_URL || envVars.POSTGRES_URL_NON_POOLING;
if (!postgresUrl) {
  console.error("POSTGRES_URL is not set in environment!");
  process.exit(1);
}

console.log("Connecting to Supabase PostgreSQL database...");
const sql = postgres(postgresUrl, { ssl: "require" });

const STATEMENTS = [
  // 1. users
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at BIGINT NOT NULL
  )`,

  // 2. admins
  `CREATE TABLE IF NOT EXISTS admins (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL
  )`,

  // 3. bookings
  `CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    slot_date VARCHAR(50) NOT NULL,
    slot_time VARCHAR(50) NOT NULL,
    duration_min INT NOT NULL DEFAULT 60,
    guest_name VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_email VARCHAR(255),
    amount_paid INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','no_show')),
    source VARCHAR(50) NOT NULL DEFAULT 'online' CHECK (source IN ('online','import','walk_in')),
    notes TEXT,
    cancelled_at BIGINT,
    created_at BIGINT NOT NULL
  )`,

  // 4. gallery_images
  `CREATE TABLE IF NOT EXISTS gallery_images (
    id VARCHAR(255) PRIMARY KEY,
    blob_url TEXT NOT NULL,
    caption TEXT,
    display_order INT NOT NULL DEFAULT 0,
    active INT NOT NULL DEFAULT 1,
    created_at BIGINT NOT NULL
  )`,

  // 5. venue_config
  `CREATE TABLE IF NOT EXISTS venue_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at BIGINT NOT NULL
  )`
];

async function main() {
  console.log("Creating tables in Supabase PostgreSQL database...");
  for (const statement of STATEMENTS) {
    console.log(`Running statement...`);
    await sql.unsafe(statement);
  }

  console.log("Seeding default venue configurations into Supabase...");
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
    await sql`
      INSERT INTO venue_config (key, value, updated_at) 
      VALUES (${seed.key}, ${seed.value}, ${now})
      ON CONFLICT (key) DO NOTHING
    `;
  }

  console.log("Seeding admin credentials into Supabase...");
  const adminEmail = envVars.SEED_ADMIN_EMAIL || envVars.ADMIN_EMAIL || "breathepickleball@gmail.com";
  
  const existingAdmins = await sql`
    SELECT id FROM admins WHERE email = ${adminEmail.toLowerCase()} LIMIT 1
  `;

  if (existingAdmins.length === 0) {
    const adminPassword = envVars.SEED_ADMIN_PASSWORD || envVars.ADMIN_PASSWORD || "breathe-admin";
    const hash = await bcrypt.hash(adminPassword, 12);
    await sql`
      INSERT INTO admins (id, email, password_hash, created_at) 
      VALUES (${randomUUID()}, ${adminEmail.toLowerCase()}, ${hash}, ${now})
    `;
    console.log(`✅ Admin user seeded successfully into Supabase: ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`Admin user ${adminEmail} already exists in Supabase, skipping seed.`);
  }

  console.log("🎉 Supabase database initialized and seeded successfully!");
  await sql.end();
}

main().catch(async (err) => {
  console.error("Supabase migration failed:", err);
  await sql.end();
  process.exit(1);
});
