import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { calculateTotals } from "@/lib/pricing";

export const runtime = "nodejs";

const schema = z.object({
  slot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD."),
  slot_time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM."),
  court_number: z.number().int().min(1).max(9),
  duration_min: z.number().int().min(30).max(180).default(60),
  guest_name: z.string().trim().min(1, "Guest name is required.").max(120),
  guest_phone: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
  guest_email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  amount: z.number().int().min(0).max(50_000),
  notes: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  notify_guest: z.boolean().default(false),
});

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  // Conflict check: refuse to walk-in over an existing confirmed booking on
  // the same court that overlaps the requested time range.
  try {
    const overlap = await turso.execute({
      sql: `SELECT id FROM bookings
            WHERE slot_date = ?
              AND court_number = ?
              AND status = 'confirmed'
              AND slot_time = ?
            LIMIT 1`,
      args: [data.slot_date, data.court_number, data.slot_time],
    });
    if (overlap.rows.length > 0) {
      return NextResponse.json(
        { error: `Court ${data.court_number} is already booked at ${data.slot_time} on ${data.slot_date}.` },
        { status: 409 },
      );
    }
  } catch (err) {
    console.error("[walk-in conflict check error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  const id = uuid();
  const now = Date.now();
  const totals = calculateTotals(data.amount);
  const notes = JSON.stringify({
    source: "walk_in",
    created_by_admin: admin.email,
    free_text: data.notes ?? null,
  });

  try {
    await turso.execute({
      sql: `INSERT INTO bookings (
        id, user_id, slot_date, slot_time, duration_min, court_number,
        guest_name, guest_phone, guest_email,
        subtotal, gst, total, amount_paid,
        status, source, notes, created_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'walk_in', ?, ?)`,
      args: [
        id,
        data.slot_date,
        data.slot_time,
        data.duration_min,
        data.court_number,
        data.guest_name,
        data.guest_phone ?? null,
        data.guest_email ?? null,
        Math.round(totals.subtotal),
        Math.round(totals.taxes),
        Math.round(totals.total),
        Math.round(totals.total),
        notes,
        now,
      ],
    });
  } catch (err) {
    console.error("[walk-in insert error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase) {
      await supabase.from("bookings").insert({
        id,
        user_id: null,
        slot_date: data.slot_date,
        slot_time: data.slot_time,
        duration_min: data.duration_min,
        court_number: data.court_number,
        guest_name: data.guest_name,
        guest_phone: data.guest_phone ?? null,
        guest_email: data.guest_email ?? null,
        subtotal: Math.round(totals.subtotal),
        gst: Math.round(totals.taxes),
        total: Math.round(totals.total),
        amount_paid: Math.round(totals.total),
        status: "confirmed",
        source: "walk_in",
        notes,
        created_at: now,
      });
    }
  } catch (sbErr) {
    console.error("[walk-in supabase sync error]", sbErr);
  }

  // Optional: send confirmation + admin notification using the standard
  // notifications pipeline if a guest email is on file and notify_guest = true.
  if (data.notify_guest && data.guest_email) {
    try {
      const { notifyBookingConfirmed } = require("@/lib/notifications");
      const { waitUntil } = require("@vercel/functions");
      const p = notifyBookingConfirmed({
        id,
        userEmail: data.guest_email,
        userName: data.guest_name,
        userPhone: data.guest_phone || undefined,
        slotDate: data.slot_date,
        slotTime: data.slot_time,
        durationMin: data.duration_min,
        amount: Math.round(totals.total),
        courtNumber: data.court_number,
        subtotal: Math.round(totals.subtotal),
        gst: Math.round(totals.taxes),
      });
      if (waitUntil) waitUntil(p);
      else await p;
    } catch (notifErr) {
      console.error("[walk-in notify error]", notifErr);
    }
  }

  return NextResponse.json({ ok: true, id });
}
