const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

// Manually parse .env.local to avoid needing external dotenv
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};
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

console.log("Connecting to:", url);

const client = createClient({ url, authToken });

async function main() {
  const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("Tables in database:", res.rows.map(r => r.name));
}

main().catch(console.error);
