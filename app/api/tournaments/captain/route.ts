import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema, SHOWDOWN_33_CAPTAIN_ID } from "@/lib/db/tournament-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The team-captain entry, fetched by its own id.
 *
 * It is flagged `unlisted`, so /api/tournaments deliberately leaves it out and
 * it never reaches the public tab or the player registration dropdown. This
 * route is what the direct-link captain page reads instead. Unlisted is not a
 * secret — it keeps the entry off the site, not behind auth — so the same
 * "is it open?" rules apply and no user data is exposed.
 */
export async function GET() {
  try {
    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    const r = await turso.execute({
      sql: `SELECT id, name, event_date, format, prize, fee, description, poster_url
            FROM tournaments
            WHERE id = ? AND active = 1 AND status = 'open'
            LIMIT 1`,
      args: [SHOWDOWN_33_CAPTAIN_ID],
    });

    const row = r.rows[0];
    const tournaments = row
      ? [
          {
            id: String(row.id),
            name: String(row.name),
            event_date: row.event_date ? String(row.event_date) : null,
            format: row.format ? String(row.format) : null,
            prize: row.prize ? String(row.prize) : null,
            fee: Number(row.fee) || 0,
            description: row.description ? String(row.description) : null,
            poster_url: row.poster_url ? String(row.poster_url) : null,
          },
        ]
      : [];

    return NextResponse.json(
      { tournaments },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("[captain tournament error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
