import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { CASH_AT_VENUE_SOURCE } from "@/lib/tournaments/cash-coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What happened to one entry — `?ref=<registration id>`.
 *
 * Feeds the confirmation page the entrant lands on after paying. Keyed by the
 * entry's own UUID, which only that entrant is given, and it returns just what
 * a receipt needs: the event, what was paid, what (if anything) is still due.
 * No other entrant's data is reachable and the email comes back masked, so a
 * shared link cannot be used to harvest addresses.
 */
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`tournament-status:${getClientIp(req)}`, 40, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const ref = (req.nextUrl.searchParams.get("ref") ?? "").trim();
    if (!ref) return NextResponse.json({ error: "A reference is required." }, { status: 400 });

    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    const r = await turso.execute({
      sql: `SELECT reg.id, reg.player_name, reg.email, reg.category, reg.status, reg.source,
                   reg.fee, reg.amount_paid, reg.payment_id, reg.created_at,
                   t.name AS tournament_name, t.event_date
            FROM tournament_registrations reg
            LEFT JOIN tournaments t ON t.id = reg.tournament_id
            WHERE reg.id = ?
            LIMIT 1`,
      args: [ref],
    });

    const row = r.rows[0];
    if (!row) return NextResponse.json({ state: "unknown" });

    const fee = Number(row.fee) || 0;
    const paid = Number(row.amount_paid) || 0;
    const due = Math.max(0, fee - paid);
    const status = String(row.status);
    const isCashAtVenue = String(row.source ?? "") === CASH_AT_VENUE_SOURCE;

    // 'pending' means the checkout was started but no payment has been matched
    // to it yet — either still in flight, or abandoned. A cash-at-venue entry
    // with money still owed is NOT a broken/partial online payment — it's a
    // successful registration with the fee due at the club — so it gets its
    // own state rather than falling into "partial" (which reads as an error).
    const state =
      status === "cancelled"
        ? "cancelled"
        : status === "pending"
          ? "pending"
          : due > 0
            ? isCashAtVenue
              ? "cash_due"
              : "partial"
            : "confirmed";

    const email = String(row.email ?? "");
    const maskedEmail = email.replace(/^(.).*?(@.*)$/, (_m, a, b) => `${a}•••${b}`);

    return NextResponse.json(
      {
        state,
        ref: String(row.id).slice(0, 8).toUpperCase(),
        playerName: String(row.player_name ?? ""),
        email: maskedEmail,
        category: String(row.category ?? ""),
        tournamentName: row.tournament_name ? String(row.tournament_name) : null,
        eventDate: row.event_date ? String(row.event_date) : null,
        fee,
        amountPaid: paid,
        due,
        paymentId: row.payment_id ? String(row.payment_id) : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[tournament status error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
