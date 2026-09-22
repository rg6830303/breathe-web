import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";
import { CASH_AT_VENUE_SOURCE } from "@/lib/tournaments/cash-coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin: tournament entries, newest first. Optional ?tournament_id= filter.
 *
 * By default this returns entries that were actually paid for — confirmed, for
 * the event's full fee — PLUS cash-at-venue entries, which are deliberately
 * ₹0 paid and would otherwise look identical to a broken online payment. Two
 * kinds of row are withheld: a 'pending' one, which is a checkout that was
 * started and never paid, and a confirmed ONLINE one whose captured amount is
 * not the fee, which cannot have come from this checkout and would misstate
 * both the head-count and the money. Both are counted so the console can offer
 * a review; ?include=all returns everything.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    const tournamentId = req.nextUrl.searchParams.get("tournament_id");
    const includeAll = req.nextUrl.searchParams.get("include") === "all";
    const clauses: string[] = [];
    const args: unknown[] = [];
    if (tournamentId) {
      clauses.push("r.tournament_id = ?");
      args.push(tournamentId);
    }
    // Default view is entries that were actually paid for online (confirmed,
    // full fee), or a deliberate cash-at-venue entry (confirmed, ₹0 paid is
    // expected there, not a mismatch). A pending row is an abandoned checkout
    // that took no money.
    if (!includeAll) {
      clauses.push("r.status = 'confirmed' AND (r.amount_paid = r.fee OR r.source = ?)");
      args.push(CASH_AT_VENUE_SOURCE);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const r = await turso.execute({
      // r.* rather than a column list: if a column migration has not landed on
      // this database, naming the column would fail the whole query and the
      // console would show an empty table instead of the entries that exist.
      sql: `SELECT r.*,
                   COALESCE(t.name, '—') AS tournament_name,
                   t.event_date
            FROM tournament_registrations r
            LEFT JOIN tournaments t ON t.id = r.tournament_id
            ${where}
            ORDER BY r.created_at DESC
            LIMIT 500`,
      args,
    });

    // What is being withheld, so the console can say so rather than hiding
    // money and attempts without a word. A cash-at-venue entry is deliberately
    // ₹0 paid, so it must never count as a "mismatched" payment.
    let mismatched = 0;
    let pending = 0;
    let cashDue = 0;
    try {
      const scope = tournamentId ? " AND tournament_id = ?" : "";
      const scopeArgs = tournamentId ? [tournamentId] : [];
      const m = await turso.execute({
        sql: `SELECT COUNT(*) AS n FROM tournament_registrations
              WHERE status = 'confirmed' AND amount_paid <> fee
                AND (source IS NULL OR source <> ?)${scope}`,
        args: [CASH_AT_VENUE_SOURCE, ...scopeArgs],
      });
      mismatched = Number(m.rows[0]?.n ?? 0);
      const p = await turso.execute({
        sql: `SELECT COUNT(*) AS n FROM tournament_registrations
              WHERE status = 'pending'${scope}`,
        args: scopeArgs,
      });
      pending = Number(p.rows[0]?.n ?? 0);
      const c = await turso.execute({
        sql: `SELECT COALESCE(SUM(fee - amount_paid), 0) AS n FROM tournament_registrations
              WHERE status = 'confirmed' AND source = ? AND amount_paid < fee${scope}`,
        args: [CASH_AT_VENUE_SOURCE, ...scopeArgs],
      });
      cashDue = Number(c.rows[0]?.n ?? 0);
    } catch {
      // Cosmetic.
    }

    return NextResponse.json({ registrations: r.rows, mismatched, pending, cashDue, includeAll });
  } catch (err) {
    console.error("[admin tournament registrations error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/**
 * Admin: cancel/reinstate an entry, or mark a cash-at-venue entry as collected.
 *
 *   { id, status: 'cancelled'|'confirmed' }  — cancel or reinstate
 *   { id, mark_cash_received: true }         — record the cash fee as collected
 *
 * We never hard-delete: the row is the record that a fee was paid (or is owed).
 * Cancelling also frees the player to re-enter that category, because the
 * uniqueness index is partial (WHERE status='confirmed'). Reinstating can
 * therefore collide with a newer entry, which is reported as a conflict rather
 * than a 500. `mark_cash_received` is restricted to rows actually tagged
 * cash-at-venue, so it can't be misused to silently rewrite an online payment.
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});

    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Registration id is required." }, { status: 400 });

    if (body.mark_cash_received === true) {
      try {
        const r = await turso.execute({
          sql: `UPDATE tournament_registrations SET amount_paid = fee
                WHERE id = ? AND source = ? AND status = 'confirmed'`,
          args: [id, CASH_AT_VENUE_SOURCE],
        });
        if (!r.rowsAffected) {
          return NextResponse.json(
            { error: "That isn't a cash-at-venue entry, or it wasn't found." },
            { status: 404 },
          );
        }
      } catch (dbErr) {
        console.error("[admin tournament registration mark-cash error]", dbErr);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id, cashReceived: true });
    }

    const status = String(body.status ?? "");
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

/**
 * Admin: record an entry by hand — `{ tournament_id, player_name, email, ... }`.
 *
 * For entries that were paid for but never written (a payment that succeeded
 * while the database write failed) and for offline/walk-in payments. The row is
 * identical to one the public form would have created, so it exports and counts
 * the same; `payment_id` carries whatever reference the club has.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    const b = await req.json().catch(() => ({}));
    const tournamentId = String(b.tournament_id ?? "").trim();
    const playerName = String(b.player_name ?? "").trim();
    const email = String(b.email ?? "").trim().toLowerCase();
    const phone = String(b.phone ?? "").trim();
    const category = b.category === "captain" ? "captain" : "singles";
    const ageRaw = Number(b.age);
    const age = Number.isFinite(ageRaw) && ageRaw >= 8 && ageRaw <= 99 ? Math.round(ageRaw) : null;
    const sex = ["male", "female", "other"].includes(String(b.sex)) ? String(b.sex) : null;
    const duprId = String(b.dupr_id ?? "").trim() || null;
    const duprLevel = String(b.dupr_level ?? "").trim() || null;
    const paymentId = String(b.payment_id ?? "").trim() || null;
    const notes = String(b.notes ?? "").trim() || null;

    if (!tournamentId) return NextResponse.json({ error: "Please choose a tournament." }, { status: 400 });
    if (playerName.length < 2) return NextResponse.json({ error: "Please enter the player's name." }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    // Fee comes from the tournament, never from the request body.
    let fee = 0;
    let name = "";
    try {
      const t = await turso.execute({
        sql: "SELECT name, fee FROM tournaments WHERE id = ? LIMIT 1",
        args: [tournamentId],
      });
      const row = t.rows[0];
      if (!row) return NextResponse.json({ error: "That tournament no longer exists." }, { status: 400 });
      name = String(row.name);
      fee = Math.max(0, Number(row.fee) || 0);
    } catch (dbErr) {
      console.error("[admin tournament registration lookup error]", dbErr);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    const amountPaid = Number.isFinite(Number(b.amount_paid)) ? Math.max(0, Math.round(Number(b.amount_paid))) : fee;
    const id = uuid();

    try {
      await turso.execute({
        sql: `INSERT INTO tournament_registrations (
                id, tournament_id, user_id, player_name, email, phone,
                age, sex, photo_url, dupr_id, dupr_level,
                category, skill_level, partner_name, notes,
                fee, amount_paid, payment_id, source, status, created_at
              ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, 'manual', 'confirmed', ?)`,
        args: [
          id, tournamentId, playerName, email, phone || null,
          age, sex, duprId, duprLevel, category,
          notes, fee, amountPaid, paymentId, Date.now(),
        ],
      });
    } catch (dbErr) {
      const msg = String((dbErr as Error)?.message ?? "").toLowerCase();
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return NextResponse.json(
          { error: "That email already has a confirmed entry for this tournament." },
          { status: 409 },
        );
      }
      console.error("[admin tournament registration insert error]", dbErr);
      return NextResponse.json({ error: "Could not save that entry." }, { status: 500 });
    }

    try {
      const { notifyAdminAction } = require("@/lib/notifications");
      if (notifyAdminAction) {
        await notifyAdminAction(
          "Tournament entry added manually",
          `${playerName} · ${name} · ${category} · ₹${amountPaid}`,
          { actor: admin.email },
        ).catch(() => {});
      }
    } catch {
      // best-effort
    }

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[admin tournament registration post error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/**
 * Admin: permanently remove an entry — `?id=`.
 *
 * Cancelling is the normal action and keeps the record of a fee that was paid.
 * This exists for a row that should never have been there: a payment imported
 * against the wrong event, or a mistaken manual entry. It is not a refund and
 * does not touch Razorpay — the payment still stands in the gateway.
 */
export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Registration id is required." }, { status: 400 });

    try {
      const r = await turso.execute({ sql: "DELETE FROM tournament_registrations WHERE id = ?", args: [id] });
      if (!r.rowsAffected) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    } catch (dbErr) {
      console.error("[admin tournament registration delete error]", dbErr);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[admin tournament registration delete error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
