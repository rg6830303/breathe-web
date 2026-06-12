import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { notifyOutstandingDue } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function computeEndTime(hhmm: string, dur: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + dur;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    // Optional check for Vercel Cron Secret
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Let's log it, but if it is locally running we might bypass or we can let it pass if no CRON_SECRET is defined.
      if (process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // 1. Fetch confirmed bookings with outstanding balance
    const result = await turso.execute({
      sql: `SELECT b.id, b.user_id, b.slot_date, b.slot_time, b.duration_min,
                   b.total, b.amount_paid, b.notes, b.guest_name, b.guest_email, b.court_number,
                   u.email as user_email, u.full_name as user_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.status = 'confirmed' AND (b.total - b.amount_paid) > 0`,
      args: [],
    });

    const now = new Date();
    let alertCount = 0;

    for (const row of result.rows) {
      const id = String(row.id);
      const slot_date = String(row.slot_date);
      const slot_time = String(row.slot_time);
      const duration_min = Number(row.duration_min) || 60;
      const total = Number(row.total);
      const amount_paid = Number(row.amount_paid);
      const court_number = Number(row.court_number) || 1;
      
      const guest_name = row.guest_name ? String(row.guest_name) : "";
      const guest_email = row.guest_email ? String(row.guest_email) : "";
      const user_name = row.user_name ? String(row.user_name) : guest_name;
      const user_email = row.user_email ? String(row.user_email) : guest_email;

      if (!user_email) continue;

      const notesStr = row.notes ? String(row.notes) : "{}";
      let notesObj: any = {};
      try {
        notesObj = JSON.parse(notesStr);
      } catch (e) {
        notesObj = {};
      }

      // Skip if alert was already sent
      if (notesObj.after_play_alert_sent) continue;

      // Check if slot has ended (based on IST date/time)
      const endTimeStr = `${slot_date}T${computeEndTime(slot_time, duration_min)}`;
      const endTime = new Date(`${endTimeStr}:00+05:30`);

      if (now > endTime) {
        // Send email alert
        const sport = notesObj.sport || "pickleball";
        await notifyOutstandingDue({
          id,
          userEmail: user_email,
          userName: user_name,
          slotDate: slot_date,
          slotTime: slot_time,
          durationMin: duration_min,
          total,
          amountPaid: amount_paid,
          sport,
          courtNumber: court_number,
        });

        // Mark alert as sent in the notes column
        const updatedNotes = { ...notesObj, after_play_alert_sent: true };
        
        // Update Turso
        await turso.execute({
          sql: "UPDATE bookings SET notes = ? WHERE id = ?",
          args: [JSON.stringify(updatedNotes), id],
        });

        // Update Supabase if available
        try {
          const { supabase, hasSupabase } = require("@/lib/supabase");
          if (hasSupabase) {
            await supabase
              .from("bookings")
              .update({ notes: JSON.stringify(updatedNotes) })
              .eq("id", id);
          }
        } catch (sbErr) {
          console.error(`[cron update supabase error for booking ${id}]`, sbErr);
        }

        alertCount++;
      }
    }

    return NextResponse.json({ ok: true, alertsSent: alertCount });
  } catch (err: any) {
    console.error("[cron after-play error]", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
