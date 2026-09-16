import { NextResponse } from "next/server";
import { reconcileTournamentPayments } from "@/lib/tournaments/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily sweep that completes any tournament entry whose payment was captured
 * while the entrant's browser was gone. This is the webhook-free safety net:
 * scheduled by vercel.json (once a day, which is what a Hobby plan allows).
 *
 * Guarded by CRON_SECRET when it is set, matching /api/cron/after-play.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await reconcileTournamentPayments(14);
    if (result.confirmed) console.warn("[cron reconcile] recovered entries", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron reconcile error]", err);
    return NextResponse.json({ error: "Reconcile failed." }, { status: 500 });
  }
}
