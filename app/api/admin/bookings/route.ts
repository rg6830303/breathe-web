import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date");
  const userId = req.nextUrl.searchParams.get("user_id");
  const status = req.nextUrl.searchParams.get("status");

  const conditions: string[] = [];
  const args: (string | number)[] = [];
  if (date) {
    conditions.push("b.slot_date = ?");
    args.push(date);
  }
  if (userId) {
    conditions.push("b.user_id = ?");
    args.push(userId);
  }
  if (status) {
    conditions.push("b.status = ?");
    args.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await turso.execute({
    sql: `SELECT b.id, b.user_id, b.user_name, b.user_email, b.user_phone,
                 b.court_number, b.slot_date, b.slot_time, b.price,
                 b.total_amount, b.status, b.created_at,
                 b.razorpay_order_id, b.razorpay_payment_id
          FROM bookings b
          ${where}
          ORDER BY b.created_at DESC
          LIMIT 200`,
    args,
  });

  const bookings = result.rows.map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    user_name: String(row.user_name),
    user_email: String(row.user_email),
    user_phone: row.user_phone ? String(row.user_phone) : null,
    court_number: Number(row.court_number),
    slot_date: String(row.slot_date),
    slot_time: String(row.slot_time).slice(0, 5),
    price: Number(row.price),
    total_amount: Number(row.total_amount),
    status: String(row.status),
    created_at: String(row.created_at),
    razorpay_order_id: row.razorpay_order_id ? String(row.razorpay_order_id) : null,
    razorpay_payment_id: row.razorpay_payment_id ? String(row.razorpay_payment_id) : null,
  }));

  return NextResponse.json({ bookings });
}
