import { NextResponse } from "next/server";
import Razorpay from "razorpay";
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
  const slots: SlotInput[] = Array.isArray(body.slots) ? body.slots : [];
  const addons: AddonInput[] = Array.isArray(body.addons) ? body.addons : [];

  if (slots.length === 0) {
    return NextResponse.json({ error: "Select at least one slot." }, { status: 400 });
  }

  for (const s of slots) {
    if (!s.date || !s.time || ![1, 2, 3].includes(s.court)) {
      return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
    }
  }

  const dates = Array.from(new Set(slots.map((s) => s.date)));
  for (const d of dates) {
    const [booked, blocked] = await Promise.all([
      turso.execute({
        sql: "SELECT court_number, slot_time FROM bookings WHERE slot_date = ? AND status = 'confirmed'",
        args: [d],
      }),
      turso.execute({
        sql: "SELECT court_number, slot_time FROM blocked_slots WHERE slot_date = ?",
        args: [d],
      }),
    ]);
    const taken = new Set<string>();
    booked.rows.forEach((r) =>
      taken.add(`${Number(r.court_number)}@${String(r.slot_time).slice(0, 5)}`),
    );
    blocked.rows.forEach((r) =>
      taken.add(`${Number(r.court_number)}@${String(r.slot_time).slice(0, 5)}`),
    );
    for (const s of slots) {
      if (s.date !== d) continue;
      if (taken.has(`${s.court}@${s.time.slice(0, 5)}`)) {
        return NextResponse.json(
          { error: `Slot Court ${s.court} at ${s.time} on ${s.date} is no longer available.` },
          { status: 409 },
        );
      }
    }
  }

  const base = slots.reduce((sum, s) => sum + getSlotPrice(s.time), 0);
  const addonTotal = addons.reduce((sum, a) => sum + (Number(a.price) || 0) * (Number(a.qty) || 1), 0);
  const totals = calculateTotals(base, addonTotal);

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 500 });
  }

  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const order = await rzp.orders.create({
    amount: Math.round(totals.total * 100),
    currency: "INR",
    receipt: uuid(),
    notes: { user_id: session.id, slots: String(slots.length) },
  });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: "INR",
    keyId,
    totals,
  });
}
