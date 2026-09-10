/**
 * Meta Pixel conversion events.
 *
 * Every call is a SAFE NO-OP when the pixel isn't available — ad blockers, iOS
 * tracking prevention, a CSP hiccup, or simply the script still in flight. The
 * booking flow must never break because analytics failed, so nothing here ever
 * throws and no caller needs a try/catch.
 *
 * (The base snippet defines `fbq` with an internal queue immediately, so events
 * fired before fbevents.js finishes loading are buffered and replayed.)
 */

type FbParams = Record<string, unknown>;

/**
 * Meta Pixel ID. PUBLIC by design — it ships in the page source and in every
 * request to Meta, so it is not a secret. Overridable per environment (e.g. a
 * test pixel) and falls back to the live ID so tracking needs zero env config.
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1083171524398058";

/** Currency for all monetary conversion values. */
export const CURRENCY = "INR";

/**
 * Flat advance charged online at checkout; the balance is settled at the venue.
 * Reported as a custom param on Purchase for reconciliation against Razorpay.
 */
export const ADVANCE_INR = 200;

function fbq(): ((...args: unknown[]) => void) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { fbq?: (...args: unknown[]) => void };
  return typeof w.fbq === "function" ? w.fbq : null;
}

/** Fire a Meta *standard* event (Purchase, InitiateCheckout, Lead, …). */
export function trackFb(event: string, params?: FbParams): void {
  try {
    const f = fbq();
    if (!f) return;
    if (params) f("track", event, params);
    else f("track", event);
  } catch {
    /* analytics must never break the app */
  }
}
