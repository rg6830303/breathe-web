import { NextResponse } from "next/server";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json([
      { id: 1, title: "Tonight: Court 1 prime slot", content: "Two 7 PM openings are live.", type: "daily" },
      { id: 2, title: "Weekly ladder", content: "Registration closes Friday.", type: "weekly" },
      { id: 3, title: "Monthly neon cup", content: "Early bird passes are available.", type: "monthly" },
    ]);
  }
  const { data, error } = await getSupabaseService()
    .from("notice_board")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return NextResponse.json(data);
}
