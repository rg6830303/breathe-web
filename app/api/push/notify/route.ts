import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sendPushToAll, pushConfigured } from "@/lib/push";

export const runtime = "nodejs";

/** Admin-only broadcast push to the installed PWA. */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!pushConfigured()) {
      return NextResponse.json(
        { error: "Push is not configured. Add VAPID_PRIVATE_KEY to the environment." },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();
    const url = body.url ? String(body.url) : "/";
    const audience: "all" | "users" = body.audience === "users" ? "users" : "all";

    if (!title || !message) {
      return NextResponse.json({ error: "title and message are required" }, { status: 400 });
    }

    const sent = await sendPushToAll({ title, body: message, url, tag: "broadcast" }, audience);
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[push/notify error]", err);
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 });
  }
}
