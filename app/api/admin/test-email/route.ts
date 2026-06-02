import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { mailerConfigState, sendMail, verifyMailer } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 30;
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in";
  const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  // Branded, transactional-looking content (logo + real copy) so the test
  // itself doesn't get spam-scored the way a bare "SMTP test" body would.
  const result = await sendMail({
    to,
    subject: "Your Breathe Pickleball email is working ✅",
    text:
      `Hi from Breathe Pickleball,\n\n` +
      `This is a confirmation that email delivery from your Breathe Pickleball booking system is working correctly.\n\n` +
      `Sent: ${when} IST\n\n` +
      `Booking confirmations, password resets, and notifications will now reach players reliably.\n\n` +
      `— Breathe Pickleball, Panchwati Complex, Kaikhali, Kolkata\n` +
      `${siteUrl}`,
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0d1426">` +
      `<div style="text-align:center;margin-bottom:16px"><img src="${siteUrl}/icons/icon-192.png" alt="Breathe Pickleball" width="64" height="64" style="border-radius:16px"/></div>` +
      `<h2 style="text-align:center;margin:0 0 8px">Email delivery is working ✅</h2>` +
      `<p style="color:#475569;line-height:1.6">This confirms that email from your Breathe Pickleball booking system is being delivered correctly. Booking confirmations, password resets, and notifications will now reach players reliably.</p>` +
      `<p style="color:#94a3b8;font-size:13px">Sent ${when} IST</p>` +
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>` +
      `<p style="color:#94a3b8;font-size:12px;line-height:1.6">Breathe Pickleball · Panchwati Complex, Kaikhali, Kolkata<br/>` +
      `<a href="${siteUrl}" style="color:#2F5BFF">${siteUrl.replace(/^https?:\/\//, "")}</a></p>` +
      `</div>`,
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
