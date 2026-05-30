import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const bookingId = body.booking_id ? String(body.booking_id) : null;

  if (bookingId) {
    await turso.execute({
      sql: "UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
      args: [bookingId],
    });
    return NextResponse.json({ ok: true });
  }

  const court = Number(body.court_number);
  const date = String(body.slot_date ?? "");
  const time = String(body.slot_time ?? "").slice(0, 5);
  if (![1, 2, 3].includes(court) || !date || !time) {
    return NextResponse.json({ error: "Invalid unblock payload." }, { status: 400 });
  }

  await turso.execute({
    sql: "DELETE FROM blocked_slots WHERE court_number = ? AND slot_date = ? AND substr(slot_time, 1, 5) = ?",
    args: [court, date, time],
  });

  return NextResponse.json({ ok: true });
}
