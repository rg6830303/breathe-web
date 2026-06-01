import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

function getClient(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  client = createClient({ url, authToken });
  return client;
}

export const turso = {
  execute: ((arg: Parameters<Client["execute"]>[0]) => getClient().execute(arg)) as Client["execute"],
  batch: ((statements: Parameters<Client["batch"]>[0], mode?: Parameters<Client["batch"]>[1]) =>
    getClient().batch(statements, mode)) as Client["batch"],
};

/**
 * Idempotently ensure the first-class `blocked_slots` table exists. Called by
 * the admin block/unblock endpoints so closing slots works on a fresh database
 * without first hitting /api/db-init. NULL slot_time = whole day; NULL
 * court_number = all courts.
 */
let blockedSlotsEnsured = false;
export async function ensureBlockedSlotsTable(): Promise<void> {
  if (blockedSlotsEnsured) return;
  await getClient().execute(
    `CREATE TABLE IF NOT EXISTS blocked_slots (
      id TEXT PRIMARY KEY,
      slot_date TEXT NOT NULL,
      slot_time TEXT,
      court_number INTEGER,
      reason TEXT,
      created_at INTEGER NOT NULL
    )`,
  );
  blockedSlotsEnsured = true;
}
