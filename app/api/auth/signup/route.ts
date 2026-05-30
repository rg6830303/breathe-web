import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { cookies } from "next/headers";
import { turso } from "@/lib/turso";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const phone = body.phone ? String(body.phone).trim() : null;

    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

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
        args: [id, email, hash, name, phone, now],
      });
    } catch (insertErr) {
      console.error("[signup db-insert error]", insertErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
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
