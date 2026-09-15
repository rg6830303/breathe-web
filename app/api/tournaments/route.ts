import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema, STALE_TOURNAMENT_IDS } from "@/lib/db/tournament-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUBLIC list of tournaments that are accepting entries.
 *
 * Only `status = 'open'`, listed rows are returned — an `unlisted` event is
 * reachable only through its own direct link — 'upcoming' events are announced but
 * not yet taking registrations, and completed/cancelled ones must never appear
 * on the registration form. No user data is exposed.
 */
export async function GET() {
  try {
    await ensureSchema().catch(() => {});
    // Adds poster_url (and seeds the current event) on a database provisioned
    // before those existed — the SELECT below reads that column.
    await ensureTournamentSchema().catch(() => {});
    // Belt and braces on the stale hand-entered duplicate: the cleanup DELETE
    // in ensureTournamentSchema has not taken on the production database, and
    // until it does this filter keeps the row out of the registration
    // dropdown, where it appeared as a second identical "33 Showdown".
    const staleFilter = STALE_TOURNAMENT_IDS.length
      ? ` AND id NOT IN (${STALE_TOURNAMENT_IDS.map(() => "?").join(", ")})`
      : "";

    const r = await turso.execute({
      sql: `SELECT id, name, event_date, format, prize, fee, description, poster_url
            FROM tournaments
            WHERE active = 1 AND status = 'open' AND COALESCE(unlisted, 0) = 0${staleFilter}
            ORDER BY event_date ASC
            LIMIT 50`,
      args: [...STALE_TOURNAMENT_IDS],
    });

    const tournaments = r.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      event_date: row.event_date ? String(row.event_date) : null,
      format: row.format ? String(row.format) : null,
      prize: row.prize ? String(row.prize) : null,
      fee: Number(row.fee) || 0,
      description: row.description ? String(row.description) : null,
      poster_url: row.poster_url ? String(row.poster_url) : null,
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
