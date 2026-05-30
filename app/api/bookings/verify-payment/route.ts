import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { getSlotPrice, calculateTotals } from "@/lib/pricing";

export const runtime = "nodejs";

type SlotInput = { date: string; time: string; court: number };
type AddonInput = { id: string; label: string; price: number; qty?: number };

export async function POST(req: Request) {
  try {
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

    // Get user details
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

    for (const s of slots) {
      const price = getSlotPrice(s.time);
      const totals = calculateTotals(price, addonTotal / Math.max(slots.length, 1));
      const id = uuid();
      bookingIds.push(id);

      // Serialize payment and addons info into the notes column
      const notesObj = {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        addons,
        subtotal: totals.subtotal,
        taxes: totals.taxes,
        original_court: s.court
      };

      try {
        await turso.execute({
          sql: `INSERT INTO bookings (
            id, user_id, slot_date, slot_time, duration_min,
            guest_name, guest_phone, guest_email, amount_paid,
            status, source, notes, created_at
          ) VALUES (?, ?, ?, ?, 60, ?, ?, ?, ?, 'confirmed', 'online', ?, ?)`,
          args: [
            id,
            session.id,
            s.date,
            s.time,
            userName,
            userPhone,
            userEmail,
            Math.round(totals.total),
            JSON.stringify(notesObj),
            now
          ],
        });
      } catch (insertErr) {
        console.error("[verify-payment db-insert error]", insertErr);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
      }

      // Sync booking to Supabase
      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          await supabase.from("bookings").insert({
            id,
            user_id: session.id,
            slot_date: s.date,
            slot_time: s.time,
            duration_min: 60,
            guest_name: userName,
            guest_phone: userPhone,
            guest_email: userEmail,
            amount_paid: Math.round(totals.total),
            status: "confirmed",
            source: "online",
            notes: JSON.stringify(notesObj),
            created_at: now
          });
        }
      } catch (sbErr) {
        console.error("[verify-payment supabase sync error]", sbErr);
      }
    }

    // Try to perform notification triggers asynchronously if notifyBookingConfirmed is set up
    try {
      const { notifyBookingConfirmed } = require("@/lib/notifications");
      const { waitUntil } = require("@vercel/functions");
      if (notifyBookingConfirmed && waitUntil) {
        for (const s of slots) {
          const price = getSlotPrice(s.time);
          const totals = calculateTotals(price, addonTotal / Math.max(slots.length, 1));
          waitUntil(
            notifyBookingConfirmed({
              id: bookingIds[0], // use the first generated booking ID as main reference
              userEmail,
              userName,
              userPhone: userPhone || undefined,
              slotDate: s.date,
              slotTime: s.time,
              durationMin: 60,
              amount: Math.round(totals.total)
            })
          ).catch((e: unknown) => console.error("[notify error]", e));
        }
      }
    } catch (notifErr) {
      // notification modules might not be created or fully imported yet; ignore and return success
      console.warn("Notifications deferred or module not loaded yet.", notifErr);
    }

    return NextResponse.json({ ok: true, bookingIds });
  } catch (err: unknown) {
    console.error("[verify-payment error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
