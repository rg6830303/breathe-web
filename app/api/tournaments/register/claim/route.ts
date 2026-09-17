import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Confirm an entry by asking Razorpay about its order — `{ orderId }`.
 *
 * The normal path (/register/verify) depends on Razorpay's checkout handler
 * firing in the entrant's tab. On mobile UPI that tab hands off to GPay or
 * PhonePe and frequently never runs the callback, so the payment is captured
 * while the entry stays 'pending' — which is exactly how registrations were
 * going unrecorded.
 *
 * This route needs no callback and no signature. It takes an order id, asks the
 * gateway what happened to THAT order, and confirms the pending row we created
 * for it. That is safe without a signature precisely because the question is
 * order-scoped: the caller cannot invent a payment, and a row is only ever
 * completed with the amount Razorpay says it captured. A caller who guesses an
 * order id achieves nothing beyond confirming an entry that was genuinely paid
 * for. Idempotent: a row already confirmed is reported, not rewritten.
 */
export async function POST(req: Request) {
  try {
    const rl = await checkRateLimit(`tournament-claim:${getClientIp(req)}`, 30, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId ?? "").trim();
    if (!orderId) return NextResponse.json({ error: "An order reference is required." }, { status: 400 });

    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    // The entry parked against this order by create-order.
    let row: Record<string, unknown> | undefined;
    try {
      const r = await turso.execute({
        sql: `SELECT id, status, fee, amount_paid, payment_id
              FROM tournament_registrations WHERE order_id = ? LIMIT 1`,
        args: [orderId],
      });
      row = r.rows[0] as Record<string, unknown> | undefined;
    } catch (dbErr) {
      console.error("[claim lookup error]", dbErr);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    if (!row) return NextResponse.json({ state: "unknown" });
    if (String(row.status) === "confirmed") {
      return NextResponse.json({ state: "confirmed", id: String(row.id) });
    }
    if (String(row.status) === "cancelled") {
      return NextResponse.json({ state: "cancelled", id: String(row.id) });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ state: "pending", id: String(row.id) });

    let captured: Record<string, unknown> | undefined;
    try {
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const res = (await rzp.orders.fetchPayments(orderId)) as unknown as {
        items?: Array<Record<string, unknown>>;
      };
      captured = (res.items ?? []).find((p) => String(p.status ?? "") === "captured");
    } catch (rzpErr) {
      console.error("[claim razorpay error]", rzpErr);
      return NextResponse.json({ state: "pending", id: String(row.id) });
    }

    if (!captured) return NextResponse.json({ state: "pending", id: String(row.id) });

    const paymentId = String(captured.id ?? "");
    const amountPaid = Math.round(Number(captured.amount ?? 0) / 100);

    try {
      await turso.execute({
        sql: `UPDATE tournament_registrations
              SET status = 'confirmed', payment_id = ?, amount_paid = ?
              WHERE id = ? AND status = 'pending'`,
        args: [paymentId, amountPaid, String(row.id)],
      });
    } catch (dbErr) {
      console.error("[claim update error]", dbErr);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    console.warn(`[claim] confirmed entry ${String(row.id)} from payment ${paymentId}`);
    return NextResponse.json({ state: "confirmed", id: String(row.id), amountPaid });
  } catch (err) {
    console.error("[claim error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
