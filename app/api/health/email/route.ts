import { NextResponse } from "next/server";
import { mailerConfigState, verifyMailer } from "@/lib/mailer";

export const runtime = "nodejs";
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
  if (state.gmailUserPresent && state.gmailAppPasswordPresent) {
    verify = await verifyMailer();
  }
  return NextResponse.json({
    config: state,
    smtpVerify: verify,
    expectedAppPasswordLength: 16,
    hint:
      !state.gmailUserPresent || !state.gmailAppPasswordPresent
        ? "Set GMAIL_USER and GMAIL_APP_PASSWORD in Vercel (Production env), then redeploy."
        : state.gmailAppPasswordCleanedLength !== 16
          ? "App Password should be 16 alphanumeric chars after whitespace is stripped. Check Vercel value."
          : verify.ok
            ? "Mailer healthy."
            : `SMTP verify failed (${verify.code ?? "no-code"}): ${verify.error}`,
  });
}
