import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const court = Number(body.court_number);
  const date = String(body.slot_date ?? "");
  const time = String(body.slot_time ?? "").slice(0, 5);
  const reason = body.reason ? String(body.reason) : "Admin block";

  if (![1, 2, 3].includes(court) || !date || !time) {
    return NextResponse.json({ error: "Invalid block payload." }, { status: 400 });
  }

  await turso.execute({
    sql: "INSERT INTO blocked_slots (id, court_number, slot_date, slot_time, reason) VALUES (?, ?, ?, ?, ?)",
    args: [uuid(), court, date, time, reason],
  });

  return NextResponse.json({ ok: true });
}
