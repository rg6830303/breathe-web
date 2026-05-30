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
  const date = request.nextUrl.searchParams.get("date") ?? todayIST();

  let bookedRows: Array<{ court_number: number; slot_time: string }> = [];
  let blockedRows: Array<{ court_number: number; slot_time: string }> = [];
  try {
    const [booked, blocked] = await Promise.all([
      turso.execute({
        sql: "SELECT court_number, slot_time FROM bookings WHERE slot_date = ? AND status = 'confirmed'",
        args: [date],
      }),
      turso.execute({
        sql: "SELECT court_number, slot_time FROM blocked_slots WHERE slot_date = ?",
        args: [date],
      }),
    ]);
    bookedRows = booked.rows.map((r) => ({
      court_number: Number(r.court_number),
      slot_time: String(r.slot_time).slice(0, 5),
    }));
    blockedRows = blocked.rows.map((r) => ({
      court_number: Number(r.court_number),
      slot_time: String(r.slot_time).slice(0, 5),
    }));
  } catch {
    // DB not initialized yet — return all-open grid so the UI still works.
    bookedRows = [];
    blockedRows = [];
  }

  const bookedKey = new Set(bookedRows.map((r) => `${r.court_number}@${r.slot_time}`));
  const blockedKey = new Set(blockedRows.map((r) => `${r.court_number}@${r.slot_time}`));

  const slots: Slot[] = [];
  for (const time of generateTimes()) {
    for (const court of COURTS) {
      const key = `${court}@${time}`;
      const status: Slot["status"] = bookedKey.has(key)
        ? "booked"
        : blockedKey.has(key)
          ? "blocked"
          : "open";
      slots.push({ court, time, status, price: getSlotPrice(time) });
    }
  }

  return NextResponse.json({ date, courts: [...COURTS], slots });
}
