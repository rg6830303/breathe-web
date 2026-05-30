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
        sql: `SELECT id, slot_date, slot_time, duration_min as duration_minutes, amount_paid as total_amount, status, created_at,
                     COALESCE((
                       SELECT COUNT(*) FROM bookings b2 
                       WHERE b2.slot_date = b.slot_date 
                         AND b2.slot_time = b.slot_time 
                         AND b2.status = 'confirmed' 
                         AND b2.created_at <= b.created_at
                     ), 1) as court_number
              FROM bookings b 
              WHERE user_id = ? 
              ORDER BY slot_date DESC, slot_time DESC 
              LIMIT 100`,
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
      duration_minutes: Number(row.duration_minutes) || 60,
      price: Number(row.total_amount),
      subtotal: Math.round(Number(row.total_amount) * 0.847),
      gst: Math.round(Number(row.total_amount) * 0.153),
      total_amount: Number(row.total_amount),
      status: String(row.status),
      created_at: String(row.created_at),
    }));

    return NextResponse.json({ bookings });
  } catch (err: unknown) {
    console.error("[player bookings error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
