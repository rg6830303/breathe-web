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

function nowHHMMIST(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

      return NextResponse.json(
        { from, to, slots },
        { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } },
      );
    }

    const date = params.get("date") ?? todayIST();

    let bookingsResult: { rows: Array<Record<string, unknown>> } = { rows: [] };
    let bookingsFromTurso = false;
    try {
      const r = await turso.execute({
        sql: `SELECT slot_time, duration_min, court_number, notes, sport
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
            .select("slot_time, duration_min, court_number, notes, sport")
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

    const sportParam = (params.get("sport") ?? "pickleball") as "pickleball" | "badminton" | "cricket";

    type CellState = "blocked" | "booked";
    const occupancy = new Map<string, CellState>();
    const key = (court: number, time: string) => `${court}@${time}`;

    // 1. Confirmed bookings → booked (60-min overlap honored)
    for (const b of bookingsResult.rows) {
      const startTime = String(b.slot_time).slice(0, 5);
      const dur = Number(b.duration_min) || 60;
      const court = Number(b.court_number) || 1;
      const notes = b.notes ? String(b.notes) : null;
      let notesObj: Record<string, unknown> = {};
      try {
        if (notes) notesObj = JSON.parse(notes);
      } catch {}
      // Prefer the dedicated sport column (newer bookings), fall back to notes JSON
      const bSport = (b.sport ? String(b.sport) : null) || (notesObj.sport ? String(notesObj.sport) : "pickleball");


      const isAdminBlockLegacy =
        notes === "Admin block" || (notes ?? "").toLowerCase().includes("admin block");
      const state: CellState = isAdminBlockLegacy ? "blocked" : "booked";

      // If it's cricket, it blocks all 3 courts!
      const targetCourts = bSport === "cricket" ? [1, 2, 3] : [court];

      for (const tc of targetCourts) {
        for (let offset = 0; offset < dur; offset += 30) {
          const cellTime = addMinutes(startTime, offset);
          const k = key(tc, cellTime);
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

    // Generate slots based on selected sport
    const slots: Slot[] = [];
    const responseCourts = sportParam === "cricket" ? [1] : sportParam === "badminton" ? [1] : [...COURTS];

    for (const time of allTimes) {
      if (sportParam === "cricket") {
        const c1First = occupancy.get(key(1, time));
        const c1Second = occupancy.get(key(1, addMinutes(time, 30)));
        const c2First = occupancy.get(key(2, time));
        const c2Second = occupancy.get(key(2, addMinutes(time, 30)));
        const c3First = occupancy.get(key(3, time));
        const c3Second = occupancy.get(key(3, addMinutes(time, 30)));

        const anyBooked =
          c1First === "booked" || c1Second === "booked" ||
          c2First === "booked" || c2Second === "booked" ||
          c3First === "booked" || c3Second === "booked";

        const anyBlocked =
          c1First === "blocked" || c1Second === "blocked" ||
          c2First === "blocked" || c2Second === "blocked" ||
          c3First === "blocked" || c3Second === "blocked";

        const status: Slot["status"] = anyBooked ? "booked" : anyBlocked ? "blocked" : "open";
        const price = getSlotPrice("cricket", date, time);
        slots.push({ court: 1, time, status, price });
      } else if (sportParam === "badminton") {
        const first = occupancy.get(key(1, time));
        const second = occupancy.get(key(1, addMinutes(time, 30)));
        const status: Slot["status"] =
          first === "booked" || second === "booked"
            ? "booked"
            : first === "blocked" || second === "blocked"
              ? "blocked"
              : "open";
        const price = getSlotPrice("badminton", date, time);
        slots.push({ court: 1, time, status, price });
      } else {
        // Pickleball
        for (const court of COURTS) {
          const first = occupancy.get(key(court, time));
          const second = occupancy.get(key(court, addMinutes(time, 30)));
          const status: Slot["status"] =
            first === "booked" || second === "booked"
              ? "booked"
              : first === "blocked" || second === "blocked"
                ? "blocked"
                : "open";
          const price = getSlotPrice("pickleball", date, time);
          slots.push({ court, time, status, price });
        }
      }
    }

    // Real-time IST tracker: once a slot's start time has passed today, it is
    // no longer bookable — downgrade "open" to "past" so UIs render it blank
    // instead of "Open". (Booked/blocked stay as-is for the admin's records.)
    // For dates before today, every unsold slot is past.
    const today = todayIST();
    if (date <= today) {
      const cutoff = date < today ? "24:00" : nowHHMMIST();
      for (const s of slots) {
        if (s.status === "open" && s.time <= cutoff) s.status = "past";
      }
    }

    // Short shared CDN cache: many homepage + booking-page visitors poll this
    // for the SAME date, so a 20s edge cache (with SWR) serves the bulk of
    // those reads from Vercel's CDN instead of hitting Supabase on every poll —
    // the key free-tier protection under load. Availability tolerates ~20s lag;
    // booking collisions are still enforced server-side at payment time.
    return NextResponse.json(
      { date, courts: sportParam === "pickleball" ? [...COURTS] : [1], slots },
      { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } },
    );
  } catch (err: unknown) {
    console.error("[slots route error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
