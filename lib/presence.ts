import { turso } from "@/lib/turso";

/**
 * Lightweight live-presence store backing the admin "Live traffic" view. Each
 * open tab heartbeats every ~20s into `live_presence`; the admin reads rows seen
 * within the last ~45s to show who's on the site right now (Shopify-style).
 */
let ensured = false;
export async function ensurePresenceTable(): Promise<void> {
  if (ensured) return;
  await turso
    .execute(
      `CREATE TABLE IF NOT EXISTS live_presence (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL DEFAULT 'guest',
        path TEXT,
        label TEXT,
        last_seen BIGINT NOT NULL
      )`,
    )
    .catch(() => {});
  await turso
    .execute("CREATE INDEX IF NOT EXISTS idx_live_presence_seen ON live_presence (last_seen)")
    .catch(() => {});
  ensured = true;
}

/** A visitor is "live" if seen within this window. */
export const LIVE_WINDOW_MS = 45_000;
/** Rows older than this are pruned. */
export const PRESENCE_TTL_MS = 10 * 60_000;
