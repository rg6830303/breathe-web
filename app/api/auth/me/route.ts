import { NextResponse } from "next/server";
import { getSession, getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (admin) {
      return NextResponse.json({
        user: { id: admin.id, email: admin.email, name: "Club Admin", role: "admin" },
      });
    }

    const session = await getSession();
    if (!session) return NextResponse.json({ user: null }, { status: 401 });

    // The signed session cookie is the source of truth for "is this person
    // logged in". We enrich it with the DB profile when available, but a
    // missing/erroring row must NOT log the user out — otherwise an
    // uninitialized or out-of-sync DB makes the whole portal look logged-out.
    try {
      const result = await turso.execute({
        sql: "SELECT id, full_name as name, email, phone, created_at FROM users WHERE id = ? LIMIT 1",
        args: [session.id],
      });
      const row = result.rows[0];
      if (row) {
        return NextResponse.json({
          user: {
            id: String(row.id),
            name: String(row.name),
            email: String(row.email),
            phone: row.phone ? String(row.phone) : null,
            created_at: String(row.created_at),
            role: "user",
          },
        });
      }
    } catch (dbErr) {
      console.error("[me route db error]", dbErr);
    }

    // Fallback: trust the signed session so the user stays logged in.
    return NextResponse.json({
      user: { id: session.id, email: session.email, name: session.name, role: "user" },
    });
  } catch (err) {
    console.error("[me route error]", err);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
