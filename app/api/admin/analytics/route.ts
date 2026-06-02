import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await ensureSchema();
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from"); // YYYY-MM-DD
    const to = url.searchParams.get("to");     // YYYY-MM-DD
    const compare = url.searchParams.get("compare") === "true";

    if (!from || !to) {
      return NextResponse.json({ error: "Missing date range parameters." }, { status: 400 });
    }

    const current = await aggregate(from, to);
    let previous = null;
    
    if (compare) {
      const { prevFrom, prevTo } = getPreviousPeriod(from, to);
      previous = await aggregate(prevFrom, prevTo);
    }

    return NextResponse.json({ current, previous });
  } catch (err: unknown) {
    console.error("[analytics api error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

async function aggregate(from: string, to: string) {
  // 1. KPIs: Revenue and Bookings
  const kpis = await turso.execute({
    sql: `SELECT
            COALESCE(SUM(amount_paid), 0) as revenue,
            COUNT(*) as bookings
          FROM bookings
          WHERE slot_date >= ? AND slot_date <= ? AND status = 'confirmed'`,
    args: [from, to],
  });

  // 2. KPIs: New customers whose first booking falls in the period
  const newCustResult = await turso.execute({
    sql: `SELECT COUNT(DISTINCT b.user_id) as customers
          FROM bookings b
          WHERE b.user_id IS NOT NULL 
            AND b.status = 'confirmed'
            AND b.slot_date >= ? AND b.slot_date <= ?
            AND (
              SELECT MIN(b2.slot_date) 
              FROM bookings b2 
              WHERE b2.user_id = b.user_id 
                AND b2.status = 'confirmed'
            ) >= ?`,
    args: [from, to, from],
  });

  // 3. Hourly distribution: HH:MM breakdown
  const byHour = await turso.execute({
    sql: `SELECT CAST(SUBSTR(slot_time, 1, 2) AS INTEGER) as hour, COUNT(*) as count
          FROM bookings
          WHERE slot_date >= ? AND slot_date <= ? AND status = 'confirmed'
          GROUP BY hour ORDER BY hour`,
    args: [from, to],
  });

  // 4. Day of week distribution (0=Sunday, 6=Saturday in SQLite strftime)
  // strftime('%w', slot_date) returns '0' to '6'
  const byDow = await turso.execute({
    sql: `SELECT CAST(strftime('%w', slot_date) AS INTEGER) as dow, COUNT(*) as count
          FROM bookings
          WHERE slot_date >= ? AND slot_date <= ? AND status = 'confirmed'
          GROUP BY dow ORDER BY dow`,
    args: [from, to],
  });

  // 5. Daily Time Series
  const series = await turso.execute({
    sql: `SELECT slot_date as date,
                 COALESCE(SUM(amount_paid), 0) as revenue,
                 COUNT(*) as bookings
          FROM bookings
          WHERE slot_date >= ? AND slot_date <= ? AND status = 'confirmed'
          GROUP BY slot_date ORDER BY slot_date`,
    args: [from, to],
  });

  // 6. Top 10 Slots
  const topSlots = await turso.execute({
    sql: `SELECT slot_time as time, COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as revenue
          FROM bookings
          WHERE slot_date >= ? AND slot_date <= ? AND status = 'confirmed'
          GROUP BY slot_time ORDER BY count DESC LIMIT 10`,
    args: [from, to],
  });

  // 7. Top 10 Customers
  const topCustomers = await turso.execute({
    sql: `SELECT u.id, u.full_name as name,
                 COUNT(b.id) as bookings,
                 COALESCE(SUM(b.amount_paid), 0) as spent,
                 MAX(b.slot_date) as last_booking
          FROM bookings b
          JOIN users u ON u.id = b.user_id
          WHERE b.slot_date >= ? AND b.slot_date <= ? AND b.status = 'confirmed'
          GROUP BY u.id ORDER BY spent DESC LIMIT 10`,
    args: [from, to],
  });

  const k = kpis.rows[0] as unknown as { revenue: number; bookings: number };
  const revenue = Number(k.revenue);
  const bookings = Number(k.bookings);
  const customers = Number(newCustResult.rows[0]?.customers ?? 0);
  const avgValue = bookings > 0 ? Math.round(revenue / bookings) : 0;

  // Real business expenses in the period → net profit = revenue − expenses.
  let expenses = 0;
  try {
    const ex = await turso.execute({
      sql: "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= ? AND expense_date <= ?",
      args: [from, to],
    });
    expenses = Number(ex.rows[0]?.total ?? 0);
  } catch (e) {
    console.error("[analytics expenses error]", e);
  }
  const netProfit = revenue - expenses;

  const days = daysBetween(from, to);
  const totalCourts = 3;
  const slotsPerDay = 17; // 06:00 to 23:00 hourly slots
  const occupancy = (bookings / (totalCourts * slotsPerDay * days)) * 100;

  return {
    revenue,
    expenses,
    netProfit,
    bookings,
    customers,
    avgValue,
    occupancy: Math.round(occupancy * 10) / 10,
    byHour: byHour.rows.map(r => ({ hour: Number(r.hour), count: Number(r.count) })),
    byDow: byDow.rows.map(r => ({ dow: Number(r.dow), count: Number(r.count) })),
    series: series.rows.map(r => ({ date: String(r.date), revenue: Number(r.revenue), bookings: Number(r.bookings) })),
    topSlots: topSlots.rows.map(r => ({ time: String(r.time).slice(0, 5), count: Number(r.count), revenue: Number(r.revenue) })),
    topCustomers: topCustomers.rows.map(r => ({
      id: String(r.id),
      name: String(r.name),
      bookings: Number(r.bookings),
      spent: Number(r.spent),
      last_booking: String(r.last_booking)
    }))
  };
}

function getPreviousPeriod(from: string, to: string) {
  const d1 = new Date(from);
  const d2 = new Date(to);
  const days = Math.ceil((d2.getTime() - d1.getTime()) / 86400000) + 1;
  
  const prevTo = new Date(d1);
  prevTo.setDate(prevTo.getDate() - 1);
  
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days + 1);
  
  return { 
    prevFrom: prevFrom.toISOString().slice(0, 10), 
    prevTo: prevTo.toISOString().slice(0, 10) 
  };
}

function daysBetween(from: string, to: string) {
  return Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
}
