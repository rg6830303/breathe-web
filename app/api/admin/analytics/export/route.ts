import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return new Response("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to) {
      return new Response("Missing date range parameters.", { status: 400 });
    }

    let result;
    try {
      result = await turso.execute({
        sql: `SELECT b.id, b.slot_date, b.slot_time, b.duration_min, 
                     COALESCE(u.full_name, b.guest_name, 'Guest') as customer_name,
                     COALESCE(u.phone, b.guest_phone, '—') as customer_phone,
                     COALESCE(u.email, b.guest_email, '—') as customer_email,
                     b.amount_paid, b.status, b.source, b.notes, b.created_at
              FROM bookings b
              LEFT JOIN users u ON u.id = b.user_id
              WHERE b.slot_date >= ? AND b.slot_date <= ?
              ORDER BY b.slot_date DESC, b.slot_time DESC`,
        args: [from, to],
      });
    } catch (dbErr) {
      console.error("[export csv db error]", dbErr);
      return new Response("Database query failed", { status: 500 });
    }

    // Compile rows into standard CSV text
    const headers = [
      "Booking ID", "Slot Date", "Slot Time", "Duration (Min)", 
      "Customer Name", "Customer Phone", "Customer Email", 
      "Amount Paid", "Status", "Source", "Notes", "Created At"
    ];
    
    let csvContent = headers.join(",") + "\n";
    
    for (const r of result.rows) {
      const notesClean = r.notes ? String(r.notes).replace(/"/g, '""') : "";
      const row = [
        `"${r.id}"`,
        `"${r.slot_date}"`,
        `"${r.slot_time}"`,
        r.duration_min,
        `"${String(r.customer_name).replace(/"/g, '""')}"`,
        `"${String(r.customer_phone).replace(/"/g, '""')}"`,
        `"${String(r.customer_email).replace(/"/g, '""')}"`,
        r.amount_paid,
        `"${r.status}"`,
        `"${r.source}"`,
        `"${notesClean}"`,
        `"${new Date(Number(r.created_at)).toLocaleString("en-IN")}"`
      ];
      csvContent += row.join(",") + "\n";
    }

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="breathe_bookings_${from}_to_${to}.csv"`,
      },
    });
  } catch (err: unknown) {
    console.error("[analytics export error]", err);
    return new Response("Something went wrong", { status: 500 });
  }
}
