import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getAdminSession } from "@/lib/auth";
import { turso, ensureBlockedSlotsTable } from "@/lib/turso";

export const runtime = "nodejs";

/**
 * Single-slot block. Writes to the new `blocked_slots` table.
 * Body: { slot_date, slot_time, court_number, reason? }
 */
export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const date = String(body.slot_date ?? "");
    const time = String(body.slot_time ?? "").slice(0, 5);
    const court = Number(body.court_number);
    const reason = body.reason ? String(body.reason) : "Admin block";

    if (!date || !time || !Number.isFinite(court) || court < 1 || court > 9) {
      return NextResponse.json({ error: "Invalid block payload." }, { status: 400 });
    }

    const id = uuid();
    const now = Date.now();
    try {
      await ensureBlockedSlotsTable();
      await turso.execute({
        sql: `INSERT INTO blocked_slots (id, slot_date, slot_time, court_number, reason, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, date, time, court, reason, now],
      });
    } catch (dbErr) {
      console.error("[admin block db error]", dbErr);
      return NextResponse.json(
        {
          error:
            "Could not block the slot. If this is the first time you're using blocked_slots, hit /api/db-init once to create the table.",
        },
        { status: 500 },
      );
    }

    try {
      const { supabase, hasSupabase } = require("@/lib/supabase");
      if (hasSupabase) {
        await supabase.from("blocked_slots").insert({
          id,
          slot_date: date,
          slot_time: time,
          court_number: court,
          reason,
        });
      }
    } catch (sbErr) {
      console.error("[admin block supabase sync error]", sbErr);
    }

    return NextResponse.json({ ok: true, id });
  } catch (err: unknown) {
    console.error("[admin block error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
