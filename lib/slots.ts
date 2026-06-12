import { getSlotPrice } from "@/lib/pricing";

// Club hours, in minutes from midnight (IST). Slots run on the hour from
// 05:00; the last bookable hour starts at 22:00 (closes 23:00). Extensions can
// reach the close time but never past it, and never before opening.
export const OPEN_MIN = 5 * 60; // 05:00
export const CLOSE_MIN = 23 * 60; // 23:00

export function toMin(hhmm: string): number {
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
}

export function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** The 30-minute cell start times a booking occupies (e.g. 06:00 + 90min →
 *  ["06:00","06:30","07:00"]). Used for occupancy + overlap math. */
export function cellsFor(startTime: string, durationMin: number): string[] {
  const start = toMin(startTime);
  const cells: string[] = [];
  const dur = Math.max(30, durationMin || 60);
  for (let o = 0; o < dur; o += 30) cells.push(toHHMM(start + o));
  return cells;
}

/** Authoritative price for an arbitrary range, charged per half-hour so a
 *  standard 60-min slot equals getSlotPrice() and each ±30-min extension adds
 *  exactly half of the hour it lands in. */
export function priceForRange(
  sportOrTime: string,
  dateOrDuration?: string | number,
  startTime?: string,
  durationMin?: number
): number {
  if (typeof dateOrDuration === "number" || arguments.length === 2 || !dateOrDuration) {
    const sTime = sportOrTime;
    const dur = Number(dateOrDuration) || 60;
    let total = 0;
    for (const cell of cellsFor(sTime, dur)) total += getSlotPrice(cell) / 2;
    return Math.round(total);
  }

  const sport = sportOrTime;
  const date = String(dateOrDuration);
  const sTime = startTime || "05:00";
  const dur = durationMin || 60;
  let total = 0;
  for (const cell of cellsFor(sTime, dur)) {
    total += getSlotPrice(sport, date, cell) / 2;
  }
  return Math.round(total);
}

/** True if two [start, start+dur) ranges share any minute (i.e. any 30-min
 *  cell), so an extension that pokes into a neighbour's hour is caught. */
export function rangesOverlap(
  aStart: string,
  aDur: number,
  bStart: string,
  bDur: number,
): boolean {
  const a = toMin(aStart);
  const b = toMin(bStart);
  return a < b + (bDur || 60) && b < a + (aDur || 60);
}

/** Check if slot A overlaps with slot B in both time and courts, considering
 *  that Cricket takes courts 1, 2, 3, and Badminton is on Court 1. */
export function slotsClash(
  aCourt: number,
  aStart: string,
  aDur: number,
  aSport: string,
  bCourt: number,
  bStart: string,
  bDur: number,
  bSport: string,
): boolean {
  // 1. Time overlap check
  if (!rangesOverlap(aStart, aDur, bStart, bDur)) return false;

  // 2. Court overlap check
  const aCourts = aSport === "cricket" ? [1, 2, 3] : [aCourt];
  const bCourts = bSport === "cricket" ? [1, 2, 3] : [bCourt];

  return aCourts.some((ac) => bCourts.includes(ac));
}

/** Clamp/validate a requested range against club hours. Returns null if it
 *  falls outside 05:00–23:00 or has a bad duration. */
export function isWithinHours(startTime: string, durationMin: number): boolean {
  const start = toMin(startTime);
  const end = start + (durationMin || 60);
  return start >= OPEN_MIN && end <= CLOSE_MIN && durationMin >= 30 && durationMin % 30 === 0;
}

