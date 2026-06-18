import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live config diagnostic — reports WHICH env vars the running deployment can see
 * (presence only, never the values) plus the deployed commit SHA. Use this to
 * end "I set the var but it still says not configured" guesswork:
 *   - `commit` ≠ your latest main  → production is serving an OLD build (redeploy
 *     / fix the Vercel Production Branch).
 *   - `razorpay.keyIdPresent: false` → the var isn't in the build's env scope
 *     (wrong name, or set on Preview instead of Production, or no redeploy).
 *   - `razorpay.mode: "direct"` → only the public key id is set (single-key
 *     checkout); `"order"` → full key id + secret (verified checkout).
 *
 * Safe to expose: booleans + the public commit SHA only. No secret is returned.
 */
export async function GET() {
  const present = (v?: string | null) => Boolean(v && String(v).trim());
  const keyId = present(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) || present(process.env.RAZORPAY_KEY_ID);
  const keySecret = present(process.env.RAZORPAY_KEY_SECRET);

  return NextResponse.json({
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7),
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
    razorpay: {
      keyIdPresent: keyId,
      keySecretPresent: keySecret,
      mode: keyId ? (keySecret ? "order (verified)" : "direct (single-key)") : "NOT CONFIGURED",
    },
    db: { postgresUrlPresent: present(process.env.POSTGRES_URL) },
    session: { secretPresent: present(process.env.SESSION_SECRET) },
    google: {
      idPresent: present(process.env.GOOGLE_CLIENT_ID),
      secretPresent: present(process.env.GOOGLE_CLIENT_SECRET),
    },
    email: {
      resend: present(process.env.RESEND_API_KEY),
      gmail: present(process.env.GMAIL_USER) && present(process.env.GMAIL_APP_PASSWORD),
    },
    push: {
      vapidPublicPresent:
        present(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) || present(process.env.VAPID_PUBLIC_KEY),
      vapidPrivatePresent: present(process.env.VAPID_PRIVATE_KEY),
    },
    siteUrlPresent: present(process.env.NEXT_PUBLIC_SITE_URL),
  });
}
