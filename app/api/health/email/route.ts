import { NextResponse } from "next/server";
import { mailerConfigState, verifyMailer } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * Public read-only diagnostic for the email path. Returns presence flags and
 * SMTP verify status — never the env-var values themselves. Use this to
 * confirm Vercel has actually shipped your env vars to the running function
 * after editing them.
 */
export async function GET() {
  const state = mailerConfigState();
  let verify: { ok: boolean; error?: string; code?: string } = { ok: false, error: "skipped" };
  if (state.resendConfigured || (state.gmailUserPresent && state.gmailAppPasswordPresent)) {
    verify = await verifyMailer();
  }

  let hint: string;
  if (state.resendConfigured) {
    hint = state.resendFrom?.includes("resend.dev")
      ? "Resend is active but using the shared onboarding@resend.dev sender — this only delivers to your own Resend account email. Set RESEND_FROM to an address on a domain you've verified in Resend to deliver to everyone."
      : "Resend is active with your verified domain sender. Emails will reach inboxes.";
  } else if (!state.gmailUserPresent || !state.gmailAppPasswordPresent) {
    hint = "No email transport configured. Set RESEND_API_KEY (recommended) or GMAIL_USER + GMAIL_APP_PASSWORD in Vercel, then redeploy.";
  } else if (state.gmailAppPasswordCleanedLength !== 16) {
    hint = "Gmail App Password should be 16 letters after whitespace is stripped. Check the Vercel value.";
  } else {
    hint = verify.ok ? "Gmail SMTP healthy." : `SMTP verify failed (${verify.code ?? "no-code"}): ${verify.error}`;
  }

  return NextResponse.json({ config: state, smtpVerify: verify, expectedAppPasswordLength: 16, hint });
}
