import webpush from "web-push";
import { turso } from "@/lib/turso";
import { VAPID_PUBLIC_KEY_DEFAULT } from "@/lib/push-public";

/**
 * Web-push delivery for the installed PWA (user + admin portals).
 *
 * Setup: the only secret you must add to the environment is VAPID_PRIVATE_KEY
 * (the matching public key is baked in / NEXT_PUBLIC_VAPID_PUBLIC_KEY). Optional
 * VAPID_SUBJECT (a mailto: or https URL identifying the sender).
 */
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY_DEFAULT;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:breathepickleball@gmail.com";

let configured = false;
if (PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  } catch (e) {
    console.error("[push] invalid VAPID config", e);
  }
}

export function pushConfigured(): boolean {
  return configured;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type SubRow = { endpoint: string; keys_p256dh: string; keys_auth: string };

/** Create the subscriptions table (idempotent) with the role column. */
export async function ensurePushTable(): Promise<void> {
  await turso
    .execute(
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        endpoint TEXT NOT NULL UNIQUE,
        keys_p256dh TEXT NOT NULL,
        keys_auth TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`,
    )
    .catch(() => {});
  // Back-fill the role column onto an older table that predates it.
  await turso.execute("ALTER TABLE push_subscriptions ADD COLUMN role TEXT NOT NULL DEFAULT 'user'").catch(() => {});
  // CRITICAL (Postgres): widen created_at to BIGINT. A legacy INTEGER (int4)
  // column overflows on Date.now() (~1.78e12) → every subscribe INSERT 500s,
  // which is exactly the "couldn't enable notifications" failure.
  await turso.execute("ALTER TABLE push_subscriptions ALTER COLUMN created_at TYPE BIGINT").catch(() => {});
}

async function deliver(rows: SubRow[], payload: PushPayload): Promise<number> {
  if (!configured || rows.length === 0) return 0;
  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    tag: payload.tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });
  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    rows.map(async (r) => {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.keys_p256dh, auth: r.keys_auth } },
          data,
        );
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        // 404/410 = subscription gone → prune it so the table stays clean.
        if (code === 404 || code === 410) dead.push(r.endpoint);
        else console.error("[push] send error", code, (err as Error)?.message);
      }
    }),
  );
  if (dead.length) {
    for (const endpoint of dead) {
      await turso.execute({ sql: "DELETE FROM push_subscriptions WHERE endpoint = ?", args: [endpoint] }).catch(() => {});
    }
  }
  return sent;
}

async function fetchSubs(where: string, args: unknown[]): Promise<SubRow[]> {
  try {
    const r = await turso.execute({
      sql: `SELECT endpoint, keys_p256dh, keys_auth FROM push_subscriptions ${where} LIMIT 2000`,
      args: args as never[],
    });
    return r.rows as unknown as SubRow[];
  } catch {
    return [];
  }
}

/** Push to one user's installed devices. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configured || !userId) return 0;
  return deliver(await fetchSubs("WHERE user_id = ?", [userId]), payload);
}

/** Push to every admin device (role = 'admin'). */
export async function sendPushToAdmins(payload: PushPayload): Promise<number> {
  if (!configured) return 0;
  return deliver(await fetchSubs("WHERE role = 'admin'", []), payload);
}

/** Broadcast — everyone, or only players. */
export async function sendPushToAll(payload: PushPayload, audience: "all" | "users" = "all"): Promise<number> {
  if (!configured) return 0;
  const where = audience === "users" ? "WHERE role = 'user'" : "";
  return deliver(await fetchSubs(where, []), payload);
}
