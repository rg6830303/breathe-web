import { NextRequest, NextResponse } from "next/server";
import { getSlotsForDate } from "@/lib/slots";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const slots = await getSlotsForDate(date);
  return NextResponse.json({
    date,
    courts: [1, 2],
    slots,
  });
}
