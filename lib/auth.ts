import { getSession } from "@/lib/session";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";

/**
 * Authorize an admin action. Prefers the signed admin session cookie; falls back
 * to the legacy Supabase `profiles.role` lookup when a user id is supplied.
 */
export async function assertAdmin(userId?: string | null) {
  const session = await getSession();
  if (session?.role === "admin") return;

  if (userId && hasSupabaseEnv()) {
    const { data, error } = await getSupabaseService()
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (error) throw error;
    if (data?.role === "admin") return;
  }

  throw new Error("Admin role required.");
}
