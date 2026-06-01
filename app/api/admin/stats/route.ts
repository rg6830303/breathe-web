import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function weekStartIST(): string {
  const todayStr = todayIST();
  const d = new Date(`${todayStr}T00:00:00+05:30`);
  const dow = d.getDay();
  const diff = (dow + 6) % 7; // Monday as start
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    await ensureSchema();
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = todayIST();
    const weekStart = weekStartIST();

    let totalUsers, totalBookings, confirmedAndRevenue, todayBookings, weekRevenue, weekly;
    
    try {
      [totalUsers, totalBookings, confirmedAndRevenue, todayBookings, weekRevenue, weekly] = await Promise.all([
        turso.execute({ sql: "SELECT COUNT(*) AS c FROM users", args: [] }),
        turso.execute({ sql: "SELECT COUNT(*) AS c FROM bookings", args: [] }),
        turso.execute({
          sql: "SELECT COUNT(*) AS c, COALESCE(SUM(amount_paid), 0) AS r FROM bookings WHERE status = 'confirmed'",
          args: [],
        }),
        turso.execute({
          sql: "SELECT COUNT(*) AS c FROM bookings WHERE slot_date = ? AND status = 'confirmed'",
          args: [today],
        }),
        turso.execute({
          sql: "SELECT COALESCE(SUM(amount_paid), 0) AS r FROM bookings WHERE slot_date >= ? AND status = 'confirmed'",
          args: [weekStart],
        }),
        turso.execute({
          sql: `SELECT slot_date AS d, COUNT(*) AS c, COALESCE(SUM(amount_paid), 0) AS r
                FROM bookings
                WHERE slot_date >= ? AND status = 'confirmed'
                GROUP BY slot_date ORDER BY slot_date`,
          args: [weekStart],
        }),
      ]);
    } catch (dbErr) {
      console.error("[admin stats db error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      total_users: Number(totalUsers.rows[0]?.c ?? 0),
      total_bookings: Number(totalBookings.rows[0]?.c ?? 0),
      confirmed_bookings: Number(confirmedAndRevenue.rows[0]?.c ?? 0),
      total_revenue: Number(confirmedAndRevenue.rows[0]?.r ?? 0),
      today_bookings: Number(todayBookings.rows[0]?.c ?? 0),
      this_week_revenue: Number(weekRevenue.rows[0]?.r ?? 0),
      weekly: weekly.rows.map((r) => ({
        date: String(r.d),
        bookings: Number(r.c),
        revenue: Number(r.r),
      })),
    });
  } catch (err: unknown) {
    console.error("[admin stats error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
