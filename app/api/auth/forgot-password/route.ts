import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import crypto from "node:crypto";
import React from "react";
import { render } from "@react-email/render";
import { turso } from "@/lib/turso";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { forgotPasswordSchema, formatZodError } from "@/lib/validation";
import { sendMail } from "@/lib/mailer";
import PasswordReset from "@/emails/PasswordReset";

export const runtime = "nodejs";
export const maxDuration = 30;

const RESET_TTL_MS = 60 * 60 * 1000;
const RESET_TTL_MIN = 60;

export async function POST(req: Request) {
  try {
    await ensureSchema();
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

    // Generic success response — prevent email enumeration.
    const genericResponse = NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });

    let userId: string | null = null;
    let userName = "there";
    try {
      const result = await turso.execute({
        sql: "SELECT id, full_name FROM users WHERE email = ? LIMIT 1",
        args: [email],
      });
      const row = result.rows[0];
      if (row) {
        userId = String(row.id);
        userName = String(row.full_name);
      }
    } catch (dbErr) {
      console.error("[forgot-password turso lookup error]", dbErr);
    }

    // Fallback: the user may only exist in the Supabase mirror (signup wrote
    // there when Turso was briefly unreachable). Without this a real
    // registered user would silently get no reset email.
    if (!userId) {
      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          const { data } = await supabase
            .from("users")
            .select("id, full_name")
            .eq("email", email)
            .maybeSingle();
          if (data?.id) {
            userId = String(data.id);
            userName = String(data.full_name ?? "there");
          }
        }
      } catch (sbErr) {
        console.error("[forgot-password supabase lookup error]", sbErr);
      }
    }

    if (!userId) return genericResponse;

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

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in").replace(/\/$/, "");
    const resetUrl = `${siteUrl}/reset-password?token=${rawToken}`;

    const html = await render(
      React.createElement(PasswordReset, {
        customerName: userName,
        resetUrl,
        expiresInMinutes: RESET_TTL_MIN,
      }),
    );
    const text =
      `Hi ${userName},\n\n` +
      `We received a request to reset your Breathe Pickleball password.\n\n` +
      `Click this link to choose a new password (expires in ${RESET_TTL_MIN} minutes):\n${resetUrl}\n\n` +
      `If you didn't request this, you can ignore this email — your password won't change.`;

    const result = await sendMail({
      to: email,
      subject: "Reset your Breathe Pickleball password",
      html,
      text,
    });

    if (!result.ok) {
      // Email failed — log details but still return the generic success message
      // to avoid leaking SMTP configuration state to the caller.
      console.error("[forgot-password mail send failed]", result.error, result.code);
    } else {
      console.log("[forgot-password sent]", { to: email, messageId: result.messageId, transport: result.transport });
    }

    // Optional debug echo (only when the shared TEST_EMAIL_KEY is supplied) so
    // the owner can see the real send result while diagnosing — never exposed
    // to normal callers.
    const debugKey = new URL(req.url).searchParams.get("debug");
    if (debugKey && debugKey === (process.env.TEST_EMAIL_KEY || "")) {
      return NextResponse.json({
        ok: true,
        debug: result.ok
          ? { sent: true, messageId: result.messageId, transport: result.transport }
          : { sent: false, error: result.error, code: result.code },
      });
    }

    return genericResponse;
  } catch (err: unknown) {
    console.error("[forgot-password error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
