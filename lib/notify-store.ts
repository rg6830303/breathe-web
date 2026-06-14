import { turso } from "@/lib/turso";

/**
 * Persistent in-app notification feed (the bell/inbox in the portals), separate
 * from the transient web-push toast. Each push we send is also recorded here so
 * users and admins can review past alerts even if the device was offline.
 */
export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: number | null;
  created_at: number;
};

let ensured = false;
export async function ensureNotificationsTable(): Promise<void> {
  if (ensured) return;
  // CRITICAL: created_at / read_at hold `Date.now()` (~1.7e12 ms), which
  // overflows Postgres INT4. They MUST be BIGINT — otherwise every INSERT
  // throws "integer out of range" and is swallowed below, leaving the inbox
  // permanently empty (the "notifications never show" bug). The main schema
  // (lib/db/ensure.ts) avoids this by rewriting INTEGER→BIGINT; this table is
  // created here, so it must declare BIGINT directly.
  await turso
    .execute(
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        title TEXT NOT NULL,
        body TEXT,
        url TEXT,
        read_at BIGINT,
        created_at BIGINT NOT NULL
      )`,
    )
    .catch(() => {});
  // Widen columns on databases where the table was already created as INT4.
  // No-op if already BIGINT.
  await turso.execute("ALTER TABLE notifications ALTER COLUMN created_at TYPE BIGINT").catch(() => {});
  await turso.execute("ALTER TABLE notifications ALTER COLUMN read_at TYPE BIGINT").catch(() => {});
  await turso
    .execute("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC)")
    .catch(() => {});
  await turso
    .execute("CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications (role, created_at DESC)")
    .catch(() => {});
  ensured = true;
}

/** Record a notification for one user, or for the shared admin feed. */
export async function recordNotification(n: {
  userId?: string | null;
  role: "user" | "admin";
  title: string;
  body?: string;
  url?: string;
}): Promise<void> {
  try {
    await ensureNotificationsTable();
    await turso.execute({
      sql: `INSERT INTO notifications (id, user_id, role, title, body, url, read_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
      args: [
        crypto.randomUUID(),
        n.role === "admin" ? null : n.userId ?? null,
        n.role,
        n.title,
        n.body ?? null,
        n.url ?? null,
        Date.now(),
      ],
    });
  } catch (e) {
    console.error("[notify-store record error]", e);
  }
}

/** List recent notifications for the caller (user feed or shared admin feed). */
export async function listNotifications(opts: {
  userId?: string;
  role: "user" | "admin";
  limit?: number;
}): Promise<NotificationRow[]> {
  try {
    await ensureNotificationsTable();
    const limit = Math.min(opts.limit ?? 30, 100);
    const r =
      opts.role === "admin"
        ? await turso.execute({
            sql: `SELECT id, title, body, url, read_at, created_at FROM notifications
                  WHERE role = 'admin' ORDER BY created_at DESC LIMIT ?`,
            args: [limit],
          })
        : await turso.execute({
            sql: `SELECT id, title, body, url, read_at, created_at FROM notifications
                  WHERE role = 'user' AND user_id = ? ORDER BY created_at DESC LIMIT ?`,
            args: [opts.userId ?? "", limit],
          });
    return r.rows as unknown as NotificationRow[];
  } catch (e) {
    console.error("[notify-store list error]", e);
    return [];
  }
}

/** Mark one (by id) or all of the caller's notifications as read. */
export async function markNotificationsRead(opts: {
  userId?: string;
  role: "user" | "admin";
  id?: string;
}): Promise<void> {
  try {
    await ensureNotificationsTable();
    const now = Date.now();
    if (opts.id) {
      await turso.execute({
        sql: "UPDATE notifications SET read_at = ? WHERE id = ? AND read_at IS NULL",
        args: [now, opts.id],
      });
      return;
    }
    if (opts.role === "admin") {
      await turso.execute({
        sql: "UPDATE notifications SET read_at = ? WHERE role = 'admin' AND read_at IS NULL",
        args: [now],
      });
    } else {
      await turso.execute({
        sql: "UPDATE notifications SET read_at = ? WHERE role = 'user' AND user_id = ? AND read_at IS NULL",
        args: [now, opts.userId ?? ""],
      });
    }
  } catch (e) {
    console.error("[notify-store markRead error]", e);
  }
}
