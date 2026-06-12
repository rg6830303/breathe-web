import { NextResponse } from "next/server";
import { getSession, getAdminSession } from "@/lib/auth";
import { sendPushToUser, sendPushToAdmins, pushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send a test push to the CURRENT account's own device(s). Lets a user confirm,
 * right from the dashboard toggle, that notifications actually DELIVER (separate
 * from the subscription merely saving). `sent` is the number of devices the push
 * reached — 0 means either no live subscription for this account or VAPID isn't
 * configured server-side.
 */
export async function POST() {
  if (!pushConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Push isn't configured on the server (VAPID_PRIVATE_KEY missing or invalid)." },
      { status: 503 },
    );
  }

  const admin = await getAdminSession().catch(() => null);
  const session = admin ? null : await getSession().catch(() => null);
  if (!admin && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = {
    title: "Test notification 🎾",
    body: "Push notifications are working on this device.",
    url: admin ? "/admin" : "/dashboard",
    tag: "test",
  };
  const sent = admin ? await sendPushToAdmins(payload) : await sendPushToUser(session!.id, payload);

  return NextResponse.json({ ok: true, sent });
}
