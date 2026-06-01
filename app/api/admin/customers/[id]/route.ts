import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    await ensureSchema();
    const [userRes, bookingsRes, statsRes] = await Promise.all([
      turso.execute({
        sql: "SELECT id, full_name, email, phone, created_at FROM users WHERE id = ? LIMIT 1",
        args: [id],
      }),
      turso.execute({
        sql: `SELECT id, slot_date, slot_time, court_number, duration_min,
                     subtotal, gst, total, amount_paid, status, created_at
              FROM bookings WHERE user_id = ?
              ORDER BY slot_date DESC, slot_time DESC LIMIT 500`,
        args: [id],
      }),
      turso.execute({
        sql: `SELECT
                COUNT(CASE WHEN status='confirmed' THEN 1 END) as sessions,
                COALESCE(SUM(CASE WHEN status='confirmed' THEN duration_min ELSE 0 END), 0) as minutes,
                COALESCE(SUM(CASE WHEN status='confirmed' THEN amount_paid ELSE 0 END), 0) as spent
              FROM bookings WHERE user_id = ?`,
        args: [id],
      }),
    ]);

    const u = userRes.rows[0];
    if (!u) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

    const s = statsRes.rows[0];

    return NextResponse.json({
      customer: {
        id: String(u.id),
        full_name: String(u.full_name),
        email: String(u.email),
        phone: u.phone ? String(u.phone) : null,
        created_at: Number(u.created_at),
      },
      stats: {
        sessions: Number(s?.sessions ?? 0),
        hours: Math.round((Number(s?.minutes ?? 0) / 60) * 10) / 10,
        spent: Number(s?.spent ?? 0),
      },
      bookings: bookingsRes.rows.map((row) => ({
        id: String(row.id),
        slot_date: String(row.slot_date),
        slot_time: String(row.slot_time).slice(0, 5),
        court_number: Number(row.court_number) || 1,
        duration_min: Number(row.duration_min) || 60,
        subtotal: Number(row.subtotal) || 0,
        gst: Number(row.gst) || 0,
        total: Number(row.total) || Number(row.amount_paid) || 0,
        status: String(row.status),
        created_at: String(row.created_at),
      })),
    });
  } catch (err) {
    console.error("[admin customer detail error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
