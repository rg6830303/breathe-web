import { turso } from "@/lib/turso";
import { v4 as uuid } from "uuid";

/** Bulk-hours package: 12 prepaid hours for ₹8,000. */
export const BULK_PACKAGE = {
  id: "bulk-12h",
  label: "12-Hour Bulk Pass",
  hours: 12,
  minutes: 12 * 60,
  price: 8000,
  blurb: "Prepay 12 hours of court time and then book any open slot instantly — no payment needed each time.",
} as const;

/** Each booked slot consumes this many minutes of credit. Slots are 1 hour. */
export const SLOT_MINUTES = 60;

/** Read a user's remaining prepaid balance (minutes). Falls back to Supabase. */
export async function getCreditBalance(userId: string): Promise<number> {
  try {
    const r = await turso.execute({
      sql: "SELECT balance_min FROM user_credits WHERE user_id = ? LIMIT 1",
      args: [userId],
    });
    if (r.rows[0]) return Number(r.rows[0].balance_min) || 0;
  } catch (e) {
    console.error("[credits getBalance turso error]", e);
  }
  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase) {
      const { data } = await supabase.from("user_credits").select("balance_min").eq("user_id", userId).maybeSingle();
      if (data) return Number(data.balance_min) || 0;
    }
  } catch (e) {
    console.error("[credits getBalance supabase error]", e);
  }
  return 0;
}

/** Add (or subtract) credit minutes, writing both backends + the ledger. */
export async function adjustCredit(userId: string, deltaMin: number, reason: string): Promise<number> {
  const now = Date.now();
  const current = await getCreditBalance(userId);
  const next = Math.max(0, current + deltaMin);

  try {
    await turso.execute({
      sql: `INSERT INTO user_credits (user_id, balance_min, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET balance_min = excluded.balance_min, updated_at = excluded.updated_at`,
      args: [userId, next, now],
    });
    await turso.execute({
      sql: "INSERT INTO credit_ledger (id, user_id, delta_min, reason, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [uuid(), userId, deltaMin, reason, now],
    });
  } catch (e) {
    console.error("[credits adjust turso error]", e);
  }
  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase) {
      await supabase.from("user_credits").upsert({ user_id: userId, balance_min: next, updated_at: now }, { onConflict: "user_id" });
      await supabase.from("credit_ledger").insert({ id: uuid(), user_id: userId, delta_min: deltaMin, reason, created_at: now });
    }
  } catch (e) {
    console.error("[credits adjust supabase error]", e);
  }
  return next;
}
