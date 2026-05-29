import type { Booking, Court, PricingRule, Slot } from "@/lib/types";
import { fallbackPricingRules, priceForSlot } from "@/lib/pricing";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";

const fallbackCourts: Court[] = [
  { id: 1, name: "Court 1", type: "Pro Court" },
  { id: 2, name: "Court 2", type: "Pro Court" },
  { id: 3, name: "Court 3", type: "Pro Court" },
];

const fallbackBookings: Booking[] = [
  {
    id: 1,
    user_id: "demo",
    court_id: 1,
    start_time: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(18, 30, 0, 0)).toISOString(),
    total_amount: 900,
    status: "confirmed",
  },
  {
    id: 2,
    user_id: "demo",
    court_id: 2,
    start_time: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(19, 30, 0, 0)).toISOString(),
    total_amount: 900,
    status: "confirmed",
  },
];

export async function getSlotsForDate(dateText: string): Promise<Slot[]> {
  const day = new Date(`${dateText}T00:00:00+05:30`);
  const from = new Date(day);
  from.setHours(6, 0, 0, 0);
  const to = new Date(day);
  to.setHours(23, 0, 0, 0);

  let courts = fallbackCourts;
  let bookings = fallbackBookings;
  let pricingRules: PricingRule[] = fallbackPricingRules;

  if (hasSupabaseEnv()) {
    const supabase = getSupabaseService();
    const [courtsResult, bookingsResult, pricingResult] = await Promise.all([
      supabase.from("courts").select("*").in("id", [1, 2, 3]).order("id"),
      supabase
        .from("bookings")
        .select("*")
        .lt("start_time", to.toISOString())
        .gt("end_time", from.toISOString())
        .neq("status", "cancelled"),
      supabase.from("pricing_rules").select("*").eq("active", true).order("start_time"),
    ]);
    if (courtsResult.error) throw courtsResult.error;
    if (bookingsResult.error) throw bookingsResult.error;
    if (pricingResult.error && pricingResult.error.code !== "42P01") throw pricingResult.error;
    courts = courtsResult.data?.length ? courtsResult.data : fallbackCourts;
    bookings = bookingsResult.data ?? [];
    pricingRules = pricingResult.data?.length ? pricingResult.data : fallbackPricingRules;
  }

  const slots: Slot[] = [];
  for (let t = new Date(from); t < to; t = new Date(t.getTime() + 30 * 60 * 1000)) {
    const end = new Date(t.getTime() + 30 * 60 * 1000);
    for (const court of courts) {
      const booked = bookings.some(
        (booking) =>
          booking.court_id === court.id &&
          new Date(booking.start_time) < end &&
          new Date(booking.end_time) > t,
      );
      slots.push({
        courtId: court.id,
        courtName: court.name,
        type: court.type,
        startTime: t.toISOString(),
        endTime: end.toISOString(),
        booked,
        price: priceForSlot(t, pricingRules, court.id),
      });
    }
  }
  return slots;
}
