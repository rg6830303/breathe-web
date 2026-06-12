import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { refundPayment, razorpayConfigured } from "@/lib/razorpay";
import { adjustCredit, SLOT_MINUTES } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 30;

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
      sql: "SELECT id, user_id, slot_date, slot_time, status, court_number, amount_paid, duration_min, notes, guest_name, guest_email, sport FROM bookings WHERE id = ? LIMIT 1",
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
    await turso.batch([
      {
        sql: "UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?",
        args: [now, id],
      },
      {
        sql: "DELETE FROM booking_courts WHERE booking_id = ?",
        args: [id],
      }
    ], "write");
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

  // Reverse the money: refund the Razorpay payment for paid bookings, or
  // restore prepaid credit for bookings made with the bulk pass.
  let refund: { type: "razorpay" | "credit" | "none"; ok: boolean; detail?: string } = {
    type: "none",
    ok: false,
  };
  try {
    let notesObj: Record<string, unknown> = {};
    try {
      notesObj = row.notes ? (JSON.parse(String(row.notes)) as Record<string, unknown>) : {};
    } catch {
      notesObj = {};
    }
    const paymentId = typeof notesObj.razorpay_payment_id === "string" ? notesObj.razorpay_payment_id : "";
    const paidWithCredit = notesObj.paid_with === "bulk_credit";
    const amountPaid = row.amount_paid ? Number(row.amount_paid) : 0;

    if (paidWithCredit) {
      // Give the prepaid time back (this booking's duration, default one slot).
      const mins = row.duration_min ? Number(row.duration_min) : SLOT_MINUTES;
      await adjustCredit(session.id, mins, `Refund: cancelled booking ${id.slice(0, 8)}`);
      refund = { type: "credit", ok: true, detail: `${mins} min restored` };
    } else if (paymentId && amountPaid > 0 && razorpayConfigured()) {
      // amount_paid is in rupees; Razorpay refunds are in paise.
      const r = await refundPayment(paymentId, amountPaid * 100, { booking_id: id });
      refund = { type: "razorpay", ok: r.status !== "failed", detail: r.id };
    }
  } catch (refundErr) {
    console.error("[player cancel refund error]", refundErr);
    // Booking stays cancelled even if the refund call fails; surface ok:false
    // so the UI can tell the player a manual refund is being processed.
    refund = { type: refund.type === "none" ? "razorpay" : refund.type, ok: false };
  }

  // Cancellation email to the player + admin heads-up (best-effort).
  try {
    const { notifyBookingCancelled } = require("@/lib/notifications");
    const { waitUntil } = require("@vercel/functions");
    const run = notifyBookingCancelled({
      id,
      userId: session.id,
      userEmail: row.guest_email ? String(row.guest_email) : session.email,
      userName: row.guest_name ? String(row.guest_name) : session.name,
      slotDate,
      slotTime,
      courtNumber: row.court_number ? Number(row.court_number) : undefined,
      amount: row.amount_paid ? Number(row.amount_paid) : undefined,
      refunded: refund.ok,
      sport: row.sport ? String(row.sport) : undefined,
    }).catch((e: unknown) => console.error("[cancel notify error]", e));
    if (waitUntil) waitUntil(run);
  } catch (e) {
    console.warn("[cancel notify dispatch skipped]", e);
  }

  return NextResponse.json({ ok: true, refund });
}
