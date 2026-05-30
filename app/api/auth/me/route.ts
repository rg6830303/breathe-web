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

    try {
      const result = await turso.execute({
        sql: "SELECT id, full_name as name, email, phone, created_at FROM users WHERE id = ? LIMIT 1",
        args: [session.id],
      });
      const row = result.rows[0];
      if (!row) return NextResponse.json({ user: null }, { status: 401 });
      
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
    } catch (dbErr) {
      console.error("[me route db error]", dbErr);
      // Fallback to session details if db query fails to prevent absolute app blockage
      return NextResponse.json({
        user: { id: session.id, email: session.email, name: session.name, role: "user" },
      });
    }
  } catch (err) {
    console.error("[me route error]", err);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
