import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { getSession, getAdminSession } from "@/lib/auth";
import { ensurePresenceTable } from "@/lib/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public heartbeat from every open tab (website + user portal + admin). Records
 * a single row per tab id with the current path; role/label are derived
 * SERVER-side from the session cookies so the client can't spoof them.
 *
 * Deliberately CHEAP — exactly ONE DB upsert per call (no rate-limit table
 * read/write): it's keyed by the tab id so rows never grow unbounded, and the
 * admin reader prunes stale ones. Presence must never add load that could
 * pressure the free-tier connection pool.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").slice(0, 64);
    const path = String(body.path ?? "/").slice(0, 200);
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    await ensurePresenceTable();

    const admin = await getAdminSession().catch(() => null);
    const user = admin ? null : await getSession().catch(() => null);
    const role = admin ? "admin" : user ? "user" : "guest";
    const label = admin ? admin.email : user ? user.name : "Guest";
    const now = Date.now();

    await turso.execute({
      sql: `INSERT INTO live_presence (id, role, path, label, last_seen)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              role = excluded.role,
              path = excluded.path,
              label = excluded.label,
              last_seen = excluded.last_seen`,
      args: [id, role, path, label, now],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[presence/beat error]", err);
    // Never surface an error to the page — presence is best-effort.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
