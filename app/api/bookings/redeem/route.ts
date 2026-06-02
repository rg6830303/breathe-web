import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db/ensure";
import { turso } from "@/lib/turso";
import { getCreditBalance, adjustCredit, SLOT_MINUTES } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 30;

type SlotInput = { date: string; time: string; court: number };

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

    const body = await req.json().catch(() => ({}));
    const slots: SlotInput[] = Array.isArray(body.slots) ? body.slots : [];
    if (slots.length === 0) return NextResponse.json({ error: "No slots selected." }, { status: 400 });

    const neededMin = slots.length * SLOT_MINUTES;
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
    let booked = 0;

    for (const s of slots) {
      const court = Number.isFinite(Number(s.court)) ? Math.max(1, Math.min(9, Number(s.court))) : 1;
      // Skip if already taken.
      try {
        const ex = await turso.execute({
          sql: "SELECT id FROM bookings WHERE slot_date = ? AND slot_time = ? AND court_number = ? AND status = 'confirmed' LIMIT 1",
          args: [s.date, s.time, court],
        });
        if (ex.rows.length) continue;
      } catch (e) { console.error("[redeem conflict check]", e); }

      const id = uuid();
      const notes = JSON.stringify({ paid_with: "bulk_credit" });
      try {
        await turso.execute({
          sql: `INSERT INTO bookings (
            id, user_id, slot_date, slot_time, duration_min, court_number,
            guest_name, guest_phone, guest_email,
            subtotal, gst, total, amount_paid, status, source, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'confirmed', 'online', ?, ?)`,
          args: [id, session.id, s.date, s.time, SLOT_MINUTES, court, userName, userPhone, userEmail, notes, now],
        });
        bookingIds.push(id);
        booked++;
      } catch (e) {
        console.error("[redeem insert error]", e);
        continue;
      }
      // Mirror to Supabase.
      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          await supabase.from("bookings").insert({
            id, user_id: session.id, slot_date: s.date, slot_time: s.time, duration_min: SLOT_MINUTES,
            court_number: court, guest_name: userName, guest_phone: userPhone, guest_email: userEmail,
            subtotal: 0, gst: 0, total: 0, amount_paid: 0, status: "confirmed", source: "online", notes, created_at: now,
          });
        }
      } catch (e) { console.error("[redeem supabase sync]", e); }
    }

    if (booked === 0) {
      return NextResponse.json({ error: "Those slots are no longer available." }, { status: 409 });
    }

    // Deduct only for the slots actually booked.
    const newBalance = await adjustCredit(session.id, -(booked * SLOT_MINUTES), `Booked ${booked} slot(s) with bulk credit`);

    return NextResponse.json({ ok: true, bookingIds, booked, balanceMin: newBalance });
  } catch (err) {
    console.error("[redeem error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
