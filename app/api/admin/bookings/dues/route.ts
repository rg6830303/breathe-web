import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Pending-dues management for the admin console.
 *
 * Dues are not a separate column — an outstanding balance is any confirmed
 * booking where `total > amount_paid` (the ₹200 advance is paid online; the
 * rest is settled at the club). "Clearing" dues sets `amount_paid = total`
 * (status stays 'confirmed') and notifies the player.
 *
 * GET  → list all bookings with an outstanding balance.
 * POST { booking_id } → mark that booking's dues as cleared + email/notify.
 */
export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});

    const r = await turso.execute({
      sql: `SELECT b.id, b.user_id,
                   COALESCE(u.full_name, b.guest_name, 'Guest') AS user_name,
                   COALESCE(u.email, b.guest_email, '')         AS user_email,
                   b.slot_date, b.slot_time, b.duration_min, b.court_number, b.sport,
                   b.total, b.amount_paid, (b.total - b.amount_paid) AS due
            FROM bookings b
            LEFT JOIN users u ON u.id = b.user_id
            WHERE b.status = 'confirmed' AND b.total > b.amount_paid
            ORDER BY b.slot_date DESC, b.slot_time DESC
            LIMIT 500`,
      args: [],
    });

    return NextResponse.json({ bookings: r.rows });
  } catch (err) {
    console.error("[admin dues list error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});

    const body = await req.json().catch(() => ({}));
    const bookingId = body.booking_id ? String(body.booking_id) : "";
    if (!bookingId) return NextResponse.json({ error: "booking_id is required." }, { status: 400 });

    // Look up the booking (joined to the user for the freshest email/name).
    let row: Record<string, unknown> | undefined;
    try {
      const r = await turso.execute({
        sql: `SELECT b.id, b.user_id, b.status, b.total, b.amount_paid,
                     b.slot_date, b.slot_time, b.duration_min, b.court_number, b.sport,
                     COALESCE(u.full_name, b.guest_name, 'there') AS user_name,
                     COALESCE(u.email, b.guest_email, '')         AS user_email
              FROM bookings b
              LEFT JOIN users u ON u.id = b.user_id
              WHERE b.id = ? LIMIT 1`,
        args: [bookingId],
      });
      row = r.rows[0] as Record<string, unknown> | undefined;
    } catch (dbErr) {
      console.error("[admin dues lookup error]", dbErr);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    if (!row) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (String(row.status) !== "confirmed") {
      return NextResponse.json({ error: "This booking is not active." }, { status: 400 });
    }

    const total = Number(row.total) || 0;
    const amountPaid = Number(row.amount_paid) || 0;
    if (amountPaid >= total) {
      // Already settled — idempotent success.
      return NextResponse.json({ ok: true, note: "already cleared" });
    }

    try {
      await turso.execute({
        sql: "UPDATE bookings SET amount_paid = total WHERE id = ?",
        args: [bookingId],
      });
    } catch (dbErr) {
      console.error("[admin dues update error]", dbErr);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    // Mirror to Supabase if enabled (best-effort).
    try {
      const { supabase, hasSupabase } = require("@/lib/supabase");
      if (hasSupabase) {
        await supabase.from("bookings").update({ amount_paid: total }).eq("id", bookingId);
      }
    } catch (sbErr) {
      console.error("[admin dues supabase sync error]", sbErr);
    }

    // Email + portal notification to the player, plus an admin-feed entry.
    try {
      const { notifyDuesCleared, notifyAdminAction } = require("@/lib/notifications");
      const { waitUntil } = require("@vercel/functions");
      const userEmail = row.user_email ? String(row.user_email) : "";
      const userName = row.user_name ? String(row.user_name) : "there";
      const run = (async () => {
        if (notifyDuesCleared && userEmail) {
          await notifyDuesCleared({
            id: bookingId,
            userId: row.user_id ? String(row.user_id) : undefined,
            userEmail,
            userName,
            slotDate: String(row.slot_date),
            slotTime: String(row.slot_time).slice(0, 5),
            durationMin: row.duration_min ? Number(row.duration_min) : undefined,
            total,
            sport: row.sport ? String(row.sport) : undefined,
            courtNumber: row.court_number ? Number(row.court_number) : undefined,
          }).catch((e: unknown) => console.error("[dues notify error]", e));
        }
        if (notifyAdminAction) {
          await notifyAdminAction(
            "Dues cleared",
            `${userName} · ₹${(total - amountPaid).toLocaleString("en-IN")} settled`,
            { actor: admin.email },
          ).catch(() => {});
        }
      })();
      if (waitUntil) waitUntil(run);
      else await run;
    } catch (e) {
      console.warn("[admin dues notify dispatch skipped]", e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin dues clear error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
