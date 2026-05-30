import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { getAdminSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Only admins can send broadcast push notifications
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, message, url } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "title and message are required" }, { status: 400 });
    }

    // Fetch all active subscriptions
    let subs;
    try {
      subs = await turso.execute({
        sql: "SELECT endpoint, keys_p256dh, keys_auth FROM push_subscriptions LIMIT 1000",
        args: [],
      });
    } catch {
      return NextResponse.json({ error: "No subscriptions table found" }, { status: 500 });
    }

    if (subs.rows.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "No subscribers yet" });
    }

    // NOTE: True web push requires a VAPID library (web-push).
    // This route prepares the payload structure and returns subscriber count.
    // To enable actual delivery: install `npm i web-push`, add VAPID_PUBLIC_KEY
    // and VAPID_PRIVATE_KEY env vars, and replace this stub with web-push.sendNotification().

    const payload = JSON.stringify({
      title,
      body: message,
      url: url ?? "/",
      icon: "/icons/icon-192.png",
    });

    console.log(`[push/notify] Would send to ${subs.rows.length} subscribers:`, payload);

    return NextResponse.json({
      ok: true,
      sent: subs.rows.length,
      note: "Payload prepared. Add web-push VAPID keys to enable actual delivery.",
    });
  } catch (err) {
    console.error("[push/notify error]", err);
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 });
  }
}
