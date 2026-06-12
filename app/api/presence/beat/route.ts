import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { getSession, getAdminSession } from "@/lib/auth";
import { ensurePresenceTable } from "@/lib/presence";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public heartbeat from every open tab (website + user portal + admin). Records
 * a single row per tab id with the current path; role/label are derived
 * SERVER-side from the session cookies so the client can't spoof them.
 */
export async function POST(req: NextRequest) {
  try {
    // Generous cap — a tab beats ~3×/min; this only stops abuse.
    const rl = await checkRateLimit(`presence:${getClientIp(req)}`, 120, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

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
