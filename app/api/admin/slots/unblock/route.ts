import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const bookingId = body.booking_id ? String(body.booking_id) : null;

    if (bookingId) {
      try {
        await turso.execute({
          sql: "UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?",
          args: [Date.now(), bookingId],
        });
      } catch (dbErr) {
        console.error("[admin cancel booking db error]", dbErr);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const date = String(body.slot_date ?? "");
    const time = String(body.slot_time ?? "").slice(0, 5);
    if (!date || !time) {
      return NextResponse.json({ error: "Invalid unblock payload." }, { status: 400 });
    }

    try {
      // Delete exactly one admin block booking at this date/time slot to decrement capacity
      await turso.execute({
        sql: `DELETE FROM bookings WHERE id = (
          SELECT id FROM bookings 
          WHERE slot_date = ? 
            AND slot_time = ? 
            AND guest_name = 'Admin Block' 
          LIMIT 1
        )`,
        args: [date, time],
      });
    } catch (dbErr) {
      console.error("[admin unblock db error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[admin unblock error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
