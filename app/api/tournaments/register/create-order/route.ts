import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { tournamentRegistrationSchema, formatZodError } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Start a tournament registration: validate the entry, confirm the tournament is
 * open and the player isn't already in that category, then create the Razorpay
 * order for the entry fee.
 *
 * Open to guests: entries do not require a player account, so an absent session
 * is fine and the entrant's details come from the validated form body.
 *
 * Mirrors /api/bookings/create-order, including the single-key fallback: with a
 * RAZORPAY_KEY_SECRET we create a verifiable Order; with only the public key id
 * we return amount+keyId for direct checkout.
 *
 * A 'pending' row IS written here, carrying the whole form. It holds no money
 * and is never counted as an entry, but it means a payment can always be
 * matched back to the person who made it — by ../verify, by the Razorpay
 * webhook, or by an admin reconciling later. Without it, a browser that dies
 * between payment and confirmation takes the entrant's details with it.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();

    const rl = await checkRateLimit(`tournament-register:${getClientIp(req)}`, 20, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    const body = await req.json().catch(() => ({}));
    const parsed = tournamentRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const {
      tournament_id, category, email, player_name, phone, age, sex,
      photo_url, dupr_id, dupr_level, skill_level, partner_name, notes,
    } = parsed.data;

    // Tournament must exist and still be open for entries.
    let row: Record<string, unknown> | undefined;
    try {
      const r = await turso.execute({
        sql: "SELECT id, name, fee, status, active FROM tournaments WHERE id = ? LIMIT 1",
        args: [tournament_id],
      });
      row = r.rows[0] as Record<string, unknown> | undefined;
    } catch (dbErr) {
      console.error("[tournament create-order lookup error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
    if (!row || Number(row.active) !== 1 || String(row.status) !== "open") {
      return NextResponse.json({ error: "That tournament isn't open for registration." }, { status: 400 });
    }

    // Block a duplicate entry before taking any money.
    try {
      const dup = await turso.execute({
        sql: `SELECT id FROM tournament_registrations
              WHERE tournament_id = ? AND email = ? AND category = ? AND status = 'confirmed'
              LIMIT 1`,
        args: [tournament_id, email, category],
      });
      if (dup.rows[0]) {
        return NextResponse.json(
          { error: "That email is already registered for this tournament." },
          { status: 409 },
        );
      }
    } catch (dbErr) {
      console.error("[tournament create-order dup check error]", dbErr);
    }

    const fee = Math.max(0, Number(row.fee) || 0);
    if (fee <= 0) {
      return NextResponse.json(
        { error: "This tournament has no entry fee set. Please contact the club." },
        { status: 400 },
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId) return NextResponse.json({ error: "Razorpay is not configured." }, { status: 500 });

    const amountPaise = Math.round(fee * 100);

    // Direct checkout (public key only) — no server-side order to verify.
    if (!keySecret) {
      return NextResponse.json({ amount: amountPaise, currency: "INR", keyId, fee });
    }

    let order;
    try {
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
      order = await rzp.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: uuid(),
        notes: { user_id: session?.id ?? "guest", email, tournament_id, category, kind: "tournament" },
      });
    } catch (rzpErr) {
      console.error("[tournament create-order razorpay error]", rzpErr);
      return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
    }

    // Park the entry against the order. Best-effort: a failure here must not
    // stop the payment — ../verify and the webhook both fall back to inserting
    // a fresh row when no pending one is found.
    try {
      await turso.execute({
        sql: `INSERT INTO tournament_registrations (
                id, tournament_id, user_id, player_name, email, phone,
                age, sex, photo_url, dupr_id, dupr_level,
                category, skill_level, partner_name, notes,
                fee, amount_paid, payment_id, order_id, source, status, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, 'checkout', 'pending', ?)`,
        args: [
          uuid(), tournament_id, session?.id ?? null, player_name, email, phone,
          age, sex, photo_url, dupr_id || null, dupr_level || null,
          category, skill_level, partner_name || null, notes || null,
          fee, order.id, Date.now(),
        ],
      });
    } catch (dbErr) {
      console.error("[tournament create-order pending row error]", dbErr);
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: "INR",
      keyId,
      fee,
    });
  } catch (err) {
    console.error("[tournament create-order error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
