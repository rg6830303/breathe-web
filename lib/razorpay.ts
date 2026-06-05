import Razorpay from "razorpay";

/** True when server-side Razorpay credentials are present. */
export function razorpayConfigured(): boolean {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  return Boolean(keyId && process.env.RAZORPAY_KEY_SECRET);
}

/** A configured Razorpay client, or throw if keys are missing. */
export function getRazorpay(): Razorpay {
  const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Razorpay not configured");
  return new Razorpay({ key_id, key_secret });
}

/**
 * Refund a captured payment. Pass `amountPaise` for a partial refund (e.g. one
 * slot out of a multi-slot order that shared a single payment); omit it to
 * refund the full captured amount. Throws on API failure so callers can decide
 * whether to surface or swallow.
 */
export async function refundPayment(
  paymentId: string,
  amountPaise?: number,
  notes?: Record<string, string>,
): Promise<{ id: string; status: string; amount: number }> {
  const rzp = getRazorpay();
  const payload: Record<string, unknown> = { speed: "normal" };
  if (amountPaise && amountPaise > 0) payload.amount = Math.round(amountPaise);
  if (notes) payload.notes = notes;
  // razorpay node SDK v2: payments.refund(paymentId, payload)
  const refund = await rzp.payments.refund(paymentId, payload as never);
  return {
    id: String((refund as { id?: string }).id ?? ""),
    status: String((refund as { status?: string }).status ?? "unknown"),
    amount: Number((refund as { amount?: number }).amount ?? 0),
  };
}
