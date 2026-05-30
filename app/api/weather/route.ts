import { NextRequest, NextResponse } from "next/server";
import { getWeatherForDate } from "@/lib/weather";

// Thin proxy in front of `lib/weather.ts` so the client benefits from the
// module-level 30-minute cache and we never hit the per-IP Open-Meteo limits
// even when many tabs are open. Cached at the edge for an hour.
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ forecast: null }, { status: 400 });
  const forecast = await getWeatherForDate(date);
  return NextResponse.json(
    { forecast },
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
  );
}
