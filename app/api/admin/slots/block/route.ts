import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const date = String(body.slot_date ?? "");
    const time = String(body.slot_time ?? "").slice(0, 5);
    const reason = body.reason ? String(body.reason) : "Admin block";

    if (!date || !time) {
      return NextResponse.json({ error: "Invalid block payload." }, { status: 400 });
    }

    const id = uuid();
    const now = Date.now();
    try {
      await turso.execute({
        sql: `INSERT INTO bookings (
          id, user_id, slot_date, slot_time, duration_min, 
          guest_name, amount_paid, status, source, notes, created_at
        ) VALUES (?, NULL, ?, ?, 60, 'Admin Block', 0, 'confirmed', 'walk_in', ?, ?)`,
        args: [id, date, time, reason, now],
      });
    } catch (dbErr) {
      console.error("[admin block db error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    // Sync manual block to Supabase
    try {
      const { supabase, hasSupabase } = require("@/lib/supabase");
      if (hasSupabase) {
        await supabase.from("bookings").insert({
          id,
          user_id: null,
          slot_date: date,
          slot_time: time,
          duration_min: 60,
          guest_name: "Admin Block",
          amount_paid: 0,
          status: "confirmed",
          source: "walk_in",
          notes: reason,
          created_at: now
        });
      }
    } catch (sbErr) {
      console.error("[admin block supabase sync error]", sbErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[admin block error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
