/**
 * Cash-at-venue gate for tournament registration.
 *
 * "Cash at venue" lets an entrant skip Razorpay and pay the entry fee in person
 * at the club — but it must not be a self-serve way to avoid paying online, so
 * it is locked behind an invite code the club hands out to close friends only.
 *
 * This is a low-stakes courtesy gate, not a security boundary: the code is
 * checked ONLY here, server-side, and never shipped to the client bundle (no
 * NEXT_PUBLIC_ prefix), so the option being visible in the UI reveals neither
 * the code nor a way around it. Override with TOURNAMENT_CASH_COUPON to rotate
 * it without touching code.
 */
const CASH_AT_VENUE_COUPON = (process.env.TOURNAMENT_CASH_COUPON || "CLOSEFRIEND").trim();

/** Case-insensitive, whitespace-tolerant — entrants will type it on a phone. */
export function isValidCashCoupon(input: string): boolean {
  return input.trim().toUpperCase() === CASH_AT_VENUE_COUPON.toUpperCase();
}

/** Tags a registration row as a deliberate cash-at-venue entry (not a stalled
 *  or mismatched online payment) — read back by the admin console and export. */
export const CASH_AT_VENUE_SOURCE = "cash_at_venue";
