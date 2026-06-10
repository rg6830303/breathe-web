import { NextResponse } from "next/server";
import { turso, USE_PG } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight DB health check: reports which backend is live and runs a trivial
 * query. No secrets or connection details are returned. Handy for confirming the
 * Turso→Supabase cutover at a glance: /api/health/db should show
 * { ok: true, backend: "postgres" }.
 */
export async function GET() {
  let ok = false;
  try {
    const r = await turso.execute("SELECT 1 as ok");
    ok = Number((r.rows?.[0] as { ok?: number })?.ok) === 1;
  } catch (e) {
    console.error("[health/db] query failed", e);
  }
  return NextResponse.json(
    { ok, backend: USE_PG ? "postgres" : "turso" },
    { status: ok ? 200 : 503 },
  );
}
