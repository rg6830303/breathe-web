import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";

type WaitlistInput = {
  courtId?: number;
  slotDate?: string; // YYYY-MM-DD
  slotTime?: string; // HH:MM
  playerEmail?: string;
  playerName?: string;
};

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as WaitlistInput;
  const { courtId, slotDate, slotTime, playerEmail, playerName } = body;

  if (!courtId || !slotDate || !slotTime || !playerEmail) {
    return NextResponse.json({ error: "courtId, slotDate, slotTime, playerEmail are required." }, { status: 400 });
  }
  if (!EMAIL_RX.test(playerEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ ok: true, mocked: true }, { status: 201 });
  }

  const supabase = getSupabaseService();
  const { error } = await supabase.from("waitlist").insert({
    court_id: courtId,
    slot_date: slotDate,
    slot_time: slotTime,
    player_email: playerEmail,
    player_name: playerName ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
