import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin: tournament entries, newest first. Optional ?tournament_id= filter.
 * Joined to `tournaments` so the console can show the event name without a
 * second round trip.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});

    const tournamentId = req.nextUrl.searchParams.get("tournament_id");
    const where = tournamentId ? "WHERE r.tournament_id = ?" : "";
    const args = tournamentId ? [tournamentId] : [];

    const r = await turso.execute({
      sql: `SELECT r.id, r.tournament_id, r.user_id, r.player_name, r.email, r.phone,
                   r.category, r.skill_level, r.partner_name, r.notes,
                   r.fee, r.amount_paid, r.status, r.created_at,
                   COALESCE(t.name, '—') AS tournament_name,
                   t.event_date
            FROM tournament_registrations r
            LEFT JOIN tournaments t ON t.id = r.tournament_id
            ${where}
            ORDER BY r.created_at DESC
            LIMIT 500`,
      args,
    });

    return NextResponse.json({ registrations: r.rows });
  } catch (err) {
    console.error("[admin tournament registrations error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
