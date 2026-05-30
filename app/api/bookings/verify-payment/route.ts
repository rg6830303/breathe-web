import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { getSlotPrice, calculateTotals } from "@/lib/pricing";

export const runtime = "nodejs";

type SlotInput = { date: string; time: string; court: number };
type AddonInput = { id: string; label: string; price: number; qty?: number };

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orderId = String(body.orderId ?? "");
  const paymentId = String(body.paymentId ?? "");
  const signature = String(body.signature ?? "");
  const slots: SlotInput[] = Array.isArray(body.slots) ? body.slots : [];
  const addons: AddonInput[] = Array.isArray(body.addons) ? body.addons : [];

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ error: "Razorpay not configured." }, { status: 500 });

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid payment signature." }, { status: 401 });
  }

  const userRow = await turso.execute({
    sql: "SELECT name, email, phone FROM users WHERE id = ? LIMIT 1",
    args: [session.id],
  });
  const user = userRow.rows[0];
  const userName = user ? String(user.name) : session.name;
  const userEmail = user ? String(user.email) : session.email;
  const userPhone = user && user.phone ? String(user.phone) : null;

  const addonsJson = JSON.stringify(addons);
  const addonTotal = addons.reduce((sum, a) => sum + (Number(a.price) || 0) * (Number(a.qty) || 1), 0);

  const bookingIds: string[] = [];
  for (const s of slots) {
    const price = getSlotPrice(s.time);
    const totals = calculateTotals(price, addonTotal / Math.max(slots.length, 1));
    const id = uuid();
    bookingIds.push(id);
    await turso.execute({
      sql: `INSERT INTO bookings (
        id, user_id, user_name, user_email, user_phone,
        court_number, slot_date, slot_time, duration_minutes,
        price, addons, subtotal, gst, total_amount, status,
        razorpay_order_id, razorpay_payment_id, razorpay_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)`,
      args: [
        id,
        session.id,
        userName,
        userEmail,
        userPhone,
        s.court,
        s.date,
        s.time,
        price,
        addonsJson,
        totals.subtotal,
        totals.taxes,
        totals.total,
        orderId,
        paymentId,
        signature,
      ],
    });
  }

  return NextResponse.json({ ok: true, bookingIds });
}
