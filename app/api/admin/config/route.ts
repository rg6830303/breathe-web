import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_KEYS = [
  "total_courts",
  "slot_duration_min",
  "open_time",
  "close_time",
  "default_price",
  "prime_price",
  "prime_start",
  "prime_end",
];

const patchSchema = z.record(z.string(), z.string());

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await turso.execute({
      sql: "SELECT key, value FROM venue_config",
      args: [],
    });
    const config: Record<string, string> = {};
    for (const row of result.rows) {
      config[String(row.key)] = String(row.value);
    }
    return NextResponse.json({ config });
  } catch (err) {
    console.error("[admin config get error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const now = Date.now();
  const entries = Object.entries(parsed.data).filter(([k]) => KNOWN_KEYS.includes(k));

  let tursoOk = false;
  try {
    for (const [key, value] of entries) {
      await turso.execute({
        sql: `INSERT INTO venue_config (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [key, String(value), now],
      });
    }
    tursoOk = true;
  } catch (err) {
    console.error("[admin config patch turso error]", err);
  }
  // Mirror venue config to Supabase so settings survive a Turso outage.
  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase && entries.length) {
      const rows = entries.map(([key, value]) => ({ key, value: String(value), updated_at: now }));
      const { error } = await supabase.from("venue_config").upsert(rows, { onConflict: "key" });
      if (!error) tursoOk = true;
    }
  } catch (sbErr) {
    console.error("[admin config patch supabase error]", sbErr);
  }
  if (!tursoOk) return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
