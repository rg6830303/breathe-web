import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

const schema = z.object({
  slot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD."),
  // Inclusive 24h times; if omitted closes the whole day.
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  courts: z.array(z.number().int().min(1).max(9)).default([1, 2, 3]),
  reason: z.string().trim().max(200).default("Admin block"),
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

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { slot_date, courts, reason } = parsed.data;
  const start = parsed.data.start_time ?? "06:00";
  const end = parsed.data.end_time ?? "22:30";

  const times = generateTimes(start, end);
  const now = Date.now();
  let inserted = 0;

  try {
    for (const time of times) {
      for (const court of courts) {
        // Skip if there is already a confirmed booking or block on this slot
        const existing = await turso.execute({
          sql: `SELECT id FROM bookings
                WHERE slot_date = ? AND slot_time = ? AND court_number = ?
                  AND status = 'confirmed' LIMIT 1`,
          args: [slot_date, time, court],
        });
        if (existing.rows.length > 0) continue;

        const id = uuid();
        await turso.execute({
          sql: `INSERT INTO bookings (
            id, user_id, slot_date, slot_time, duration_min, court_number,
            guest_name, subtotal, gst, total, amount_paid,
            status, source, notes, created_at
          ) VALUES (?, NULL, ?, ?, 30, ?, 'Admin Block', 0, 0, 0, 0, 'confirmed', 'walk_in', ?, ?)`,
          args: [id, slot_date, time, court, reason, now],
        });
        inserted++;
      }
    }
  } catch (err) {
    console.error("[bulk-block error]", err);
    return NextResponse.json({ error: "Something went wrong while blocking slots.", inserted }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted, range: { date: slot_date, start, end, courts } });
}
