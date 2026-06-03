import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import crypto from "node:crypto";
import { turso } from "@/lib/turso";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { forgotPasswordSchema, formatZodError } from "@/lib/validation";
import { sendMail } from "@/lib/mailer";

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

    const debugKey = new URL(req.url).searchParams.get("debug");
    const debugOn = !!debugKey && debugKey === (process.env.TEST_EMAIL_KEY || "");

    if (!userId) {
      // No account for this email. In debug mode tell the owner so they can see
      // the lookup failed (the usual cause of "no reset email" for a real user
      // is a DB mismatch between where signup wrote and where this app reads).
      if (debugOn) {
        return NextResponse.json({ ok: true, debug: { userFound: false, sent: false } });
      }
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const now = Date.now();
    const expiresAt = now + RESET_TTL_MS;

    // Persist the reset token to BOTH backends; do NOT block the email on a
    // single backend's insert failure (e.g. FK issue when the user only lives
    // in Supabase). As long as one store has the token, reset-password works.
    let tokenStored = false;
    try {
      await turso.execute({
        sql: "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        args: [tokenHash, userId, expiresAt, now],
      });
      tokenStored = true;
    } catch (insertErr) {
      console.error("[forgot-password turso token insert error]", insertErr);
    }
    try {
      const { supabase, hasSupabase } = require("@/lib/supabase");
      if (hasSupabase) {
        const { error } = await supabase.from("password_reset_tokens").insert({
          token_hash: tokenHash,
          user_id: userId,
          expires_at: expiresAt,
          created_at: now,
        });
        if (!error) tokenStored = true;
      }
    } catch (sbErr) {
      console.error("[forgot-password supabase token insert error]", sbErr);
    }
    if (!tokenStored) {
      console.error("[forgot-password] could not store reset token in any backend");
      if (debugOn) return NextResponse.json({ ok: true, debug: { userFound: true, tokenStored: false, sent: false } });
      return genericResponse;
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in").replace(/\/$/, "");
    const resetUrl = `${siteUrl}/reset-password?token=${rawToken}`;

    // Plain inline HTML (NOT @react-email/render, which can throw/hang on the
    // serverless runtime — the reason these mails never sent while the simple
    // test email did). Mirrors the working test-email approach.
    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0d1426">` +
      `<div style="text-align:center;margin-bottom:16px"><img src="${siteUrl}/icons/icon-192.png" alt="Breathe Pickleball" width="56" height="56" style="border-radius:14px"/></div>` +
      `<h2 style="text-align:center;margin:0 0 8px">Reset your password</h2>` +
      `<p style="color:#475569;line-height:1.6">Hi ${userName}, we received a request to reset your Breathe Pickleball password. Click the button below to choose a new one. This link expires in ${RESET_TTL_MIN} minutes.</p>` +
      `<p style="text-align:center;margin:24px 0"><a href="${resetUrl}" style="background:#2F5BFF;color:#fff;text-decoration:none;padding:13px 28px;border-radius:9999px;font-weight:700;display:inline-block">Reset password</a></p>` +
      `<p style="color:#94a3b8;font-size:12px;word-break:break-all">Or paste this link: ${resetUrl}</p>` +
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>` +
      `<p style="color:#94a3b8;font-size:12px;line-height:1.6">If you didn't request this, you can ignore this email — your password won't change.<br/>Breathe Pickleball · Panchwati Complex, Kaikhali, Kolkata</p>` +
      `</div>`;
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
    if (debugOn) {
      return NextResponse.json({
        ok: true,
        debug: {
          userFound: true,
          tokenStored,
          ...(result.ok
            ? { sent: true, messageId: result.messageId, transport: result.transport }
            : { sent: false, error: result.error, code: result.code }),
        },
      });
    }

    return genericResponse;
  } catch (err: unknown) {
    console.error("[forgot-password error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
