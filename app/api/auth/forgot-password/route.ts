import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { Resend } from "resend";
import React from "react";
import { turso } from "@/lib/turso";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { forgotPasswordSchema, formatZodError } from "@/lib/validation";
import PasswordReset from "@/emails/PasswordReset";

export const runtime = "nodejs";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESET_TTL_MIN = 60;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`auth-forgot:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { email } = parsed.data;

    // Always respond as if successful — prevent email enumeration.
    const genericResponse = NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });

    let userRow;
    try {
      const result = await turso.execute({
        sql: "SELECT id, full_name FROM users WHERE email = ? LIMIT 1",
        args: [email],
      });
      userRow = result.rows[0];
    } catch (dbErr) {
      console.error("[forgot-password user lookup error]", dbErr);
      return genericResponse;
    }

    if (!userRow) return genericResponse;

    const userId = String(userRow.id);
    const userName = String(userRow.full_name);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const now = Date.now();
    const expiresAt = now + RESET_TTL_MS;

    try {
      await turso.execute({
        sql: "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        args: [tokenHash, userId, expiresAt, now],
      });
    } catch (insertErr) {
      console.error("[forgot-password insert error]", insertErr);
      return genericResponse;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://breathe-web-six.vercel.app";
    const resetUrl = `${siteUrl}/reset-password?token=${rawToken}`;

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Breathe Pickleball <bookings@breathepickleball.in>",
        to: email,
        subject: "Reset your Breathe Pickleball password",
        react: React.createElement(PasswordReset, {
          customerName: userName,
          resetUrl,
          expiresInMinutes: RESET_TTL_MIN,
        }),
      });
    } catch (emailErr) {
      console.error("[forgot-password email error]", emailErr);
      // Fall through to generic response — don't leak email-send failure.
    }

    return genericResponse;
  } catch (err: unknown) {
    console.error("[forgot-password error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
