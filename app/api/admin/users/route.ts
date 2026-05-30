import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await turso.execute({
    sql: `SELECT u.id, u.name, u.email, u.phone, u.created_at,
                 COUNT(b.id) AS booking_count,
                 COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END), 0) AS total_spent
          FROM users u
          LEFT JOIN bookings b ON b.user_id = u.id
          GROUP BY u.id
          ORDER BY u.created_at DESC`,
    args: [],
  });

  const users = result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    created_at: String(row.created_at),
    booking_count: Number(row.booking_count),
    total_spent: Number(row.total_spent),
  }));

  return NextResponse.json({ users });
}
