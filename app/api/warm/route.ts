import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keep-warm ping. An external free scheduler (e.g. cron-job.org) hits this every
 * few minutes so at least one serverless instance — and its pooled DB
 * connection — stays warm, eliminating most cold-start lag on the free tier.
 * Does one trivial indexed query so the DB path is warm too. Public + cheap.
 */
export async function GET() {
  const start = Date.now();
  let db = false;
  try {
    await turso.execute("SELECT 1 as ok");
    db = true;
  } catch {
    /* ignore — warmth is best-effort */
  }
  return NextResponse.json({ ok: true, db, ms: Date.now() - start });
}
