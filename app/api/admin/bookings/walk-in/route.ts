import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { calculateTotals } from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 30;

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
  sport: z.enum(["pickleball", "cricket", "badminton"]).default("pickleball"),
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

  // Enforce sport court rules
  let courtNumber = data.court_number;
  if (data.sport === "cricket" || data.sport === "badminton") {
    courtNumber = 1;
  }

  // Conflict check: refuse to walk-in over an existing confirmed booking on
  // the same court that overlaps the requested time range.
  try {
    const overlap = await turso.execute({
      sql: `SELECT slot_time, duration_min, court_number, sport FROM bookings
            WHERE slot_date = ?
              AND status = 'confirmed'`,
      args: [data.slot_date],
    });

    const { slotsClash } = require("@/lib/slots");
    const clash = overlap.rows.some((row) =>
      slotsClash(
        courtNumber,
        data.slot_time,
        data.duration_min,
        data.sport,
        Number(row.court_number) || 1,
        String(row.slot_time),
        Number(row.duration_min) || 60,
        row.sport ? String(row.sport) : "pickleball",
      )
    );

    if (clash) {
      const courtName =
        data.sport === "cricket"
          ? "Cricket Turf"
          : data.sport === "badminton"
            ? "Badminton Court"
            : `Court ${courtNumber}`;
      return NextResponse.json(
        { error: `${courtName} is already booked at ${data.slot_time} on ${data.slot_date}.` },
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
    const { cellsFor } = require("@/lib/slots");
    const statements = [
      {
        sql: `INSERT INTO bookings (
          id, user_id, slot_date, slot_time, duration_min, court_number,
          guest_name, guest_phone, guest_email,
          subtotal, gst, total, amount_paid,
          status, source, sport, notes, created_at
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'walk_in', ?, ?, ?)`,
        args: [
          id,
          data.slot_date,
          data.slot_time,
          data.duration_min,
          courtNumber,
          data.guest_name,
          data.guest_phone ?? null,
          data.guest_email ?? null,
          Math.round(totals.subtotal),
          Math.round(totals.taxes),
          Math.round(totals.total),
          Math.round(totals.total),
          data.sport,
          notes,
          now,
        ],
      }
    ];

    const targetCourts = data.sport === "cricket" ? [1, 2, 3] : [courtNumber];
    const intervals = cellsFor(data.slot_time, data.duration_min);
    for (const c of targetCourts) {
      for (const cellTime of intervals) {
        statements.push({
          sql: "INSERT INTO booking_courts (booking_id, court_number, slot_date, slot_time) VALUES (?, ?, ?, ?)",
          args: [id, c, data.slot_date, cellTime],
        });
      }
    }

    await turso.batch(statements, "write");
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
        court_number: courtNumber,
        guest_name: data.guest_name,
        guest_phone: data.guest_phone ?? null,
        guest_email: data.guest_email ?? null,
        subtotal: Math.round(totals.subtotal),
        gst: Math.round(totals.taxes),
        total: Math.round(totals.total),
        amount_paid: Math.round(totals.total),
        status: "confirmed",
        source: "walk_in",
        sport: data.sport,
        notes,
        created_at: now,
      });
    }
  } catch (sbErr) {
    console.error("[walk-in supabase sync error]", sbErr);
  }

  try {
    const { waitUntil } = require("@vercel/functions");
    if (data.notify_guest && data.guest_email) {
      // Full pipeline: emails the guest + emails/pushes admins + records inbox.
      const { notifyBookingConfirmed } = require("@/lib/notifications");
      const p = notifyBookingConfirmed({
        id,
        userEmail: data.guest_email,
        userName: data.guest_name,
        userPhone: data.guest_phone || undefined,
        slotDate: data.slot_date,
        slotTime: data.slot_time,
        durationMin: data.duration_min,
        amount: Math.round(totals.total),
        courtNumber: courtNumber,
        subtotal: Math.round(totals.subtotal),
        gst: Math.round(totals.taxes),
        sport: data.sport,
      });
      if (waitUntil) waitUntil(p);
      else await p;
    } else {
      // No guest email — still alert admin devices + inbox about the walk-in.
      const { sendPushToAdmins } = require("@/lib/push");
      const { recordNotification } = require("@/lib/notify-store");
      const body = `${data.guest_name} — ${data.slot_date} ${data.slot_time} · Court ${data.court_number} · ₹${Math.round(totals.total)}`;
      const run = Promise.all([
        sendPushToAdmins({ title: "Walk-in booking added", body, url: "/admin", tag: `walkin-${id}` }),
        recordNotification({ role: "admin", title: "Walk-in booking added", body, url: "/admin" }),
      ]).catch((e) => console.error("[walk-in admin notify error]", e));
      if (waitUntil) waitUntil(run);
      else await run;
    }
  } catch (notifErr) {
    console.error("[walk-in notify error]", notifErr);
  }

  return NextResponse.json({ ok: true, id });
}
