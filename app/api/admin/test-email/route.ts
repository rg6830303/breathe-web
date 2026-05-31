import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sendMail, verifyMailer } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only Gmail SMTP probe.
 *
 *   GET  /api/admin/test-email          → verify transport config only (no send)
 *   POST /api/admin/test-email          → send a test email to the admin's own address
 *   POST /api/admin/test-email { to }   → send a test email to a chosen address
 *
 * Returns the actual error message from nodemailer if SMTP auth fails — so you
 * can see exactly whether GMAIL_USER / GMAIL_APP_PASSWORD are correct.
 */
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const v = await verifyMailer();
  return NextResponse.json({
    ok: v.ok,
    error: v.ok ? undefined : v.error,
    gmailUserSet: !!process.env.GMAIL_USER,
    gmailAppPasswordSet: !!process.env.GMAIL_APP_PASSWORD,
    adminEmailSet: !!process.env.ADMIN_EMAIL,
  });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const to = String(body?.to ?? admin.email);

  const result = await sendMail({
    to,
    subject: "Breathe Pickleball — SMTP test",
    text: `This is a Gmail SMTP test from the admin console at ${new Date().toISOString()}. If you got this, GMAIL_USER + GMAIL_APP_PASSWORD are working.`,
    html: `<p>This is a Gmail SMTP test from the admin console at <strong>${new Date().toISOString()}</strong>.</p><p>If you got this, <code>GMAIL_USER</code> + <code>GMAIL_APP_PASSWORD</code> are working.</p>`,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, messageId: result.messageId, to });
}
