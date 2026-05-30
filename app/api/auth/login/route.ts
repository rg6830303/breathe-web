import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { turso } from "@/lib/turso";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    let result;
    try {
      result = await turso.execute({
        sql: "SELECT id, full_name, email, password_hash FROM users WHERE email = ? LIMIT 1",
        args: [email],
      });
    } catch (dbErr) {
      console.error("[login db error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    let row = result.rows[0];
    if (!row) {
      // Supabase user lookup fallback
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
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, String(row.password_hash));
    if (!ok) {
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
