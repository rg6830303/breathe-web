import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!hasSupabaseEnv() || !userId) {
    return NextResponse.json({
      profile: { full_name: "Dinker Pro", current_streak: 12, current_xp: 8450 },
      metrics: { level: 24, nextLevelXp: 10000, winRate: 68, matches: 142, courtHours: 32 },
      badges: [
        { name: "Dinker", progress: 100, unlocked: true },
        { name: "Rallier", progress: 60, unlocked: false },
        { name: "Pro-Smasher", progress: 0, unlocked: false },
      ],
    });
  }

  const supabase = getSupabaseService();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name,current_streak,current_xp")
    .eq("id", userId)
    .single();
  if (error) throw error;

  const xp = profile.current_xp ?? 0;
  return NextResponse.json({
    profile,
    metrics: {
      level: Math.max(1, Math.floor(xp / 400) + 1),
      nextLevelXp: Math.ceil((xp + 1) / 400) * 400,
      winRate: 68,
      matches: 142,
      courtHours: 32,
    },
    badges: [
      { name: "Dinker", progress: Math.min(100, xp / 25), unlocked: xp >= 2500 },
      { name: "Rallier", progress: Math.min(100, xp / 65), unlocked: xp >= 6500 },
      { name: "Pro-Smasher", progress: Math.min(100, xp / 100), unlocked: xp >= 10000 },
    ],
  });
}
