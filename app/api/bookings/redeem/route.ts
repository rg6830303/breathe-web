import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ensureSchema } from "@/lib/db/ensure";
import { turso } from "@/lib/turso";
import { getCreditBalance, adjustCredit, SLOT_MINUTES } from "@/lib/credits";
import { rangesOverlap, isWithinHours } from "@/lib/slots";
import { bookingRequestSchema, formatZodError } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 30;

type SlotInput = { date: string; time: string; court: number; durationMin?: number };
const slotDur = (s: SlotInput) => Math.max(30, Number(s.durationMin) || SLOT_MINUTES);

/**
 * Book slots using the player's prepaid bulk-hours credit — NO payment.
 * Verifies the balance covers the requested slots, books them, and deducts
 * the credit. Skips any slot that's already taken.
 */
export async function POST(req: Request) {
  try {
    await ensureSchema();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkRateLimit(`redeem:${getClientIp(req)}`, 20, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const slots: SlotInput[] = Array.isArray(body.slots) ? body.slots : [];
    const sport = ["pickleball", "cricket", "badminton"].includes(String(body.sport))
      ? String(body.sport)
      : "pickleball";
    const parsed = bookingRequestSchema.safeParse({ slots, addons: [] });
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    for (const s of slots) {
      if (!isWithinHours(s.time, slotDur(s))) {
        return NextResponse.json({ error: "That time is outside opening hours." }, { status: 400 });
      }
    }

    const neededMin = slots.reduce((sum, s) => sum + slotDur(s), 0);
    const balance = await getCreditBalance(session.id);
    if (balance < neededMin) {
      return NextResponse.json(
        { error: `Not enough prepaid hours. You need ${neededMin / 60}h but have ${Math.round((balance / 60) * 10) / 10}h.` },
        { status: 400 },
      );
    }

    // Fetch the user's display details for guest fields.
    let userName = session.name;
    let userEmail = session.email;
    let userPhone: string | null = null;
    try {
      const r = await turso.execute({ sql: "SELECT full_name, email, phone FROM users WHERE id = ? LIMIT 1", args: [session.id] });
      const u = r.rows[0];
      if (u) { userName = String(u.full_name); userEmail = String(u.email); userPhone = u.phone ? String(u.phone) : null; }
    } catch (e) { console.error("[redeem user fetch error]", e); }

    const now = Date.now();
    const bookingIds: string[] = [];
    const bookedSlots: { id: string; date: string; time: string; court: number; durationMin: number }[] = [];
    let booked = 0;
    let bookedMin = 0;

    for (const s of slots) {
      const court = Number.isFinite(Number(s.court)) ? Math.max(1, Math.min(9, Number(s.court))) : 1;
      const duration = slotDur(s);
      // Skip if the range (incl. ±30-min extensions) overlaps a confirmed booking.
      try {
        const ex = await turso.execute({
          sql: "SELECT slot_time, duration_min FROM bookings WHERE slot_date = ? AND court_number = ? AND status = 'confirmed'",
          args: [s.date, court],
        });
        const clash = ex.rows.some((row) =>
          rangesOverlap(s.time, duration, String(row.slot_time), Number(row.duration_min) || 60),
        );
        if (clash) continue;
      } catch (e) { console.error("[redeem conflict check]", e); }

      const id = uuid();
      const notes = JSON.stringify({ paid_with: "bulk_credit" });
      try {
        await turso.execute({
          sql: `INSERT INTO bookings (
            id, user_id, slot_date, slot_time, duration_min, court_number,
            guest_name, guest_phone, guest_email,
            subtotal, gst, total, amount_paid, status, source, sport, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'confirmed', 'online', ?, ?, ?)`,
          args: [id, session.id, s.date, s.time, duration, court, userName, userPhone, userEmail, sport, notes, now],
        });
        bookingIds.push(id);
        bookedSlots.push({ id, date: s.date, time: s.time, court, durationMin: duration });
        booked++;
        bookedMin += duration;
      } catch (e) {
        console.error("[redeem insert error]", e);
        continue;
      }
      // Mirror to Supabase.
      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          await supabase.from("bookings").insert({
            id, user_id: session.id, slot_date: s.date, slot_time: s.time, duration_min: duration, sport,
            court_number: court, guest_name: userName, guest_phone: userPhone, guest_email: userEmail,
            subtotal: 0, gst: 0, total: 0, amount_paid: 0, status: "confirmed", source: "online", notes, created_at: now,
          });
        }
      } catch (e) { console.error("[redeem supabase sync]", e); }
    }

    if (booked === 0) {
      return NextResponse.json({ error: "Those slots are no longer available." }, { status: 409 });
    }

    // Deduct only the minutes actually booked (extensions cost their extra time).
    const newBalance = await adjustCredit(session.id, -bookedMin, `Booked ${booked} slot(s) with bulk credit`);

    // Confirmation email for every credit-booked slot (paid bookings already
    // get this in verify-payment; previously credit bookings sent nothing).
    try {
      const { notifyBookingConfirmed } = require("@/lib/notifications");
      const { waitUntil } = require("@vercel/functions");
      for (const bs of bookedSlots) {
        const run = notifyBookingConfirmed({
          id: bs.id,
          userId: session.id,
          userEmail,
          userName,
          userPhone: userPhone || undefined,
          slotDate: bs.date,
          slotTime: bs.time,
          durationMin: bs.durationMin,
          amount: 0,
          courtNumber: bs.court,
          subtotal: 0,
          gst: 0,
        }).catch((e: unknown) => console.error("[redeem notify error]", e));
        if (waitUntil) waitUntil(run);
      }
    } catch (e) {
      console.warn("[redeem notify dispatch skipped]", e);
    }

    return NextResponse.json({ ok: true, bookingIds, booked, balanceMin: newBalance });
  } catch (err) {
    console.error("[redeem error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
