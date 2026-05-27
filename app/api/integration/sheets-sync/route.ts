import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-integration-key");
  if (!process.env.SHEETS_INTEGRATION_KEY || key !== process.env.SHEETS_INTEGRATION_KEY) {
    return NextResponse.json({ error: "Unauthorized integration request." }, { status: 401 });
  }

  const { action, booking } = await request.json();
  const supabase = getSupabaseService();

  if (action === "delete") {
    const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  }

  if (action === "upsert") {
    const { data, error } = await supabase.from("bookings").upsert(booking).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, booking: data });
  }

  return NextResponse.json({ error: "Unsupported sheets sync action." }, { status: 400 });
}
