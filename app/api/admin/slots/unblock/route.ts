import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

/**
 * Unblock / cancel.
 *
 * Three modes (first non-empty wins):
 *   1. { booking_id }            → cancel a real booking (status → 'cancelled')
 *   2. { blocked_id }            → delete a blocked_slots row by id
 *   3. { slot_date, slot_time, court_number } → delete the matching blocked_slots row
 *
 * The (date, time, court) lookup also matches "entire day" / "all courts"
 * NULL rows so a single full-day block can be reverted from the court grid.
 */
export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const bookingId = body.booking_id ? String(body.booking_id) : null;
    const blockedId = body.blocked_id ? String(body.blocked_id) : null;

    if (bookingId) {
      try {
        await turso.execute({
          sql: "UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?",
          args: [Date.now(), bookingId],
        });
      } catch (dbErr) {
        console.error("[admin cancel booking db error]", dbErr);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, mode: "booking" });
    }

    if (blockedId) {
      try {
        await turso.execute({
          sql: "DELETE FROM blocked_slots WHERE id = ?",
          args: [blockedId],
        });
        try {
          const { supabase, hasSupabase } = require("@/lib/supabase");
          if (hasSupabase) await supabase.from("blocked_slots").delete().eq("id", blockedId);
        } catch (sbErr) {
          console.error("[admin unblock supabase sync error]", sbErr);
        }
      } catch (dbErr) {
        console.error("[admin unblock db error]", dbErr);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, mode: "blocked-by-id" });
    }

    const date = String(body.slot_date ?? "");
    const time = String(body.slot_time ?? "").slice(0, 5);
    const court = Number(body.court_number);
    if (!date || !time || !Number.isFinite(court) || court < 1 || court > 9) {
      return NextResponse.json({ error: "Invalid unblock payload." }, { status: 400 });
    }

    try {
      // Match exact slot OR an entire-day block on that court OR an entire-day
      // all-courts block. Delete one matching row at a time so admin can
      // remove a single court from an all-courts block by repeating the call.
      const candidates = await turso.execute({
        sql: `SELECT id FROM blocked_slots
              WHERE slot_date = ?
                AND (court_number IS NULL OR court_number = ?)
                AND (slot_time IS NULL OR slot_time = ?)
              ORDER BY
                CASE WHEN slot_time = ? AND court_number = ? THEN 0 ELSE 1 END,
                created_at DESC
              LIMIT 1`,
        args: [date, court, time, time, court],
      });
      const id = candidates.rows[0]?.id ? String(candidates.rows[0].id) : null;
      if (id) {
        await turso.execute({ sql: "DELETE FROM blocked_slots WHERE id = ?", args: [id] });
        try {
          const { supabase, hasSupabase } = require("@/lib/supabase");
          if (hasSupabase) await supabase.from("blocked_slots").delete().eq("id", id);
        } catch (sbErr) {
          console.error("[admin unblock supabase sync error]", sbErr);
        }
      }
    } catch (dbErr) {
      console.error("[admin unblock db error]", dbErr);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode: "blocked-by-shape" });
  } catch (err: unknown) {
    console.error("[admin unblock error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
