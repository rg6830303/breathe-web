import { NextResponse, after } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { cookies } from "next/headers";
import { turso } from "@/lib/turso";
import { signToken, COOKIE_NAME, userSessionDurations } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { signupSchema, formatZodError } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`auth-signup:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many signup attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { name, email, password, phone } = parsed.data;

    const { supabase, hasSupabase } = require("@/lib/supabase");

    // Duplicate check across BOTH backends (a user may exist in either).
    try {
      const t = await turso.execute({ sql: "SELECT id FROM users WHERE email = ? LIMIT 1", args: [email] });
      if (t.rows.length > 0) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
      }
    } catch (e) {
      console.error("[signup turso dup-check error]", e);
    }
    if (hasSupabase) {
      try {
        const { data } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
        if (data?.id) {
          return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
        }
      } catch (e) {
        console.error("[signup supabase dup-check error]", e);
      }
    }

    const id = uuid();
    const hash = await bcrypt.hash(password, 12);
    const now = Date.now();

    // Write to BOTH backends. Succeed if AT LEAST ONE write lands, so a single
    // misconfigured/unreachable backend can never block account creation (the
    // root cause of "signups don't persist → no reset email possible").
    let tursoOk = false;
    let supabaseOk = false;
    try {
      await turso.execute({
        sql: "INSERT INTO users (id, email, password_hash, full_name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [id, email, hash, name, phone ?? null, now],
      });
      tursoOk = true;
    } catch (insertErr) {
      console.error("[signup turso insert error]", insertErr);
    }
    if (hasSupabase) {
      try {
        const { error } = await supabase.from("users").insert({
          id, email, password_hash: hash, full_name: name, phone: phone ?? null, created_at: now,
        });
        supabaseOk = !error;
        if (error) console.error("[signup supabase insert error]", error);
      } catch (sbErr) {
        console.error("[signup supabase insert exception]", sbErr);
      }
    }

    if (!tursoOk && !supabaseOk) {
      // Both writes failed — surface a real error instead of a fake success.
      return NextResponse.json(
        { error: "We couldn't create your account right now. Please try again shortly." },
        { status: 500 },
      );
    }
    console.log("[signup] created", { email, tursoOk, supabaseOk });

    // Welcome email — sent AFTER the response so signup stays instant, but still
    // guaranteed to run on this serverless invocation (Next 15 `after`).
    after(async () => {
      try {
        const { notifyWelcome } = require("@/lib/notifications");
        await notifyWelcome({ email, name });
      } catch (e) {
        console.error("[signup welcome email error]", e);
      }
    });

    const { exp, maxAge } = userSessionDurations(body?.pwa === true);
    const token = await signToken({ id, email, name, role: "user" }, exp);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge,
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({ ok: true, user: { id, name, email } });
  } catch (err: unknown) {
    console.error("[signup error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
