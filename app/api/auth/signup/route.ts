import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { cookies } from "next/headers";
import { turso } from "@/lib/turso";
import { signToken, COOKIE_NAME } from "@/lib/auth";
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

    let existing;
    try {
      existing = await turso.execute({
        sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
        args: [email],
      });
    } catch (dbErr) {
      console.error("[signup db-check error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    const id = uuid();
    const hash = await bcrypt.hash(password, 12);
    const now = Date.now();

    try {
      await turso.execute({
        sql: "INSERT INTO users (id, email, password_hash, full_name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [id, email, hash, name, phone ?? null, now],
      });
    } catch (insertErr) {
      console.error("[signup db-insert error]", insertErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    try {
      const { supabase, hasSupabase } = require("@/lib/supabase");
      if (hasSupabase) {
        await supabase.from("users").insert({
          id,
          email,
          password_hash: hash,
          full_name: name,
          phone: phone ?? null,
          created_at: now,
        });
      }
    } catch (sbErr) {
      console.error("[signup supabase sync error]", sbErr);
    }

    const token = await signToken({ id, email, name, role: "user" });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({ ok: true, user: { id, name, email } });
  } catch (err: unknown) {
    console.error("[signup error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
