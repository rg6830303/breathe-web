import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { getSlotPrice } from "@/lib/pricing";
import type { Slot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COURTS = [1, 2, 3] as const;

function generateTimes(): string[] {
  const times: string[] = [];
  // 1-hour slots: 05:00 → 22:00 start (last slot 22:00–23:00, the close time).
  for (let m = 5 * 60; m <= 22 * 60; m += 60) {
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

    let bookingsResult: { rows: Array<Record<string, unknown>> } = { rows: [] };
    let bookingsFromTurso = false;
    try {
      const r = await turso.execute({
        sql: `SELECT slot_time, duration_min, court_number, notes
              FROM bookings
              WHERE slot_date = ? AND status = 'confirmed'`,
        args: [date],
      });
      bookingsResult = { rows: r.rows as unknown as Array<Record<string, unknown>> };
      bookingsFromTurso = true;
    } catch (dbErr) {
      console.error("[slots route bookings turso error — trying supabase]", dbErr);
    }
    if (!bookingsFromTurso) {
      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          const { data } = await supabase
            .from("bookings")
            .select("slot_time, duration_min, court_number, notes")
            .eq("slot_date", date)
            .eq("status", "confirmed");
          if (Array.isArray(data)) bookingsResult = { rows: data as Array<Record<string, unknown>> };
        }
      } catch (sbErr) {
        console.error("[slots route bookings supabase fallback failed]", sbErr);
      }
    }

    // Read first-class admin blocks for the date from Turso; if Turso is
    // unavailable, fall back to the Supabase mirror so admin blocks still show
    // on the public site. Soft-fail to empty so the page always loads.
    let blockRows: Array<Record<string, unknown>> = [];
    let blocksFromTurso = false;
    try {
      const r = await turso.execute({
        sql: `SELECT slot_time, court_number, reason
              FROM blocked_slots WHERE slot_date = ?`,
        args: [date],
      });
      blockRows = r.rows as unknown as Array<Record<string, unknown>>;
      blocksFromTurso = true;
    } catch (blockErr) {
      console.warn("[slots blocked_slots turso read failed — trying supabase]", blockErr);
    }
    if (!blocksFromTurso) {
      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          const { data } = await supabase
            .from("blocked_slots")
            .select("slot_time, court_number, reason")
            .eq("slot_date", date);
          if (Array.isArray(data)) blockRows = data as Array<Record<string, unknown>>;
        }
      } catch (sbErr) {
        console.warn("[slots blocked_slots supabase fallback failed]", sbErr);
      }
    }

    type CellState = "blocked" | "booked";
    const occupancy = new Map<string, CellState>();
    const key = (court: number, time: string) => `${court}@${time}`;

    const targetSport = (params.get("sport") ?? "pickleball") as "pickleball" | "badminton" | "cricket";

    // 1. Confirmed bookings → booked (60-min overlap honored)
    for (const b of bookingsResult.rows) {
      const startTime = String(b.slot_time).slice(0, 5);
      const dur = Number(b.duration_min) || 60;
      const court = Number(b.court_number) || 1;
      const bSport = b.sport ? String(b.sport) : "pickleball";
      const notes = b.notes ? String(b.notes) : null;
      const isAdminBlockLegacy =
        notes === "Admin block" || (notes ?? "").toLowerCase().includes("admin block");
      const state: CellState = isAdminBlockLegacy ? "blocked" : "booked";

      // Cricket takes courts 1, 2, and 3
      const targetCourts = bSport === "cricket" ? [1, 2, 3] : [court];

      for (const targetCourt of targetCourts) {
        for (let offset = 0; offset < dur; offset += 30) {
          const cellTime = addMinutes(startTime, offset);
          const k = key(targetCourt, cellTime);
          const prev = occupancy.get(k);
          if (prev === "blocked") continue;
          occupancy.set(k, state);
        }
      }
    }

    // 2. blocked_slots overlay — sets the cell as 'blocked' if it isn't
    //    already 'booked' on a real reservation
    const allTimes = generateTimes();
    for (const row of blockRows) {
      const blockTime = row.slot_time ? String(row.slot_time).slice(0, 5) : null;
      const blockCourtRaw = row.court_number;
      const blockCourt =
        blockCourtRaw === null || blockCourtRaw === undefined ? null : Number(blockCourtRaw);

      const targetCourts = blockCourt === null ? [...COURTS] : [blockCourt];
      const targetTimes = blockTime === null ? allTimes : [blockTime];

      for (const court of targetCourts) {
        for (const time of targetTimes) {
          const k = key(court, time);
          if (occupancy.get(k) === "booked") continue;
          occupancy.set(k, "blocked");
        }
      }
    }

    // An hour slot is only bookable when BOTH of its 30-minute cells are free.
    // A neighbour's ±30-min extension occupies just one half of an hour, but it
    // still makes that hour un-bookable as a full slot — so we OR the two cells.
    const slots: Slot[] = [];
    const responseCourts = targetSport === "cricket" ? [1] : targetSport === "badminton" ? [1] : [...COURTS];

    for (const time of allTimes) {
      if (targetSport === "cricket") {
        // Cricket: combined status of courts 1, 2, and 3
        const states: Slot["status"][] = [];
        for (const court of [1, 2, 3]) {
          const first = occupancy.get(key(court, time));
          const second = occupancy.get(key(court, addMinutes(time, 30)));
          const st: Slot["status"] =
            first === "booked" || second === "booked"
              ? "booked"
              : first === "blocked" || second === "blocked"
                ? "blocked"
                : "open";
          states.push(st);
        }

        const status: Slot["status"] = states.includes("booked")
          ? "booked"
          : states.includes("blocked")
            ? "blocked"
            : "open";

        slots.push({
          court: 1,
          time,
          status,
          price: getSlotPrice(time, date, "cricket"),
        });
      } else if (targetSport === "badminton") {
        // Badminton: Court 1 only
        const first = occupancy.get(key(1, time));
        const second = occupancy.get(key(1, addMinutes(time, 30)));
        const status: Slot["status"] =
          first === "booked" || second === "booked"
            ? "booked"
            : first === "blocked" || second === "blocked"
              ? "blocked"
              : "open";

        slots.push({
          court: 1,
          time,
          status,
          price: getSlotPrice(time, date, "badminton"),
        });
      } else {
        // Pickleball: all courts individually
        for (const court of COURTS) {
          const first = occupancy.get(key(court, time));
          const second = occupancy.get(key(court, addMinutes(time, 30)));
          const status: Slot["status"] =
            first === "booked" || second === "booked"
              ? "booked"
              : first === "blocked" || second === "blocked"
                ? "blocked"
                : "open";
          slots.push({
            court,
            time,
            status,
            price: getSlotPrice(time, date, "pickleball"),
          });
        }
      }
    }

    return NextResponse.json({ date, courts: responseCourts, slots });
  } catch (err: unknown) {
    console.error("[slots route error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
