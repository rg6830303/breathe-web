import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { getSession, getAdminSession } from "@/lib/auth";
import { ensurePushTable } from "@/lib/push";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`push-sub:${getClientIp(req)}`, 30, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    await ensurePushTable();

    const body = await req.json().catch(() => ({}));
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    // Infer the audience from the caller's session: admin devices are tagged
    // 'admin' so staff alerts can be targeted separately from player alerts.
    const admin = await getAdminSession().catch(() => null);
    const session = admin ? null : await getSession().catch(() => null);
    const role = admin ? "admin" : "user";
    const userId = admin ? admin.id : (session?.id ?? null);

    const id = crypto.randomUUID();
    const now = Date.now();

    await turso.execute({
      sql: `INSERT INTO push_subscriptions (id, user_id, role, endpoint, keys_p256dh, keys_auth, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
              user_id = excluded.user_id,
              role = excluded.role,
              keys_p256dh = excluded.keys_p256dh,
              keys_auth = excluded.keys_auth`,
      args: [id, userId, role, endpoint, keys.p256dh, keys.auth, now],
    });

    return NextResponse.json({ ok: true, id, role });
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
