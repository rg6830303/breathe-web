import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { refundPayment, razorpayConfigured } from "@/lib/razorpay";
import { adjustCredit, SLOT_MINUTES } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 30;

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
      // Look up the booking so we can reverse the money + notify the customer.
      let row: Record<string, unknown> | undefined;
      try {
        const r = await turso.execute({
          sql: "SELECT id, user_id, slot_date, slot_time, court_number, amount_paid, duration_min, notes, guest_name, guest_email, status FROM bookings WHERE id = ? LIMIT 1",
          args: [bookingId],
        });
        row = r.rows[0] as Record<string, unknown> | undefined;
      } catch (dbErr) {
        console.error("[admin cancel lookup error]", dbErr);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
      }
      if (!row) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      if (String(row.status) !== "confirmed") {
        return NextResponse.json({ ok: true, mode: "booking", note: "already cancelled" });
      }

      const now = Date.now();
      try {
        await turso.execute({
          sql: "UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?",
          args: [now, bookingId],
        });
      } catch (dbErr) {
        console.error("[admin cancel booking db error]", dbErr);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
      }

      // Reverse the money: Razorpay refund for paid bookings, or restore prepaid
      // credit for bulk-pass bookings. Best-effort — the cancellation stands either way.
      let refunded = false;
      try {
        let notesObj: Record<string, unknown> = {};
        try { notesObj = row.notes ? JSON.parse(String(row.notes)) : {}; } catch { notesObj = {}; }
        const paymentId = typeof notesObj.razorpay_payment_id === "string" ? notesObj.razorpay_payment_id : "";
        const paidWithCredit = notesObj.paid_with === "bulk_credit";
        const amountPaid = row.amount_paid ? Number(row.amount_paid) : 0;
        const userId = row.user_id ? String(row.user_id) : "";
        if (paidWithCredit && userId) {
          const mins = row.duration_min ? Number(row.duration_min) : SLOT_MINUTES;
          await adjustCredit(userId, mins, `Admin cancel refund ${bookingId.slice(0, 8)}`);
          refunded = true;
        } else if (paymentId && amountPaid > 0 && razorpayConfigured()) {
          const rf = await refundPayment(paymentId, amountPaid * 100, { booking_id: bookingId });
          refunded = rf.status !== "failed";
        }
      } catch (refundErr) {
        console.error("[admin cancel refund error]", refundErr);
      }

      // Notify the customer + admins (best-effort, in the background).
      try {
        const { notifyBookingCancelled } = require("@/lib/notifications");
        const { waitUntil } = require("@vercel/functions");
        const run = notifyBookingCancelled({
          id: bookingId,
          userId: row.user_id ? String(row.user_id) : undefined,
          userEmail: row.guest_email ? String(row.guest_email) : "",
          userName: row.guest_name ? String(row.guest_name) : "there",
          slotDate: String(row.slot_date),
          slotTime: String(row.slot_time).slice(0, 5),
          courtNumber: row.court_number ? Number(row.court_number) : undefined,
          amount: row.amount_paid ? Number(row.amount_paid) : undefined,
          refunded,
        }).catch((e: unknown) => console.error("[admin cancel notify error]", e));
        if (waitUntil) waitUntil(run);
      } catch (e) {
        console.warn("[admin cancel notify dispatch skipped]", e);
      }

      return NextResponse.json({ ok: true, mode: "booking", refunded });
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
