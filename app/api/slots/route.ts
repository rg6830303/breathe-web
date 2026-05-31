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

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const from = params.get("from");
    const to = params.get("to");

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

    const date = params.get("date") ?? todayIST();

    let bookingsResult;
    try {
      bookingsResult = await turso.execute({
        sql: `SELECT slot_time, duration_min, court_number, notes
              FROM bookings
              WHERE slot_date = ? AND status = 'confirmed'`,
        args: [date],
      });
    } catch (dbErr) {
      console.error("[slots route db error]", dbErr);
      bookingsResult = { rows: [] };
    }

    // For each (court, time) compute whether it's blocked/booked.
    // A confirmed booking with duration_min D starting at time T occupies all
    // 30-min slots from T to T + D (exclusive).
    type CellState = "blocked" | "booked";
    const occupancy = new Map<string, CellState>();
    const key = (court: number, time: string) => `${court}@${time}`;

    for (const b of bookingsResult.rows) {
      const startTime = String(b.slot_time).slice(0, 5);
      const dur = Number(b.duration_min) || 60;
      const court = Number(b.court_number) || 1;
      const notes = b.notes ? String(b.notes) : null;
      const isAdminBlock =
        notes === "Admin block" || (notes ?? "").toLowerCase().includes("admin block");
      const state: CellState = isAdminBlock ? "blocked" : "booked";

      for (let offset = 0; offset < dur; offset += 30) {
        const cellTime = addMinutes(startTime, offset);
        const k = key(court, cellTime);
        // "blocked" takes precedence over "booked" if both apply
        const prev = occupancy.get(k);
        if (prev === "blocked") continue;
        occupancy.set(k, state);
      }
    }

    const slots: Slot[] = [];
    for (const time of generateTimes()) {
      for (const court of COURTS) {
        const state = occupancy.get(key(court, time));
        const status: Slot["status"] = state ?? "open";
        slots.push({ court, time, status, price: getSlotPrice(time) });
      }
    }

    return NextResponse.json({ date, courts: [...COURTS], slots });
  } catch (err: unknown) {
    console.error("[slots route error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
