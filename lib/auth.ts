import { getSupabaseService } from "@/lib/supabase";

export async function assertAdmin(userId?: string | null) {
  if (!userId) throw new Error("Missing user id.");
  const { data, error } = await getSupabaseService()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (error) throw error;
  if (data?.role !== "admin") throw new Error("Admin role required.");
}
