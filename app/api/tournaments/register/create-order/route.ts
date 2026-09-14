import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { tournamentRegistrationSchema, formatZodError } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Start a tournament registration: validate the entry, confirm the tournament is
 * open and the player isn't already in that category, then create the Razorpay
 * order for the entry fee.
 *
 * Mirrors /api/bookings/create-order, including the single-key fallback: with a
 * RAZORPAY_KEY_SECRET we create a verifiable Order; with only the public key id
 * we return amount+keyId for direct checkout. Nothing is written to
 * tournament_registrations here — the row is only created after payment in
 * ../verify, so an abandoned checkout leaves no phantom entry.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Please log in to register." }, { status: 401 });

    const rl = await checkRateLimit(`tournament-register:${getClientIp(req)}`, 20, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    await ensureSchema().catch(() => {});

    const body = await req.json().catch(() => ({}));
    const parsed = tournamentRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { tournament_id, category } = parsed.data;

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
              WHERE tournament_id = ? AND user_id = ? AND category = ? AND status = 'confirmed'
              LIMIT 1`,
        args: [tournament_id, session.id, category],
      });
      if (dup.rows[0]) {
        return NextResponse.json(
          { error: "You're already registered for this category." },
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
        notes: { user_id: session.id, tournament_id, category, kind: "tournament" },
      });
    } catch (rzpErr) {
      console.error("[tournament create-order razorpay error]", rzpErr);
      return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
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
