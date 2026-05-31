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
  try {
    for (const [key, value] of Object.entries(parsed.data)) {
      if (!KNOWN_KEYS.includes(key)) continue;
      await turso.execute({
        sql: `INSERT INTO venue_config (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [key, String(value), now],
      });
    }
  } catch (err) {
    console.error("[admin config patch error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
