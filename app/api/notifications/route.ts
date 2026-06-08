import { NextRequest, NextResponse } from "next/server";
import { getSession, getAdminSession } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/lib/notify-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function whoami() {
  const admin = await getAdminSession().catch(() => null);
  if (admin) return { role: "admin" as const, userId: admin.id };
  const user = await getSession().catch(() => null);
  if (user) return { role: "user" as const, userId: user.id };
  return null;
}

/** List the caller's notification feed + unread count. */
export async function GET() {
  const me = await whoami();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await listNotifications({ role: me.role, userId: me.userId });
  const unread = items.filter((n) => !n.read_at).length;
  return NextResponse.json({ items, unread });
}

/** Mark one (by id) or all of the caller's notifications as read. */
export async function PATCH(req: NextRequest) {
  const me = await whoami();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  await markNotificationsRead({ role: me.role, userId: me.userId, id: body.id ? String(body.id) : undefined });
  return NextResponse.json({ ok: true });
}
