import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { getSlotPrice } from "@/lib/pricing";
import type { Slot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COURTS = [1, 2, 3] as const;

function generateTimes(): string[] {
  const times: string[] = [];
  for (let m = 6 * 60; m <= 22 * 60 + 30; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return times;
}

function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const from = params.get("from");
    const to = params.get("to");

    // ── Calendar range mode ──────────────────────────────────────
    if (from && to) {
      let result;
      try {
        result = await turso.execute({
          sql: `SELECT slot_date, slot_time, COUNT(*) as booked
                FROM bookings
                WHERE slot_date BETWEEN ? AND ? AND status = 'confirmed'
                GROUP BY slot_date, slot_time`,
          args: [from, to],
        });
      } catch (dbErr) {
        console.error("[slots range db error]", dbErr);
        result = { rows: [] };
      }

      const slots = result.rows.map((r) => ({
        date: String(r.slot_date),
        time: String(r.slot_time).slice(0, 5),
        booked: Number(r.booked),
      }));

      return NextResponse.json({ from, to, slots });
    }

    // ── Single-date mode (existing behavior) ─────────────────────
    const date = params.get("date") ?? todayIST();

    // Query active bookings for this date
    let bookingsResult;
    try {
      bookingsResult = await turso.execute({
        sql: "SELECT id, slot_time, notes FROM bookings WHERE slot_date = ? AND status = 'confirmed' ORDER BY created_at ASC",
        args: [date],
      });
    } catch (dbErr) {
      console.error("[slots route db error]", dbErr);
      bookingsResult = { rows: [] };
    }

    // Group bookings by slot_time
    const bookingsByTime: Record<string, Array<{ id: string; notes: string | null }>> = {};
    for (const row of bookingsResult.rows) {
      const time = String(row.slot_time).slice(0, 5);
      if (!bookingsByTime[time]) {
        bookingsByTime[time] = [];
      }
      bookingsByTime[time].push({
        id: String(row.id),
        notes: row.notes ? String(row.notes) : null,
      });
    }

    const slots: Slot[] = [];
    const allTimes = generateTimes();

    for (const time of allTimes) {
      const activeBookings = bookingsByTime[time] ?? [];
      for (const court of COURTS) {
        // Assign bookings to courts based on index (court 1 for index 0, court 2 for index 1, etc.)
        const bookingIndex = court - 1;
        const b = activeBookings[bookingIndex];

        let status: Slot["status"] = "open";
        if (b) {
          // If notes matches "Admin block", mark it as blocked
          if (b.notes === "Admin block" || String(b.notes).toLowerCase().includes("admin block")) {
            status = "blocked";
          } else {
            status = "booked";
          }
        }

        slots.push({
          court,
          time,
          status,
          price: getSlotPrice(time),
        });
      }
    }

    return NextResponse.json({ date, courts: [...COURTS], slots });
  } catch (err: unknown) {
    console.error("[slots route error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}


