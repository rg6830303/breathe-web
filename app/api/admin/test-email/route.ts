import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { mailerConfigState, sendMail, verifyMailer } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only Gmail SMTP probe + sender.
 *
 *   GET  /api/admin/test-email           → verify transport config + return env presence map
 *   POST /api/admin/test-email           → send a test email to ADMIN_EMAIL or admin.email
 *   POST /api/admin/test-email { to }    → send a test email to a chosen address
 *
 * Returns the actual error message + code from nodemailer if SMTP fails so
 * you can see whether GMAIL_USER / GMAIL_APP_PASSWORD are wrong, missing,
 * malformed, or blocked.
 */
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = mailerConfigState();
  const verify = state.gmailUserPresent && state.gmailAppPasswordPresent
    ? await verifyMailer()
    : { ok: false, error: "GMAIL_USER or GMAIL_APP_PASSWORD missing in Vercel env" };

  return NextResponse.json({
    config: state,
    smtpVerify: verify,
    signedInAs: admin.email,
  });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const to = String(body?.to ?? process.env.ADMIN_EMAIL ?? admin.email);
  const now = new Date().toISOString();

  const result = await sendMail({
    to,
    subject: "Breathe Pickleball — SMTP test",
    text:
      `Gmail SMTP test sent at ${now}.\n\n` +
      `If you received this email at ${to}, your GMAIL_USER + GMAIL_APP_PASSWORD env vars are working ` +
      `and bookings/password-reset/admin-notification emails will go out correctly.`,
    html:
      `<p>Gmail SMTP test sent at <strong>${now}</strong>.</p>` +
      `<p>If you received this email at <code>${to}</code>, your <code>GMAIL_USER</code> + <code>GMAIL_APP_PASSWORD</code> ` +
      `env vars are working and bookings/password-reset/admin-notification emails will go out correctly.</p>`,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, to, error: result.error, code: result.code, config: mailerConfigState() },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    to,
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
  });
}
