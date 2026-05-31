import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
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

    let result;
    try {
      result = await turso.execute({
        sql: `SELECT b.id, b.user_id,
                     COALESCE(u.full_name, b.guest_name, 'Guest') as user_name,
                     COALESCE(u.email, b.guest_email, '—') as user_email,
                     COALESCE(u.phone, b.guest_phone, '—') as user_phone,
                     b.court_number,
                     b.slot_date, b.slot_time, b.duration_min,
                     b.subtotal, b.gst, b.total, b.amount_paid,
                     b.status, b.source, b.notes, b.created_at
              FROM bookings b
              LEFT JOIN users u ON u.id = b.user_id
              ${where}
              ORDER BY b.created_at DESC
              LIMIT 500`,
        args,
      });
    } catch (dbErr) {
      console.error("[admin bookings db error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    const bookings = result.rows.map((row) => ({
      id: String(row.id),
      user_id: row.user_id ? String(row.user_id) : "",
      user_name: String(row.user_name),
      user_email: String(row.user_email),
      user_phone: row.user_phone ? String(row.user_phone) : null,
      court_number: Number(row.court_number) || 1,
      slot_date: String(row.slot_date),
      slot_time: String(row.slot_time).slice(0, 5),
      duration_min: Number(row.duration_min) || 60,
      subtotal: Number(row.subtotal) || 0,
      gst: Number(row.gst) || 0,
      total: Number(row.total) || Number(row.amount_paid) || 0,
      price: Number(row.subtotal) || 0,
      total_amount: Number(row.amount_paid) || Number(row.total) || 0,
      status: String(row.status),
      source: String(row.source ?? "online"),
      notes: row.notes ? String(row.notes) : null,
      created_at: String(row.created_at),
    }));

    return NextResponse.json({ bookings });
  } catch (err: unknown) {
    console.error("[admin bookings error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
