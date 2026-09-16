import Razorpay from "razorpay";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";

/**
 * Close the loop on payments without a webhook.
 *
 * create-order parks a 'pending' row against the Razorpay order id, and
 * /register/verify confirms it when the entrant's browser comes back. When that
 * browser never comes back — tab closed, signal lost, app killed mid-payment —
 * the row stays pending while the money sits captured at the gateway.
 *
 * This walks those pending rows and asks Razorpay what happened to each one's
 * order. It is order-scoped, so there is no guessing: a payment found under the
 * entry's own order IS that entry's payment, and the amount recorded is the one
 * the gateway captured. Safe to run repeatedly — a row that is already
 * confirmed is not matched by the UPDATE.
 *
 * Runs from the daily cron and from the admin console's "Reconcile now".
 */
export type ReconcileResult = {
  checked: number;
  confirmed: number;
  stillPending: number;
  errors: number;
};

export async function reconcileTournamentPayments(days = 14): Promise<ReconcileResult> {
  const out: ReconcileResult = { checked: 0, confirmed: 0, stillPending: 0, errors: 0 };

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return out;

  await ensureSchema().catch(() => {});
  await ensureTournamentSchema().catch(() => {});

  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  let pending: Array<Record<string, unknown>> = [];
  try {
    const r = await turso.execute({
      sql: `SELECT id, order_id, fee FROM tournament_registrations
            WHERE status = 'pending' AND order_id IS NOT NULL AND created_at >= ?
            ORDER BY created_at DESC
            LIMIT 200`,
      args: [since],
    });
    pending = r.rows as Array<Record<string, unknown>>;
  } catch (err) {
    console.error("[reconcile] could not read pending entries", err);
    out.errors++;
    return out;
  }

  if (pending.length === 0) return out;

  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

  for (const row of pending) {
    out.checked++;
    const orderId = String(row.order_id);
    try {
      const res = (await rzp.orders.fetchPayments(orderId)) as unknown as {
        items?: Array<Record<string, unknown>>;
      };
      const captured = (res.items ?? []).find((p) => String(p.status ?? "") === "captured");
      if (!captured) {
        out.stillPending++;
        continue;
      }

      const paymentId = String(captured.id ?? "");
      const amountPaid = Math.round(Number(captured.amount ?? 0) / 100);

      const done = await turso.execute({
        sql: `UPDATE tournament_registrations
              SET status = 'confirmed', payment_id = ?, amount_paid = ?, source = 'reconciled'
              WHERE id = ? AND status = 'pending'`,
        args: [paymentId, amountPaid, String(row.id)],
      });
      if (done.rowsAffected) {
        out.confirmed++;
        console.warn(`[reconcile] confirmed entry ${String(row.id)} from payment ${paymentId}`);
      }
    } catch (err) {
      out.errors++;
      console.error(`[reconcile] order ${orderId} failed`, err);
    }
  }

  return out;
}
