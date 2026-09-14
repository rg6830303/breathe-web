import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUBLIC list of tournaments that are accepting entries.
 *
 * Only `status = 'open'` rows are returned — 'upcoming' events are announced but
 * not yet taking registrations, and completed/cancelled ones must never appear
 * on the registration form. No user data is exposed.
 */
export async function GET() {
  try {
    await ensureSchema().catch(() => {});
    const r = await turso.execute({
      sql: `SELECT id, name, event_date, format, prize, fee, description
            FROM tournaments
            WHERE active = 1 AND status = 'open'
            ORDER BY event_date ASC
            LIMIT 50`,
      args: [],
    });

    const tournaments = r.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      event_date: row.event_date ? String(row.event_date) : null,
      format: row.format ? String(row.format) : null,
      prize: row.prize ? String(row.prize) : null,
      fee: Number(row.fee) || 0,
      description: row.description ? String(row.description) : null,
    }));

    return NextResponse.json(
      { tournaments },
      // Short shared cache: the open-tournament list changes rarely but the
      // registration page is a likely ad landing spot, so serve bursts from the
      // CDN instead of the (free-tier) DB.
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("[public tournaments error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
