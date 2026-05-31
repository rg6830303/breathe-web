import { NextRequest, NextResponse } from "next/server";
import { mailerConfigState, sendMail, verifyMailer } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * Public email smoke-test. No auth required, but the caller must supply the
 * shared secret in `?key=` so it's not trivially spammable.
 *
 *   GET /api/test-email?key=<TEST_EMAIL_KEY>&to=you@example.com
 *
 * Set TEST_EMAIL_KEY in Vercel env (any string). If unset, defaults to
 * "breathe-test-2026" so the prompted example URL works on first deploy.
 *
 * The response always includes the full mailer config state and the SMTP
 * error code/message when the send fails, so you can diagnose from one curl.
 */
const DEFAULT_KEY = "breathe-test-2026";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const key = url.searchParams.get("key") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const expected = process.env.TEST_EMAIL_KEY || DEFAULT_KEY;

  if (key !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ ok: false, error: "Provide ?to=valid@email.tld" }, { status: 400 });
  }

  const config = mailerConfigState();
  const verify = config.gmailUserPresent && config.gmailAppPasswordPresent
    ? await verifyMailer()
    : { ok: false, error: "GMAIL_USER or GMAIL_APP_PASSWORD missing in Vercel env" };

  const sent = await sendMail({
    to,
    subject: "Breathe Pickleball — email smoke test",
    text:
      `Hi,\n\n` +
      `This is the Breathe Pickleball email smoke test fired at ${new Date().toISOString()}.\n\n` +
      `If you got this, the production Gmail SMTP credentials are working and ` +
      `booking confirmations, password resets, and admin notifications will all ship correctly.`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:480px;margin:24px auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:12px">` +
      `<div style="font-weight:700;color:#2F5BFF;font-size:12px;letter-spacing:.2em">BREATHE PICKLEBALL</div>` +
      `<h2 style="margin:8px 0">Email smoke test</h2>` +
      `<p>Production Gmail SMTP is responding. Booking confirmations, password resets, and admin notifications are wired correctly.</p>` +
      `<p style="color:#6b7280;font-size:12px">Sent at ${new Date().toISOString()}</p>` +
      `</div>`,
  });

  return NextResponse.json({
    ok: sent.ok,
    to,
    config,
    smtpVerify: verify,
    send: sent.ok
      ? {
          messageId: sent.messageId,
          accepted: sent.accepted,
          rejected: sent.rejected,
        }
      : { error: sent.error, code: sent.code },
    hint: sent.ok
      ? "Email accepted by Gmail. Check your inbox + spam folder."
      : verify.ok
        ? "SMTP verify passed but send failed. Check rejected[] above."
        : "SMTP verify failed. See smtpVerify.error / smtpVerify.code.",
  });
}
