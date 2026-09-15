import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";

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
    await ensureTournamentSchema().catch(() => {});

    const tournamentId = req.nextUrl.searchParams.get("tournament_id");
    const where = tournamentId ? "WHERE r.tournament_id = ?" : "";
    const args = tournamentId ? [tournamentId] : [];

    const r = await turso.execute({
      sql: `SELECT r.id, r.tournament_id, r.user_id, r.player_name, r.email, r.phone,
                   r.age, r.sex, r.photo_url, r.dupr_id, r.dupr_level,
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

/**
 * Admin: cancel or reinstate an entry — `{ id, status: 'cancelled'|'confirmed' }`.
 *
 * We never hard-delete: the row is the record that a fee was paid. Cancelling
 * also frees the player to re-enter that category, because the uniqueness index
 * is partial (WHERE status='confirmed'). Reinstating can therefore collide with
 * a newer entry, which is reported as a conflict rather than a 500.
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});

    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "");
    const status = String(body.status ?? "");
    if (!id) return NextResponse.json({ error: "Registration id is required." }, { status: 400 });
    if (status !== "cancelled" && status !== "confirmed") {
      return NextResponse.json({ error: "Status must be 'cancelled' or 'confirmed'." }, { status: 400 });
    }

    try {
      const r = await turso.execute({
        sql: "UPDATE tournament_registrations SET status = ? WHERE id = ?",
        args: [status, id],
      });
      if (!r.rowsAffected) {
        return NextResponse.json({ error: "Registration not found." }, { status: 404 });
      }
    } catch (dbErr) {
      const msg = String((dbErr as Error)?.message ?? "").toLowerCase();
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return NextResponse.json(
          { error: "That player already has a confirmed entry in this category." },
          { status: 409 },
        );
      }
      console.error("[admin tournament registration update error]", dbErr);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id, status });
  } catch (err) {
    console.error("[admin tournament registration patch error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
