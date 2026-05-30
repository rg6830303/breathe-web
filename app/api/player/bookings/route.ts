import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await turso.execute({
    sql: `SELECT id, court_number, slot_date, slot_time, duration_minutes, price,
                 subtotal, gst, total_amount, status, created_at
          FROM bookings WHERE user_id = ? ORDER BY slot_date DESC, slot_time DESC LIMIT 100`,
    args: [session.id],
  });

  const bookings = result.rows.map((row) => ({
    id: String(row.id),
    court_number: Number(row.court_number),
    slot_date: String(row.slot_date),
    slot_time: String(row.slot_time).slice(0, 5),
    duration_minutes: Number(row.duration_minutes),
    price: Number(row.price),
    subtotal: Number(row.subtotal),
    gst: Number(row.gst),
    total_amount: Number(row.total_amount),
    status: String(row.status),
    created_at: String(row.created_at),
  }));

  return NextResponse.json({ bookings });
}
