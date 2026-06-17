import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import crypto from "node:crypto";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { calculateTotals } from "@/lib/pricing";
import { priceForRange, rangesOverlap } from "@/lib/slots";
import { refundPayment, razorpayConfigured } from "@/lib/razorpay";
import { adjustCredit, BULK_PACKAGE } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 30;

type Sport = "pickleball" | "cricket" | "badminton";
type SlotInput = { date: string; time: string; court: number; durationMin?: number; sport?: Sport };
const slotDur = (s: SlotInput) => Math.max(30, Number(s.durationMin) || 60);
const slotSport = (s: SlotInput, fallback: Sport): Sport =>
  s.sport && ["pickleball", "cricket", "badminton"].includes(s.sport) ? s.sport : fallback;
type AddonInput = { id: string; label: string; price: number; qty?: number };

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sport: "pickleball" | "cricket" | "badminton" = ["pickleball", "cricket", "badminton"].includes(
      String(body.sport),
    )
      ? (body.sport as "pickleball" | "cricket" | "badminton")
      : "pickleball";
    let orderId = String(body.orderId ?? "");
    let paymentId = String(body.paymentId ?? "");
    const signature = String(body.signature ?? "");
    const slots: SlotInput[] = Array.isArray(body.slots) ? body.slots : [];
    const addons: AddonInput[] = Array.isArray(body.addons) ? body.addons : [];


    const secret = process.env.RAZORPAY_KEY_SECRET;
    // SECURE PATH (secret configured): we created a real order, so we MUST verify
    // the HMAC signature of order_id|payment_id. DIRECT PATH (single-key setup,
    // no secret): the client checkout returns only a payment id — accept it
    // without signature verification (the original behaviour). Add the
    // RAZORPAY_KEY_SECRET env var to upgrade to full server-side verification.
    if (secret) {
      if (!orderId || !paymentId || !signature) {
        return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
      }
      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
      if (expected !== signature) {
        return NextResponse.json({ error: "Invalid payment signature." }, { status: 401 });
      }
    } else if (!paymentId) {
      // Direct checkout still returns a payment id on success; require it as
      // minimal proof the gateway ran.
      return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
    }

    // Bulk-hours package purchase: grant prepaid credit instead of booking slots.
    if (body.purchase === "bulk-12h") {
      const balanceMin = await adjustCredit(session.id, BULK_PACKAGE.minutes, "Purchased 13h bulk pass");
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

    const normalizedSlots = slots.map((s) => {
      const sSport = slotSport(s, sport);
      const court = sSport === "cricket" || sSport === "badminton" ? 1 : s.court;
      return { ...s, court, sport: sSport };
    });

    // All-or-nothing availability pre-check: if ANY requested slot was taken
    // between order creation and payment confirmation, refund and book nothing
    // (the partial unique index is the hard backstop for races past this point).
    for (const s of normalizedSlots) {
      try {
        const ex = await turso.execute({
          sql: "SELECT slot_time, duration_min, court_number, notes FROM bookings WHERE slot_date = ? AND status = 'confirmed'",
          args: [s.date],
        });
        const clash = ex.rows.some((row) => {
          const rowNotes = row.notes ? JSON.parse(String(row.notes)) : {};
          const rowSport = rowNotes.sport || "pickleball";
          const rowCourt = Number(row.court_number) || 1;

          // Resolve courts occupied by existing booking
          const rowCourts = rowSport === "cricket" ? [1, 2, 3] : [rowCourt];
          // Resolve courts requested by the new booking (per its own sport)
          const requestedCourts = s.sport === "cricket" ? [1, 2, 3] : [s.court];

          const sharesCourt = requestedCourts.some((c) => rowCourts.includes(c));

          return (
            sharesCourt &&
            rangesOverlap(s.time, slotDur(s), String(row.slot_time), Number(row.duration_min) || 60)
          );
        });

        if (clash) {
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

    let i = 0;
    for (const s of slots) {
      const sSport = slotSport(s, sport);
      const duration = slotDur(s);
      const price = priceForRange(sSport, s.date, s.time, duration);
      const totals = calculateTotals(price, addonTotal / slotCount);
      const id = uuid();
      bookingIds.push(id);
      // Cricket/Badminton always occupy Court 1; pickleball keeps its court.
      const court = sSport === "cricket" || sSport === "badminton" ? 1 : clampCourt(s.court);

      const notesObj = {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        addons,
        requested_court: court,
        sport: sSport,
      };

      // Pay exactly ₹200 advance for the first slot; subsequent slots in this order have ₹0 paid online.
      const amtPaidForThisBooking = i === 0 ? 200 : 0;
      i++;

      try {
        await turso.execute({
          sql: `INSERT INTO bookings (
            id, user_id, slot_date, slot_time, duration_min, court_number,
            guest_name, guest_phone, guest_email,
            subtotal, gst, total, amount_paid,
            status, source, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'online', ?, ?)`,
          args: [
            id,
            session.id,
            s.date,
            s.time,
            duration,
            court,
            userName,
            userPhone,
            userEmail,
            Math.round(totals.subtotal),
            Math.round(totals.taxes),
            Math.round(totals.total),
            amtPaidForThisBooking,
            JSON.stringify(notesObj),
            now,
          ],
        });
      } catch (insertErr) {
        console.error("[verify-payment db-insert error]", insertErr);
        const msg = String((insertErr as Error)?.message ?? "").toLowerCase();
        const isCollision = msg.includes("unique") || msg.includes("constraint");
        for (const bid of bookingIds.filter((b) => b !== id)) {
          await turso.batch([
            {
              sql: "UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?",
              args: [now, bid],
            },
            {
              sql: "DELETE FROM booking_courts WHERE booking_id = ?",
              args: [bid],
            }
          ], "write").catch(() => {});
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
            duration_min: duration,
            court_number: court,
            guest_name: userName,
            guest_phone: userPhone,
            guest_email: userEmail,
            subtotal: Math.round(totals.subtotal),
            gst: Math.round(totals.taxes),
            total: Math.round(totals.total),
            amount_paid: amtPaidForThisBooking,
            status: "confirmed",
            source: "online",
            sport: sSport,
            notes: JSON.stringify(notesObj),
            created_at: now,
          });
        }
      } catch (sbErr) {
        console.error("[verify-payment supabase sync error]", sbErr);
      }
    }

    // Dispatch confirmation notifications IN THE BACKGROUND. The PDF render +
    // SMTP send can take a few seconds; blocking the response on them made the
    // confirmation feel slow and, if the PDF hung, killed the request before
    // the email left (the "booking confirmed but no email" bug). waitUntil lets
    // the function return instantly and finish the emails after the response.
    const payloadFor = (idx: number) => {
      const s = slots[idx];
      const sSport = slotSport(s, sport);
      const duration = slotDur(s);
      const price = priceForRange(sSport, s.date, s.time, duration);
      const totals = calculateTotals(price, addonTotal / slotCount);
      const court = sSport === "cricket" || sSport === "badminton"
        ? 1
        : Number.isFinite(Number(s.court))
          ? Math.max(1, Math.min(9, Number(s.court)))
          : 1;
      return {
        id: bookingIds[idx],
        userId: session.id,
        userEmail,
        userName,
        userPhone: userPhone || undefined,
        slotDate: s.date,
        slotTime: s.time,
        durationMin: duration,
        amount: Math.round(totals.total),
        courtNumber: court,
        subtotal: Math.round(totals.subtotal),
        gst: Math.round(totals.taxes),
        amountPaid: 200,
        sport: sSport,
      };
    };

    const dispatchNotifications = (async () => {
      try {
        const { notifyBookingConfirmed } = require("@/lib/notifications");
        if (!notifyBookingConfirmed) return;
        // ONE consolidated confirmation per order. The ₹200 advance is a single
        // flat charge for the whole booking (any number of slots), so we send a
        // single email/notification showing the grand total, the ₹200 paid, and
        // the balance due at the venue — never a per-slot "₹0 advance".
        const perSlot = slots.map((_, idx) => payloadFor(idx));
        const grandTotal = perSlot.reduce((a, p) => a + p.amount, 0);
        const grandSubtotal = perSlot.reduce((a, p) => a + (p.subtotal || 0), 0);
        const slotsSummary =
          perSlot.length > 1
            ? perSlot
                .map((p) => `${p.slotDate} · ${p.slotTime} (${p.durationMin}m, Court ${p.courtNumber})`)
                .join("; ")
            : undefined;
        const consolidated = {
          ...perSlot[0],
          amount: grandTotal,
          subtotal: grandSubtotal,
          amountPaid: 200,
          slotsSummary,
        };
        await notifyBookingConfirmed(consolidated).catch((e: unknown) =>
          console.error("[notify error]", e),
        );
      } catch (notifErr) {
        console.error("[verify-payment notify dispatch error]", notifErr);
      }
    })();

    try {
      const { waitUntil } = require("@vercel/functions");
      if (waitUntil) waitUntil(dispatchNotifications);
      else await dispatchNotifications;
    } catch {
      // No waitUntil available (non-Vercel) → fall back to awaiting so the
      // email still sends, just synchronously.
      await dispatchNotifications;
    }

    return NextResponse.json({ ok: true, bookingIds });
  } catch (err: unknown) {
    console.error("[verify-payment error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
