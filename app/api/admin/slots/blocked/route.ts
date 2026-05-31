import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List blocked_slots rows. Optional filters:
 *   ?date=YYYY-MM-DD  → single date
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD → range
 *   (no params)       → today + next 30 days
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const date = params.get("date");
  const from = params.get("from");
  const to = params.get("to");

  let sql: string;
  let args: (string | number)[];
  if (date) {
    sql = "SELECT id, slot_date, slot_time, court_number, reason, created_at FROM blocked_slots WHERE slot_date = ? ORDER BY slot_date, slot_time";
    args = [date];
  } else if (from && to) {
    sql = "SELECT id, slot_date, slot_time, court_number, reason, created_at FROM blocked_slots WHERE slot_date BETWEEN ? AND ? ORDER BY slot_date, slot_time";
    args = [from, to];
  } else {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const futureStr = future.toISOString().slice(0, 10);
    sql = "SELECT id, slot_date, slot_time, court_number, reason, created_at FROM blocked_slots WHERE slot_date BETWEEN ? AND ? ORDER BY slot_date, slot_time";
    args = [today, futureStr];
  }

  try {
    const result = await turso.execute({ sql, args });
    return NextResponse.json({
      blocks: result.rows.map((r) => ({
        id: String(r.id),
        slot_date: String(r.slot_date),
        slot_time: r.slot_time ? String(r.slot_time).slice(0, 5) : null,
        court_number: r.court_number === null || r.court_number === undefined ? null : Number(r.court_number),
        reason: r.reason ? String(r.reason) : null,
        created_at: Number(r.created_at),
      })),
    });
  } catch (err) {
    console.error("[admin blocks list error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
