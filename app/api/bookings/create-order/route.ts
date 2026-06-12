import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { calculateTotals } from "@/lib/pricing";
import { priceForRange, rangesOverlap, isWithinHours } from "@/lib/slots";
import { BULK_PACKAGE } from "@/lib/credits";

export const runtime = "nodejs";

// ───────────────────────────────────────────────────────────────────────────
// TEMPORARY ₹1 TEST MODE — set back to false to RESTORE normal pricing.
// When true, every Razorpay order (slot bookings AND the bulk pass) is created
// for ₹1 so the full booking/credit flow can be exercised end-to-end for the
// cost of a single rupee. Signature verification, booking confirmation, credit
// granting, emails and dashboard updates all run exactly as in production.
// ───────────────────────────────────────────────────────────────────────────
const TEST_ONE_RUPEE = true;
const TEST_AMOUNT_PAISE = 100; // ₹1
const orderAmount = (paise: number) => (TEST_ONE_RUPEE ? TEST_AMOUNT_PAISE : paise);

type SlotInput = { date: string; time: string; court: number; durationMin?: number };
const dur = (s: SlotInput) => Math.max(30, Number(s.durationMin) || 60);
type AddonInput = { id: string; label: string; price: number; qty?: number };

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sport = String(body.sport ?? "pickleball");
    const slots: SlotInput[] = Array.isArray(body.slots) ? body.slots : [];
    const addons: AddonInput[] = Array.isArray(body.addons) ? body.addons : [];

    const keyIdEarly = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecretEarly = process.env.RAZORPAY_KEY_SECRET;

    // Bulk-hours package purchase: fixed-price order, no slots required.
    if (body.purchase === "bulk-12h") {
      if (!keyIdEarly || !keySecretEarly) {
        return NextResponse.json(
          { error: "Razorpay is not configured on the server (missing NEXT_PUBLIC_RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)." },
          { status: 500 },
        );
      }
      try {
        const rzp = new Razorpay({ key_id: keyIdEarly, key_secret: keySecretEarly });
        const order = await rzp.orders.create({
          amount: orderAmount(Math.round(BULK_PACKAGE.price * 100)),
          currency: "INR",
          receipt: uuid(),
          notes: { user_id: session.id, purchase: "bulk-12h" },
        });
        return NextResponse.json({ orderId: order.id, amount: order.amount, currency: "INR", keyId: keyIdEarly });
      } catch (rzpErr) {
        try {
          console.error(
            "[create-order bulk razorpay error]",
            JSON.stringify(rzpErr, Object.getOwnPropertyNames(rzpErr as object)),
          );
        } catch {
          console.error("[create-order bulk razorpay error]", rzpErr);
        }
        const statusCode = (rzpErr as { statusCode?: number })?.statusCode;
        const desc = (rzpErr as { error?: { description?: string } })?.error?.description;
        const rawMsg = (rzpErr as { message?: string })?.message;
        const reason = desc || rawMsg || "unknown error";
        const msg =
          statusCode === 401
            ? "Payment gateway rejected the keys. The RAZORPAY_KEY_SECRET / NEXT_PUBLIC_RAZORPAY_KEY_ID pair is wrong, missing, or mixes test+live."
            : `Could not start the payment (${reason}).`;
        return NextResponse.json({ error: msg, statusCode: statusCode ?? null }, { status: 502 });
      }
    }

    if (slots.length === 0) {
      return NextResponse.json({ error: "Select at least one slot." }, { status: 400 });
    }

    for (const s of slots) {
      if (!s.date || !s.time || ![1, 2, 3].includes(s.court)) {
        return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
      }
      if (!isWithinHours(s.time, dur(s))) {
        return NextResponse.json({ error: "That time is outside opening hours." }, { status: 400 });
      }
    }

    const dates = Array.from(new Set(slots.map((s) => s.date)));

    for (const d of dates) {
      let booked;
      try {
        booked = await turso.execute({
          sql: "SELECT slot_time, duration_min, court_number, notes FROM bookings WHERE slot_date = ? AND status = 'confirmed'",
          args: [d],
        });
      } catch (dbErr) {
        console.error("[create-order check db error]", dbErr);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
      }

      for (const s of slots) {
        if (s.date !== d) continue;
        const clash = booked.rows.some((row) => {
          const rowNotes = row.notes ? JSON.parse(String(row.notes)) : {};
          const rowSport = rowNotes.sport || "pickleball";
          const rowCourt = Number(row.court_number) || 1;

          // Resolve courts occupied by existing booking
          const rowCourts = rowSport === "cricket" ? [1, 2, 3] : [rowCourt];
          // Resolve courts requested by the new booking
          const requestedCourts = sport === "cricket" ? [1, 2, 3] : [s.court];

          const sharesCourt = requestedCourts.some((c) => rowCourts.includes(c));

          return (
            sharesCourt &&
            rangesOverlap(s.time, dur(s), String(row.slot_time), Number(row.duration_min) || 60)
          );
        });

        if (clash) {
          const displayCourt = sport === "cricket" ? "Cricket Turf" : `Court ${s.court}`;
          return NextResponse.json(
            { error: `${displayCourt} at ${s.time.slice(0, 5)} is no longer available.` },
            { status: 409 },
          );
        }
      }
    }

    const base = slots.reduce((sum, s) => sum + priceForRange(sport, s.date, s.time, dur(s)), 0);
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
      // Charging exactly ₹200 (or ₹1 in TEST_ONE_RUPEE mode) as booking advance
      const payAmount = TEST_ONE_RUPEE ? 100 : 200 * 100;

      order = await rzp.orders.create({
        amount: payAmount,
        currency: "INR",
        receipt: uuid(),
        notes: { user_id: session.id, slots: String(slots.length), sport },
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
