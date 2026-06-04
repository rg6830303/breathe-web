import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { getSlotPrice, calculateTotals } from "@/lib/pricing";
import { BULK_PACKAGE } from "@/lib/credits";

export const runtime = "nodejs";

type SlotInput = { date: string; time: string; court: number };
type AddonInput = { id: string; label: string; price: number; qty?: number };

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const slots: SlotInput[] = Array.isArray(body.slots) ? body.slots : [];
    const addons: AddonInput[] = Array.isArray(body.addons) ? body.addons : [];

    const keyIdEarly = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecretEarly = process.env.RAZORPAY_KEY_SECRET;

    // Bulk-hours package purchase: fixed-price order, no slots required.
    if (body.purchase === "bulk-12h") {
      if (!keyIdEarly || !keySecretEarly) {
        return NextResponse.json({ error: "Razorpay is not configured." }, { status: 500 });
      }
      try {
        const rzp = new Razorpay({ key_id: keyIdEarly, key_secret: keySecretEarly });
        const order = await rzp.orders.create({
          amount: Math.round(BULK_PACKAGE.price * 100),
          currency: "INR",
          receipt: uuid(),
          notes: { user_id: session.id, purchase: "bulk-12h" },
        });
        return NextResponse.json({ orderId: order.id, amount: order.amount, currency: "INR", keyId: keyIdEarly });
      } catch (rzpErr) {
        console.error("[create-order bulk razorpay error]", rzpErr);
        // Surface a clear cause. A 401 from Razorpay almost always means the
        // RAZORPAY_KEY_SECRET / NEXT_PUBLIC_RAZORPAY_KEY_ID pair on the server
        // is wrong, missing, or mismatched (test key id with live secret etc.).
        const statusCode = (rzpErr as { statusCode?: number })?.statusCode;
        const desc = (rzpErr as { error?: { description?: string } })?.error?.description;
        const rawMsg = (rzpErr as { message?: string })?.message;
        const msg =
          statusCode === 401
            ? "Payment gateway rejected the keys. Check RAZORPAY_KEY_SECRET and NEXT_PUBLIC_RAZORPAY_KEY_ID in your environment variables."
            : desc || rawMsg || "Could not start the payment. Please try again.";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }

    if (slots.length === 0) {
      return NextResponse.json({ error: "Select at least one slot." }, { status: 400 });
    }

    for (const s of slots) {
      if (!s.date || !s.time || ![1, 2, 3].includes(s.court)) {
        return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
      }
    }

    const dates = Array.from(new Set(slots.map((s) => s.date)));
    
    // Check database to ensure slots are not overbooked
    for (const d of dates) {
      let booked;
      try {
        booked = await turso.execute({
          sql: "SELECT slot_time FROM bookings WHERE slot_date = ? AND status = 'confirmed'",
          args: [d],
        });
      } catch (dbErr) {
        console.error("[create-order check db error]", dbErr);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
      }

      // Count booked slots for each time
      const bookingsCount: Record<string, number> = {};
      for (const row of booked.rows) {
        const time = String(row.slot_time).slice(0, 5);
        bookingsCount[time] = (bookingsCount[time] ?? 0) + 1;
      }

      // Check capacity for the requested slots on this day
      for (const s of slots) {
        if (s.date !== d) continue;
        const timeKey = s.time.slice(0, 5);
        const bookedNum = bookingsCount[timeKey] ?? 0;
        
        // Max capacity is 3 courts (total_courts in venue_config)
        const totalCourts = 3; 
        if (bookedNum >= totalCourts) {
          return NextResponse.json(
            { error: `Slot at ${s.time} on ${s.date} is no longer available.` },
            { status: 409 }
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

    let order;
    try {
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
      order = await rzp.orders.create({
        amount: Math.round(totals.total * 100),
        currency: "INR",
        receipt: uuid(),
        notes: { user_id: session.id, slots: String(slots.length) },
      });
    } catch (rzpErr) {
      console.error("[create-order razorpay error]", rzpErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: "INR",
      keyId,
      totals,
    });
  } catch (err: unknown) {
    console.error("[create-order error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
