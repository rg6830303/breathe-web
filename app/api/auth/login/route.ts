import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { turso } from "@/lib/turso";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loginSchema, formatZodError } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`auth-login:${ip}`, 6, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { email, password } = parsed.data;

    let row: Record<string, unknown> | undefined;
    try {
      const result = await turso.execute({
        sql: "SELECT id, full_name, email, password_hash FROM users WHERE email = ? LIMIT 1",
        args: [email],
      });
      row = result.rows[0] as unknown as Record<string, unknown> | undefined;
    } catch (dbErr) {
      // Don't 500 — fall through to the Supabase lookup so a Turso outage
      // doesn't lock everyone out.
      console.error("[login turso error]", dbErr);
    }
    if (!row) {
      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          const { data, error } = await supabase
            .from("users")
            .select("id, full_name, email, password_hash")
            .eq("email", email)
            .maybeSingle();
          if (data && !error) {
            row = {
              id: data.id,
              full_name: data.full_name,
              email: data.email,
              password_hash: data.password_hash,
            } as any;
          }
        }
      } catch (sbErr) {
        console.error("[login supabase fallback error]", sbErr);
      }
    }

    if (!row) {
      // Hash a dummy value so response timing for "no user" matches "wrong
      // password" (prevents user-enumeration via timing), plus a small delay.
      await bcrypt.compare(password, "$2a$12$0000000000000000000000000000000000000000000000000000a");
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, String(row.password_hash));
    if (!ok) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const id = String(row.id);
    const name = String(row.full_name);
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
    console.error("[login error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
