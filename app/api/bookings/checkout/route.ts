import { NextRequest, NextResponse } from "next/server";
import { calculateTotals } from "@/lib/pricing";
import { mirrorBookingToSheets, sendBookingEmails, sendTelegramAlert } from "@/lib/notifications";
import { getSupabaseService } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, playerName, playerEmail, courtId, startTime, endTime, equipmentTotal = 0 } = body;
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
  const total = Number(booking?.total_amount ?? calculateTotals(0, equipmentTotal).total);
  const window = `${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleTimeString()}`;

  await Promise.allSettled([
    sendTelegramAlert(`New booking: ${playerName ?? userId}, Court ${courtId}, ${window}, INR ${total}`),
    sendBookingEmails({
      playerName: playerName ?? "Player",
      playerEmail: playerEmail ?? process.env.ADMIN_EMAIL ?? "admin@example.com",
      adminEmail: process.env.ADMIN_EMAIL ?? playerEmail,
      courtId,
      window,
      total,
    }),
    mirrorBookingToSheets({ event: "INSERT", record: booking }),
  ]);

  return NextResponse.json({ booking });
}
