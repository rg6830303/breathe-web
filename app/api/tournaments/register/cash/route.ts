import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { tournamentCashRegistrationSchema, formatZodError } from "@/lib/validation";
import { isValidCashCoupon, CASH_AT_VENUE_SOURCE } from "@/lib/tournaments/cash-coupon";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Register for a tournament paying CASH AT THE VENUE instead of online.
 *
 * No Razorpay involved at all — this writes the entry directly, straight to
 * 'confirmed', with amount_paid = 0 and fee = the tournament's fee, so the
 * admin console and the confirmation page both read it as "held, ₹fee due" —
 * the same language already used for a short online payment. `source` is
 * tagged 'cash_at_venue' so it is never confused with a broken/mismatched
 * online payment; the admin views and export both know to treat it as a
 * legitimate, expected zero.
 *
 * Gated by an invite coupon (lib/tournaments/cash-coupon.ts), checked ONLY
 * here — the client never learns the code, so nothing about the UI leaks it.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();

    const rl = await checkRateLimit(`tournament-cash:${getClientIp(req)}`, 20, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    const body = await req.json().catch(() => ({}));
    const parsed = tournamentCashRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const {
      tournament_id, category, skill_level, phone, partner_name, notes,
      player_name, email, age, sex, photo_url, dupr_id, dupr_level, coupon_code,
    } = parsed.data;

    if (!isValidCashCoupon(coupon_code)) {
      return NextResponse.json({ error: "That coupon code isn't valid." }, { status: 403 });
    }

    // Tournament must exist and still be open for entries.
    let t: Record<string, unknown> | undefined;
    try {
      const r = await turso.execute({
        sql: "SELECT id, name, event_date, fee, status, active FROM tournaments WHERE id = ? LIMIT 1",
        args: [tournament_id],
      });
      t = r.rows[0] as Record<string, unknown> | undefined;
    } catch (dbErr) {
      console.error("[tournament cash lookup error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
    if (!t || Number(t.active) !== 1 || String(t.status) !== "open") {
      return NextResponse.json({ error: "That tournament isn't open for registration." }, { status: 400 });
    }
    const fee = Math.max(0, Number(t.fee) || 0);

    // A logged-in player's name/email come from their account, same as the
    // paid flow — a client can't register someone else under their session.
    let userName = player_name;
    let userEmail = email;
    if (session) {
      try {
        const u = await turso.execute({
          sql: "SELECT full_name, email FROM users WHERE id = ? LIMIT 1",
          args: [session.id],
        });
        const row = u.rows[0];
        if (row) {
          userName = String(row.full_name ?? userName);
          userEmail = String(row.email ?? userEmail).toLowerCase();
        }
      } catch (dbErr) {
        console.error("[tournament cash user fetch error]", dbErr);
      }
    }

    // Same duplicate guard as the paid flow — one confirmed entry per email +
    // category, before writing anything.
    try {
      const dup = await turso.execute({
        sql: `SELECT id FROM tournament_registrations
              WHERE tournament_id = ? AND email = ? AND category = ? AND status = 'confirmed'
              LIMIT 1`,
        args: [tournament_id, userEmail, category],
      });
      if (dup.rows[0]) {
        return NextResponse.json(
          { error: "That email is already registered for this tournament." },
          { status: 409 },
        );
      }
    } catch (dbErr) {
      console.error("[tournament cash dup check error]", dbErr);
    }

    const id = uuid();
    const now = Date.now();
    try {
      await turso.execute({
        sql: `INSERT INTO tournament_registrations (
                id, tournament_id, user_id, player_name, email, phone,
                age, sex, photo_url, dupr_id, dupr_level,
                category, skill_level, partner_name, notes,
                fee, amount_paid, payment_id, source, status, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, 'confirmed', ?)`,
        args: [
          id, tournament_id, session?.id ?? null, userName, userEmail, phone,
          age, sex, photo_url, dupr_id || null, dupr_level || null,
          category, skill_level, partner_name || null, notes || null,
          fee, CASH_AT_VENUE_SOURCE, now,
        ],
      });
    } catch (insertErr) {
      const msg = String((insertErr as Error)?.message ?? "").toLowerCase();
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return NextResponse.json(
          { error: "That email is already registered for this tournament." },
          { status: 409 },
        );
      }
      console.error("[tournament cash insert error]", insertErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    try {
      const { notifyTournamentRegistration, notifyAdminAction } = require("@/lib/notifications");
      const { waitUntil } = require("@vercel/functions");
      const run = (async () => {
        if (notifyTournamentRegistration) {
          await notifyTournamentRegistration({
            id,
            userId: session?.id,
            userEmail,
            userName,
            tournamentName: String(t.name),
            eventDate: t.event_date ? String(t.event_date) : null,
            category,
            skillLevel: skill_level,
            partnerName: partner_name || null,
            fee,
            paymentMethod: "cash_at_venue",
          }).catch((e: unknown) => console.error("[tournament cash notify error]", e));
        }
        if (notifyAdminAction) {
          await notifyAdminAction(
            "Tournament registration (cash at venue)",
            `${userName} · ${String(t.name)} · ${category.replace("_", " ")} · ₹${fee} due at venue`,
            { url: "/admin" },
          ).catch(() => {});
        }
      })();
      if (waitUntil) waitUntil(run);
    } catch (e) {
      console.warn("[tournament cash notify dispatch skipped]", e);
    }

    return NextResponse.json({ ok: true, id, fee, tournamentName: String(t.name) });
  } catch (err) {
    console.error("[tournament cash error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
