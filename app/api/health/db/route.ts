import { NextResponse } from "next/server";
import { turso, USE_PG, dbConnInfo } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight DB health check: reports which backend is live, runs a trivial
 * query, and reports whether POSTGRES_URL is the serverless-safe Transaction
 * pooler. NO secret is returned — only the port and a coarse verdict. Use this
 * to confirm the connection-limit fix: a healthy serverless config shows
 * { ok: true, backend: "postgres", db: { pooled: true, port: "6543" } }.
 * If `pooled` is false, the URL points at the direct/session connection and will
 * exhaust the free-tier connection limit under load (slow / failing logins).
 */
export async function GET() {
  let ok = false;
  const timing: { connectMs?: number } = {};
  const start = Date.now();
  try {
    const r = await turso.execute("SELECT 1 as ok");
    ok = Number((r.rows?.[0] as { ok?: number })?.ok) === 1;
    timing.connectMs = Date.now() - start;
  } catch (e) {
    console.error("[health/db] query failed", e);
  }
  const info = dbConnInfo();
  return NextResponse.json(
    {
      ok,
      backend: USE_PG ? "postgres" : "turso",
      db: { pooled: info.pooled, endpoint: info.endpoint, port: info.port, configured: info.configured },
      ...timing,
    },
    { status: ok ? 200 : 503 },
  );
}
