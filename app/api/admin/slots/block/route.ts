import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const date = String(body.slot_date ?? "");
    const time = String(body.slot_time ?? "").slice(0, 5);
    const reason = body.reason ? String(body.reason) : "Admin block";

    if (!date || !time) {
      return NextResponse.json({ error: "Invalid block payload." }, { status: 400 });
    }

    try {
      await turso.execute({
        sql: `INSERT INTO bookings (
          id, user_id, slot_date, slot_time, duration_min, 
          guest_name, amount_paid, status, source, notes, created_at
        ) VALUES (?, NULL, ?, ?, 60, 'Admin Block', 0, 'confirmed', 'walk_in', ?, ?)`,
        args: [uuid(), date, time, reason, Date.now()],
      });
    } catch (dbErr) {
      console.error("[admin block db error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[admin block error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
