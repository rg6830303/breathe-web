import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { turso, ensureBlockedSlotsTable } from "@/lib/turso";

export const runtime = "nodejs";

const schema = z.object({
  slot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD."),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  courts: z.array(z.number().int().min(1).max(9)).default([1, 2, 3]),
  reason: z.string().trim().max(200).default("Admin block"),
  /** If true and no time range is given, write a single entire-day all-courts row. */
  closeEntireDay: z.boolean().optional(),
});

function generateTimes(startHHMM: string, endHHMM: string): string[] {
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const out: string[] = [];
  for (let m = start; m <= end; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return out;
}

/**
 * Bulk block. Writes to `blocked_slots`:
 *   - closeEntireDay + all 3 courts → one row {slot_time:NULL, court_number:NULL}
 *   - closeEntireDay + subset       → one row per court {slot_time:NULL, court_number:N}
 *   - explicit start/end time       → one row per (time, court) cell
 *
 * Skips inserting a slot if a real confirmed booking already occupies it.
 */
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSchema();

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { slot_date, courts, reason } = parsed.data;
  const fullDay = parsed.data.closeEntireDay || (!parsed.data.start_time && !parsed.data.end_time);
  const now = Date.now();
  let inserted = 0;
  const insertedIds: string[] = [];

  type Row = { id: string; slot_date: string; slot_time: string | null; court_number: number | null; reason: string };
  const rows: Row[] = [];

  if (fullDay) {
    if (courts.length === 3 || courts.length === 0) {
      rows.push({
        id: uuid(),
        slot_date,
        slot_time: null,
        court_number: null,
        reason,
      });
    } else {
      for (const c of courts) {
        rows.push({ id: uuid(), slot_date, slot_time: null, court_number: c, reason });
      }
    }
  } else {
    const start = parsed.data.start_time ?? "06:00";
    const end = parsed.data.end_time ?? "22:30";
    const times = generateTimes(start, end);
    const courtList = courts.length === 0 ? [1, 2, 3] : courts;
    for (const time of times) {
      for (const court of courtList) {
        // Skip if a real confirmed booking exists on that exact slot
        try {
          const existing = await turso.execute({
            sql: `SELECT id FROM bookings
                  WHERE slot_date = ? AND slot_time = ? AND court_number = ?
                    AND status = 'confirmed' LIMIT 1`,
            args: [slot_date, time, court],
          });
          if (existing.rows.length > 0) continue;
        } catch (err) {
          // bookings table missing court_number column on legacy schemas
          console.warn("[bulk-block conflict check warning]", err);
        }
        rows.push({ id: uuid(), slot_date, slot_time: time, court_number: court, reason });
      }
    }
  }

  try {
    await ensureBlockedSlotsTable();
    for (const r of rows) {
      await turso.execute({
        sql: `INSERT INTO blocked_slots (id, slot_date, slot_time, court_number, reason, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [r.id, r.slot_date, r.slot_time, r.court_number, r.reason, now],
      });
      inserted++;
      insertedIds.push(r.id);
    }
  } catch (err) {
    console.error("[bulk-block error]", err);
    return NextResponse.json(
      {
        error:
          "Could not write to blocked_slots. Hit /api/db-init once if you haven't deployed the migration yet.",
        inserted,
      },
      { status: 500 },
    );
  }

  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase && rows.length > 0) {
      await supabase.from("blocked_slots").insert(
        rows.map((r) => ({
          id: r.id,
          slot_date: r.slot_date,
          slot_time: r.slot_time,
          court_number: r.court_number,
          reason: r.reason,
        })),
      );
    }
  } catch (sbErr) {
    console.error("[bulk-block supabase sync error]", sbErr);
  }

  try {
    const { notifyAdminAction } = require("@/lib/notifications");
    const span = fullDay ? "full day" : `${parsed.data.start_time}–${parsed.data.end_time}`;
    await notifyAdminAction(
      "Slots closed",
      `${slot_date} · ${span} · courts ${courts.join(", ")} · ${inserted} slot(s)`,
      { actor: admin.email },
    );
  } catch (e) {
    console.error("[bulk-block notify error]", e);
  }

  return NextResponse.json({
    ok: true,
    inserted,
    ids: insertedIds,
    range: {
      date: slot_date,
      mode: fullDay ? "full-day" : "range",
      start: fullDay ? null : parsed.data.start_time,
      end: fullDay ? null : parsed.data.end_time,
      courts,
    },
  });
}
