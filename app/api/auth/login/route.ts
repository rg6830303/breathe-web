import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { turso } from "@/lib/turso";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const result = await turso.execute({
      sql: "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
      args: [email],
    });
    const row = result.rows[0];
    if (!row) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = await bcrypt.compare(password, String(row.password_hash));
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const id = String(row.id);
    const name = String(row.name);
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
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
