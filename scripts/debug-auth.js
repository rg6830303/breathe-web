const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

// Manually parse .env.local
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

const client = createClient({ url, authToken });

async function main() {
  console.log("=== DB CONNECTIVITY TEST ===");
  try {
    const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Database tables:", res.rows.map(r => r.name));
  } catch (err) {
    console.error("Connection failed:", err.message);
    return;
  }

  console.log("\n=== AUDITING USERS ===");
  try {
    const users = await client.execute("SELECT id, email, full_name, phone, created_at FROM users LIMIT 10");
    console.log(`Found ${users.rows.length} users:`);
    users.rows.forEach(u => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, Name: ${u.full_name}, Phone: ${u.phone}, Created: ${u.created_at}`);
    });
  } catch (err) {
    console.error("Failed to query users:", err.message);
  }

  console.log("\n=== AUDITING ADMINS ===");
  try {
    const admins = await client.execute("SELECT id, email, password_hash, created_at FROM admins");
    console.log(`Found ${admins.rows.length} admins:`);
    for (const a of admins.rows) {
      console.log(`- ID: ${a.id}, Email: ${a.email}, Hash: ${a.password_hash}, Created: ${a.created_at}`);
      // Test default password comparison
      const isDefaultOk = await bcrypt.compare("breathe-admin", a.password_hash);
      console.log(`  Is password "breathe-admin" correct? ${isDefaultOk}`);
    }
  } catch (err) {
    console.error("Failed to query admins:", err.message);
  }

  console.log("\n=== AUDITING BOOKINGS ===");
  try {
    const bookings = await client.execute("SELECT id, user_id, slot_date, slot_time, duration_min, guest_name, amount_paid, status, source FROM bookings LIMIT 5");
    console.log(`Found ${bookings.rows.length} bookings sample:`);
    bookings.rows.forEach(b => {
      console.log(`- ID: ${b.id}, UserID: ${b.user_id}, Date: ${b.slot_date}, Time: ${b.slot_time}, Paid: ${b.amount_paid}, Status: ${b.status}, Source: ${b.source}`);
    });
  } catch (err) {
    console.error("Failed to query bookings:", err.message);
  }
}

main().catch(console.error);
