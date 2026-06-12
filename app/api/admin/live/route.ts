import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensurePresenceTable, LIVE_WINDOW_MS, PRESENCE_TTL_MS } from "@/lib/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { id: string; role: string; path: string; label: string; last_seen: number };

/** Admin-only: who is on the site right now (live traffic). */
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensurePresenceTable();
  const now = Date.now();

  // Prune long-stale rows so the table stays small.
  await turso
    .execute({ sql: "DELETE FROM live_presence WHERE last_seen < ?", args: [now - PRESENCE_TTL_MS] })
    .catch(() => {});

  let rows: Row[] = [];
  try {
    const r = await turso.execute({
      sql: "SELECT id, role, path, label, last_seen FROM live_presence WHERE last_seen >= ? ORDER BY last_seen DESC LIMIT 300",
      args: [now - LIVE_WINDOW_MS],
    });
    rows = r.rows.map((x) => ({
      id: String(x.id),
      role: String(x.role || "guest"),
      path: String(x.path || "/"),
      label: String(x.label || "Guest"),
      last_seen: Number(x.last_seen),
    }));
  } catch (e) {
    console.error("[admin/live read error]", e);
  }

  const byRole = { guest: 0, user: 0, admin: 0 } as Record<string, number>;
  const pathCounts = new Map<string, number>();
  for (const r of rows) {
    byRole[r.role] = (byRole[r.role] ?? 0) + 1;
    pathCounts.set(r.path, (pathCounts.get(r.path) ?? 0) + 1);
  }
  const topPaths = Array.from(pathCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const visitors = rows.slice(0, 60).map((r) => ({
    role: r.role,
    label: r.label,
    path: r.path,
    secondsAgo: Math.max(0, Math.round((now - r.last_seen) / 1000)),
  }));

  return NextResponse.json({
    total: rows.length,
    byRole,
    topPaths,
    visitors,
    now,
  });
}
