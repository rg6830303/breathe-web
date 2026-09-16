import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { v4 as uuid } from "uuid";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Razorpay webhook — the safety net that makes a captured payment reach the
 * database even when the browser never comes back.
 *
 * The browser-driven /register/verify is the fast path, but it only runs if the
 * entrant's tab survives the payment: close it, lose signal, or hit a failing
 * deploy and the money is taken with nothing recorded. Razorpay calls this
 * endpoint server-to-server and retries on failure, so the entry lands anyway.
 *
 * Both paths are idempotent and converge on the same row: create-order parks a
 * 'pending' row against the order id, and whichever path arrives first flips it
 * to 'confirmed' with the amount Razorpay actually captured. If no pending row
 * exists (direct checkout, or an order placed before this shipped) the entry is
 * rebuilt from the order notes instead.
 *
 * Setup: Razorpay Dashboard → Settings → Webhooks → add
 * <site>/api/webhooks/razorpay for the `payment.captured` event, and put the
 * signing secret in RAZORPAY_WEBHOOK_SECRET. Without that env var this endpoint
 * rejects everything — an unsigned webhook is an open door to fake entries.
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  // Read the raw body: the signature is over the exact bytes sent.
  const raw = await req.text();

  if (!secret) {
    console.error("[razorpay webhook] RAZORPAY_WEBHOOK_SECRET is not set — rejecting");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const ok =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!ok) {
    console.error("[razorpay webhook] bad signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const type = String(event.event ?? "");
  if (type !== "payment.captured") {
    // Acknowledge anything else so Razorpay stops retrying it.
    return NextResponse.json({ ok: true, ignored: type });
  }

  const payment = (event.payload as Record<string, Record<string, Record<string, unknown>>> | undefined)
    ?.payment?.entity;
  if (!payment) return NextResponse.json({ ok: true, ignored: "no payment entity" });

  const paymentId = String(payment.id ?? "");
  const orderId = payment.order_id ? String(payment.order_id) : "";
  const notes = (payment.notes ?? {}) as Record<string, string>;
  const amountPaid = Math.round(Number(payment.amount ?? 0) / 100);

  // Not a tournament entry (a court booking, say) — nothing to do here.
  if (notes.kind && notes.kind !== "tournament") {
    return NextResponse.json({ ok: true, ignored: "not a tournament payment" });
  }

  try {
    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    // Already recorded by /verify or an earlier delivery of this webhook.
    const existing = await turso.execute({
      sql: "SELECT id, status FROM tournament_registrations WHERE payment_id = ? LIMIT 1",
      args: [paymentId],
    });
    if (existing.rows[0]) {
      return NextResponse.json({ ok: true, already: String(existing.rows[0].id) });
    }

    // The normal case: complete the row create-order parked for this order.
    if (orderId) {
      const done = await turso.execute({
        sql: `UPDATE tournament_registrations
              SET status = 'confirmed', payment_id = ?, amount_paid = ?
              WHERE order_id = ? AND status = 'pending'`,
        args: [paymentId, amountPaid, orderId],
      });
      if (done.rowsAffected) {
        console.warn(`[razorpay webhook] confirmed pending entry for order ${orderId}`);
        return NextResponse.json({ ok: true, confirmed: orderId });
      }
    }

    // No pending row. Rebuild what we can from the notes rather than drop it —
    // an entry with thin detail beats a payment with no entry at all.
    const tournamentId = notes.tournament_id ?? "";
    if (!tournamentId) {
      console.error("[razorpay webhook] captured tournament payment with no tournament_id", { paymentId });
      return NextResponse.json({ ok: true, ignored: "no tournament_id in notes" });
    }

    let fee = amountPaid;
    try {
      const t = await turso.execute({ sql: "SELECT fee FROM tournaments WHERE id = ? LIMIT 1", args: [tournamentId] });
      if (t.rows[0]) fee = Math.max(0, Number(t.rows[0].fee) || amountPaid);
    } catch {
      // Fall back to what was paid.
    }

    const email = String(notes.email ?? payment.email ?? "").toLowerCase();
    await turso.execute({
      sql: `INSERT INTO tournament_registrations (
              id, tournament_id, user_id, player_name, email, phone,
              category, notes, fee, amount_paid, payment_id, order_id, source, status, created_at
            ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'webhook', 'confirmed', ?)`,
      args: [
        uuid(),
        tournamentId,
        email ? email.split("@")[0] : "Unknown entrant",
        email || "unknown@unknown",
        payment.contact ? String(payment.contact) : null,
        notes.category ?? "singles",
        `Recorded by the Razorpay webhook from payment ${paymentId}; the registration form's details never reached the server.`,
        fee,
        amountPaid,
        paymentId,
        orderId || null,
        Number(payment.created_at ?? 0) * 1000 || Date.now(),
      ],
    });
    console.warn(`[razorpay webhook] rebuilt entry from notes for payment ${paymentId}`);
    return NextResponse.json({ ok: true, rebuilt: paymentId });
  } catch (err) {
    // A 500 makes Razorpay retry, which is what we want for a transient fault.
    console.error("[razorpay webhook error]", err);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
