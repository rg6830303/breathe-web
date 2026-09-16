import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic for the tournament tables — shape only, never content.
 *
 * Reports whether the tables exist, which columns are present, and how many
 * rows each holds, so a registration that does not reach the admin console can
 * be traced to a missing table or a missing column instead of guessed at. No
 * entrant data is returned: names, emails, phones and photos never appear here.
 */
export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    for (const table of ["tournaments", "tournament_registrations"]) {
      const info: Record<string, unknown> = {};
      try {
        const cols = await turso.execute({
          sql: `SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = ?
                ORDER BY ordinal_position`,
          args: [table],
        });
        const names = cols.rows.map((r) => String(r.column_name));
        info.exists = names.length > 0;
        info.columns = names;
      } catch (err) {
        info.exists = "unknown";
        info.columnsError = String((err as Error)?.message ?? err).slice(0, 200);
      }

      try {
        const c = await turso.execute(`SELECT COUNT(*) AS n FROM ${table}`);
        info.rows = Number(c.rows[0]?.n ?? 0);
      } catch (err) {
        info.rows = null;
        info.countError = String((err as Error)?.message ?? err).slice(0, 200);
      }
      out[table] = info;
    }

    // Newest entry's timestamp only — enough to tell "nothing is landing" from
    // "landing but not displayed", with nothing identifying in the response.
    try {
      const last = await turso.execute(
        "SELECT MAX(created_at) AS t, COUNT(*) AS n FROM tournament_registrations WHERE status = 'confirmed'",
      );
      const t = last.rows[0]?.t;
      out.lastConfirmedAt = t ? new Date(Number(t)).toISOString() : null;
      out.confirmedCount = Number(last.rows[0]?.n ?? 0);
    } catch (err) {
      out.lastConfirmedError = String((err as Error)?.message ?? err).slice(0, 200);
    }

    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[health tournaments error]", err);
    return NextResponse.json({ error: "diagnostic failed" }, { status: 500 });
  }
}
