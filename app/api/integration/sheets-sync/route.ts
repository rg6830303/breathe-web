import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-integration-key");
  if (!process.env.SHEETS_INTEGRATION_KEY || key !== process.env.SHEETS_INTEGRATION_KEY) {
    return NextResponse.json({ error: "Unauthorized integration request." }, { status: 401 });
  }

  const { action, booking, pricingRule, financeEntry } = await request.json();
  const supabase = getSupabaseService();

  if (action === "delete" || action === "delete_booking") {
    const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  }

  if (action === "upsert" || action === "upsert_booking") {
    const { data, error } = await supabase.from("bookings").upsert(booking).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, booking: data });
  }

  if (action === "upsert_pricing_rule") {
    const { data, error } = await supabase.from("pricing_rules").upsert(pricingRule).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, pricingRule: data });
  }

  if (action === "add_finance_entry") {
    const { data, error } = await supabase.from("finance_entries").insert(financeEntry).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, financeEntry: data });
  }

  return NextResponse.json({ error: "Unsupported sheets sync action." }, { status: 400 });
}
