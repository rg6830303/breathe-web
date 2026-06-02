import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { turso } from "@/lib/turso";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { resetPasswordSchema, formatZodError } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`auth-reset:${ip}`, 10, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { token, password } = parsed.data;

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = Date.now();

    let tokenRow: Record<string, unknown> | undefined;
    try {
      const result = await turso.execute({
        sql: "SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? LIMIT 1",
        args: [tokenHash],
      });
      tokenRow = result.rows[0] as unknown as Record<string, unknown> | undefined;
    } catch (dbErr) {
      console.error("[reset-password turso lookup error]", dbErr);
    }
    // Fall back to Supabase if the token isn't in Turso (it may have been
    // stored there during forgot-password when Turso was unavailable).
    if (!tokenRow) {
      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          const { data } = await supabase
            .from("password_reset_tokens")
            .select("user_id, expires_at, used_at")
            .eq("token_hash", tokenHash)
            .maybeSingle();
          if (data) tokenRow = data as Record<string, unknown>;
        }
      } catch (sbErr) {
        console.error("[reset-password supabase lookup error]", sbErr);
      }
    }

    if (!tokenRow) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }
    if (tokenRow.used_at !== null && tokenRow.used_at !== undefined) {
      return NextResponse.json({ error: "This reset link has already been used." }, { status: 400 });
    }
    if (Number(tokenRow.expires_at) < now) {
      return NextResponse.json({ error: "This reset link has expired. Request a new one." }, { status: 400 });
    }

    const userId = String(tokenRow.user_id);
    const newHash = await bcrypt.hash(password, 12);

    try {
      await turso.execute({
        sql: "UPDATE users SET password_hash = ? WHERE id = ?",
        args: [newHash, userId],
      });
      await turso.execute({
        sql: "UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?",
        args: [now, tokenHash],
      });
    } catch (updateErr) {
      console.error("[reset-password update error]", updateErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    try {
      const { supabase, hasSupabase } = require("@/lib/supabase");
      if (hasSupabase) {
        await supabase.from("users").update({ password_hash: newHash }).eq("id", userId);
      }
    } catch (sbErr) {
      console.error("[reset-password supabase sync error]", sbErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[reset-password error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
