import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

const CANCELLATION_CUTOFF_MS = 4 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.booking_id ?? "");
  if (!id) return NextResponse.json({ error: "Missing booking id." }, { status: 400 });

  let row;
  try {
    const result = await turso.execute({
      sql: "SELECT id, user_id, slot_date, slot_time, status FROM bookings WHERE id = ? LIMIT 1",
      args: [id],
    });
    row = result.rows[0];
  } catch (err) {
    console.error("[player cancel lookup error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  if (!row) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (String(row.user_id) !== session.id) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  if (String(row.status) !== "confirmed") {
    return NextResponse.json({ error: "Booking already cancelled or completed." }, { status: 400 });
  }

  const slotDate = String(row.slot_date);
  const slotTime = String(row.slot_time).slice(0, 5);
  const slotMs = new Date(`${slotDate}T${slotTime}:00+05:30`).getTime();
  if (slotMs - Date.now() < CANCELLATION_CUTOFF_MS) {
    return NextResponse.json(
      { error: "Cancellations close 4 hours before the slot. Please contact us if you need help." },
      { status: 400 },
    );
  }

  const now = Date.now();
  try {
    await turso.execute({
      sql: "UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?",
      args: [now, id],
    });
  } catch (err) {
    console.error("[player cancel update error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase) {
      await supabase
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: now })
        .eq("id", id);
    }
  } catch (sbErr) {
    console.error("[player cancel supabase sync error]", sbErr);
  }

  return NextResponse.json({ ok: true });
}
