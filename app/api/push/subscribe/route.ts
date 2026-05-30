import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ensure push_subscriptions table exists (lazy init)
async function ensureTable() {
  try {
    await turso.execute({
      sql: `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        endpoint TEXT NOT NULL UNIQUE,
        keys_p256dh TEXT NOT NULL,
        keys_auth TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      args: [],
    });
  } catch {
    // Table may already exist
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();

    const body = await req.json().catch(() => ({}));
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    // Optionally link to user if logged in
    const session = await getSession().catch(() => null);
    const userId = session?.id ?? null;

    const id = crypto.randomUUID();
    const now = Date.now();

    await turso.execute({
      sql: `INSERT OR REPLACE INTO push_subscriptions (id, user_id, endpoint, keys_p256dh, keys_auth, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, userId, endpoint, keys.p256dh, keys.auth, now],
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[push/subscribe error]", err);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { endpoint } = body;
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

    await turso.execute({
      sql: "DELETE FROM push_subscriptions WHERE endpoint = ?",
      args: [endpoint],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe DELETE error]", err);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
