import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { reconcileTournamentPayments } from "@/lib/tournaments/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * "Reconcile now" — the same sweep the daily cron runs, on demand.
 *
 * Without a webhook this is how an entry paid for minutes ago gets confirmed
 * without waiting for the nightly run: the admin presses it and any captured
 * payment sitting against a pending entry is completed immediately.
 */
export async function POST() {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const result = await reconcileTournamentPayments(30);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[admin reconcile error]", err);
    return NextResponse.json({ error: "Could not reconcile payments." }, { status: 500 });
  }
}
