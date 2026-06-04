import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import crypto from "node:crypto";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { getSlotPrice, calculateTotals } from "@/lib/pricing";
import { refundPayment, razorpayConfigured } from "@/lib/razorpay";

export const runtime = "nodejs";
export const maxDuration = 30;

type SlotInput = { date: string; time: string; court: number };
type AddonInput = { id: string; label: string; price: number; qty?: number };

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId ?? "");
    const paymentId = String(body.paymentId ?? "");
    const signature = String(body.signature ?? "");
    const slots: SlotInput[] = Array.isArray(body.slots) ? body.slots : [];
    const addons: AddonInput[] = Array.isArray(body.addons) ? body.addons : [];

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ error: "Razorpay not configured." }, { status: 500 });

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 401 });
    }

    // Bulk-hours package purchase: grant prepaid credit instead of booking slots.
    if (body.purchase === "bulk-12h") {
      const { adjustCredit, BULK_PACKAGE } = require("@/lib/credits");
      const balanceMin = await adjustCredit(session.id, BULK_PACKAGE.minutes, "Purchased 12h bulk pass");
      return NextResponse.json({ ok: true, purchased: "bulk-12h", balanceMin });
    }

    let user;
    try {
      const userRow = await turso.execute({
        sql: "SELECT full_name, email, phone FROM users WHERE id = ? LIMIT 1",
        args: [session.id],
      });
      user = userRow.rows[0];
    } catch (dbErr) {
      console.error("[verify-payment user fetch error]", dbErr);
    }

    const userName = user ? String(user.full_name) : session.name;
    const userEmail = user ? String(user.email) : session.email;
    const userPhone = user && user.phone ? String(user.phone) : null;

    const addonTotal = addons.reduce((sum, a) => sum + (Number(a.price) || 0) * (Number(a.qty) || 1), 0);
    const now = Date.now();
    const bookingIds: string[] = [];
    const slotCount = Math.max(slots.length, 1);

    // Refund the whole captured payment (full refund). Used when we cannot
    // honour the booking after the player has already paid.
    const refundFull = async (reason: string): Promise<boolean> => {
      if (!razorpayConfigured() || !paymentId) return false;
      try {
        const r = await refundPayment(paymentId, undefined, {
          reason: reason.slice(0, 60),
          order_id: orderId,
        });
        console.log("[verify-payment refunded]", r);
        return true;
      } catch (e) {
        console.error("[verify-payment refund error]", e);
        return false;
      }
    };

    const clampCourt = (c: unknown) =>
      Number.isFinite(Number(c)) ? Math.max(1, Math.min(9, Number(c))) : 1;

    // All-or-nothing availability pre-check: if ANY requested slot was taken
    // between order creation and payment confirmation, refund and book nothing
    // (the partial unique index is the hard backstop for races past this point).
    for (const s of slots) {
      const court = clampCourt(s.court);
      try {
        const ex = await turso.execute({
          sql: "SELECT id FROM bookings WHERE slot_date = ? AND slot_time = ? AND court_number = ? AND status = 'confirmed' LIMIT 1",
          args: [s.date, s.time, court],
        });
        if (ex.rows.length) {
          const refunded = await refundFull("slot taken before confirmation");
          return NextResponse.json(
            {
              error:
                "One or more of your slots was just taken. Your payment has been refunded — please pick another slot.",
              refunded,
            },
            { status: 409 },
          );
        }
      } catch (e) {
        console.error("[verify-payment pre-check error]", e);
      }
    }

    for (const s of slots) {
      const price = getSlotPrice(s.time);
      const totals = calculateTotals(price, addonTotal / slotCount);
      const id = uuid();
      bookingIds.push(id);
      const court = Number.isFinite(Number(s.court)) ? Math.max(1, Math.min(9, Number(s.court))) : 1;

      const notesObj = {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        addons,
        requested_court: court,
      };

      try {
        await turso.execute({
          sql: `INSERT INTO bookings (
            id, user_id, slot_date, slot_time, duration_min, court_number,
            guest_name, guest_phone, guest_email,
            subtotal, gst, total, amount_paid,
            status, source, notes, created_at
          ) VALUES (?, ?, ?, ?, 60, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'online', ?, ?)`,
          args: [
            id,
            session.id,
            s.date,
            s.time,
            court,
            userName,
            userPhone,
            userEmail,
            Math.round(totals.subtotal),
            Math.round(totals.taxes),
            Math.round(totals.total),
            Math.round(totals.total),
            JSON.stringify(notesObj),
            now,
          ],
        });
      } catch (insertErr) {
        console.error("[verify-payment db-insert error]", insertErr);
        const msg = String((insertErr as Error)?.message ?? "").toLowerCase();
        const isCollision = msg.includes("unique") || msg.includes("constraint");
        // Roll back any sibling slots already inserted in this request so we
        // never leave a partial booking, then refund the entire payment.
        for (const bid of bookingIds.filter((b) => b !== id)) {
          await turso
            .execute({
              sql: "UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?",
              args: [now, bid],
            })
            .catch(() => {});
        }
        const refunded = await refundFull(isCollision ? "slot collision" : "insert failed");
        return NextResponse.json(
          {
            error: isCollision
              ? "One or more of your slots was just taken. Your payment has been refunded — please pick another slot."
              : "We couldn't confirm your booking. Your payment has been refunded — please try again.",
            refunded,
          },
          { status: isCollision ? 409 : 500 },
        );
      }

      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          await supabase.from("bookings").insert({
            id,
            user_id: session.id,
            slot_date: s.date,
            slot_time: s.time,
            duration_min: 60,
            court_number: court,
            guest_name: userName,
            guest_phone: userPhone,
            guest_email: userEmail,
            subtotal: Math.round(totals.subtotal),
            gst: Math.round(totals.taxes),
            total: Math.round(totals.total),
            amount_paid: Math.round(totals.total),
            status: "confirmed",
            source: "online",
            notes: JSON.stringify(notesObj),
            created_at: now,
          });
        }
      } catch (sbErr) {
        console.error("[verify-payment supabase sync error]", sbErr);
      }
    }

    // Dispatch confirmation notifications. The FIRST booking's email is awaited
    // so we can report real delivery status to the UI (no more "email sent"
    // when it actually failed); any additional bookings + admin/telegram alerts
    // run best-effort in the background.
    let emailed = false;
    try {
      const { notifyBookingConfirmed } = require("@/lib/notifications");
      const { waitUntil } = require("@vercel/functions");
      if (notifyBookingConfirmed) {
        const payloadFor = (i: number) => {
          const s = slots[i];
          const price = getSlotPrice(s.time);
          const totals = calculateTotals(price, addonTotal / slotCount);
          const court = Number.isFinite(Number(s.court))
            ? Math.max(1, Math.min(9, Number(s.court)))
            : 1;
          return {
            id: bookingIds[i],
            userEmail,
            userName,
            userPhone: userPhone || undefined,
            slotDate: s.date,
            slotTime: s.time,
            durationMin: 60,
            amount: Math.round(totals.total),
            courtNumber: court,
            subtotal: Math.round(totals.subtotal),
            gst: Math.round(totals.taxes),
          };
        };

        if (slots.length > 0) {
          try {
            const result = await notifyBookingConfirmed(payloadFor(0));
            emailed = Boolean(result?.emailed);
          } catch (e) {
            console.error("[notify first error]", e);
          }
        }

        for (let i = 1; i < slots.length; i++) {
          const run = notifyBookingConfirmed(payloadFor(i)).catch((e: unknown) =>
            console.error("[notify error]", e),
          );
          if (waitUntil) waitUntil(run);
        }
      }
    } catch (notifErr) {
      console.warn("Notifications deferred or module not loaded yet.", notifErr);
    }

    return NextResponse.json({ ok: true, bookingIds, emailed });
  } catch (err: unknown) {
    console.error("[verify-payment error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
