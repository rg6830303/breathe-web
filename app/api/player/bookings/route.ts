import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let result;
    try {
      result = await turso.execute({
        sql: `SELECT id, slot_date, slot_time, duration_min, court_number,
                     subtotal, gst, total, amount_paid, status, created_at
              FROM bookings
              WHERE user_id = ?
              ORDER BY slot_date DESC, slot_time DESC
              LIMIT 200`,
        args: [session.id],
      });
    } catch (dbErr) {
      console.error("[player bookings db error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    const bookings = result.rows.map((row) => ({
      id: String(row.id),
      court_number: Number(row.court_number) || 1,
      slot_date: String(row.slot_date),
      slot_time: String(row.slot_time).slice(0, 5),
      duration_minutes: Number(row.duration_min) || 60,
      subtotal: Number(row.subtotal) || 0,
      gst: Number(row.gst) || 0,
      total: Number(row.total) || Number(row.amount_paid) || 0,
      total_amount: Number(row.amount_paid) || Number(row.total) || 0,
      status: String(row.status),
      created_at: String(row.created_at),
    }));

    return NextResponse.json({ bookings });
  } catch (err: unknown) {
    console.error("[player bookings error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
