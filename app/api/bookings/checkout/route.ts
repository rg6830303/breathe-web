import { NextRequest, NextResponse } from "next/server";
import { calculateTotals } from "@/lib/pricing";
import { generateICS } from "@/lib/ics";
import { mirrorBookingToSheets, sendBookingEmails, sendTelegramAlert } from "@/lib/notifications";
import { getSupabaseService } from "@/lib/supabase";

const MAX_WEEKS = 12; // Safety cap so a runaway "weeks: 9999" can't loop.

/** Shifts an ISO timestamp forward by N whole weeks, preserving the local
 *  wall-clock time. We add 7*N*24h in UTC ms — DST doesn't apply in IST so
 *  the visible hour stays stable. */
function addWeeks(iso: string, weeks: number): string {
  return new Date(new Date(iso).getTime() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString();
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, playerName, playerEmail, courtId, startTime, endTime, equipmentTotal = 0, recurrence } = body;
  if (!userId || !courtId || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required booking fields." }, { status: 400 });
  }

  const supabase = getSupabaseService();
  const { data, error } = await supabase.rpc("create_verified_booking", {
    p_user_id: userId,
    p_court_id: courtId,
    p_start_time: startTime,
    p_end_time: endTime,
    p_equipment_total: equipmentTotal,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const booking = Array.isArray(data) ? data[0] : data;

  // Recurrence: if requested, try creating the next N-1 weekly clones. Each
  // call goes through the same `create_verified_booking` RPC so the gist
  // exclusion constraint still guards against overlaps; conflicts are caught,
  // logged in `skipped`, and the rest of the series continues.
  const confirmed: unknown[] = [booking];
  const skipped: { startTime: string; reason: string }[] = [];
  const weeks = Number(recurrence?.weeks ?? 0);
  if (weeks > 1) {
    const limit = Math.min(weeks, MAX_WEEKS);
    for (let i = 1; i < limit; i++) {
      const cloneStart = addWeeks(startTime, i);
      const cloneEnd = addWeeks(endTime, i);
      const { data: clone, error: cloneErr } = await supabase.rpc("create_verified_booking", {
        p_user_id: userId,
        p_court_id: courtId,
        p_start_time: cloneStart,
        p_end_time: cloneEnd,
        p_equipment_total: equipmentTotal,
      });
      if (cloneErr) {
        skipped.push({ startTime: cloneStart, reason: cloneErr.message });
      } else {
        confirmed.push(Array.isArray(clone) ? clone[0] : clone);
      }
    }
  }
  const total = Number(booking?.total_amount ?? calculateTotals(0, equipmentTotal).total);
  const window = `${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleTimeString()}`;

  // Build an ICS string the client can also use for the in-app "Add to
  // Calendar" button — we return it alongside the booking record so the
  // BookingGrid confirmation panel doesn't need a second round-trip.
  const icsString = generateICS({
    courtId,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    bookingId: String(booking?.id ?? `${courtId}-${startTime}`),
  });

  await Promise.allSettled([
    sendTelegramAlert(`New booking: ${playerName ?? userId}, Court ${courtId}, ${window}, INR ${total}`),
    sendBookingEmails({
      playerName: playerName ?? "Player",
      playerEmail: playerEmail ?? process.env.ADMIN_EMAIL ?? "admin@example.com",
      adminEmail: process.env.ADMIN_EMAIL ?? playerEmail,
      courtId,
      window,
      total,
      ics: icsString,
    }),
    mirrorBookingToSheets({ event: "INSERT", record: booking }),
  ]);

  return NextResponse.json({
    booking,
    ics: icsString,
    confirmed: confirmed.map((b) => (b as { id?: number; start_time?: string })?.id ?? null),
    skipped,
  });
}
