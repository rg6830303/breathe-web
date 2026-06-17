import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { turso } from "@/lib/turso";
import { calculateTotals } from "@/lib/pricing";
import { priceForRange, rangesOverlap, isWithinHours, isPastIST } from "@/lib/slots";
import { bookingRequestSchema, formatZodError } from "@/lib/validation";
import { BULK_PACKAGE } from "@/lib/credits";

export const runtime = "nodejs";

// ───────────────────────────────────────────────────────────────────────────
// TEMPORARY ₹1 TEST MODE — set back to false to RESTORE normal pricing.
// When true, every Razorpay order (slot bookings AND the bulk pass) is created
// for ₹1 so the full booking/credit flow can be exercised end-to-end for the
// cost of a single rupee. Signature verification, booking confirmation, credit
// granting, emails and dashboard updates all run exactly as in production.
// ───────────────────────────────────────────────────────────────────────────
const TEST_ONE_RUPEE = false;
const TEST_AMOUNT_PAISE = 100; // ₹1
const orderAmount = (paise: number) => (TEST_ONE_RUPEE ? TEST_AMOUNT_PAISE : paise);

type Sport = "pickleball" | "cricket" | "badminton";
type SlotInput = { date: string; time: string; court: number; durationMin?: number; sport?: Sport };
const slotSport = (s: SlotInput, fallback: Sport): Sport =>
  s.sport && ["pickleball", "cricket", "badminton"].includes(s.sport) ? s.sport : fallback;
const dur = (s: SlotInput) => Math.max(30, Number(s.durationMin) || 60);
type AddonInput = { id: string; label: string; price: number; qty?: number };

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit order creation (payment-gateway calls cost money / are abusable).
    const rl = await checkRateLimit(`create-order:${getClientIp(req)}`, 20, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const sport: "pickleball" | "cricket" | "badminton" = ["pickleball", "cricket", "badminton"].includes(
      String(body.sport),
    )
      ? (body.sport as "pickleball" | "cricket" | "badminton")
      : "pickleball";
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
          amount: Math.round(BULK_PACKAGE.price * 100),
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

    // Schema validation (type/length/range/enum) before any DB or payment work.
    const parsed = bookingRequestSchema.safeParse({ slots, addons });
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    for (const s of slots) {
      if (!isWithinHours(s.time, dur(s))) {
        return NextResponse.json({ error: "That time is outside opening hours." }, { status: 400 });
      }
      if (isPastIST(s.date, s.time)) {
        return NextResponse.json(
          { error: `The ${s.time} slot has already started — please pick an upcoming time.` },
          { status: 400 },
        );
      }
    }

    // Enforce sport constraints on slot courts — PER slot, so a mixed-sport cart
    // forces only its cricket/badminton lines onto Court 1.
    const normalizedSlots = slots.map((s) => {
      const sSport = slotSport(s, sport);
      const court = sSport === "cricket" || sSport === "badminton" ? 1 : s.court;
      return { ...s, court, sport: sSport };
    });

    const dates = Array.from(new Set(normalizedSlots.map((s) => s.date)));

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

      for (const s of normalizedSlots) {
        if (s.date !== d) continue;
        const clash = booked.rows.some((row) => {
          const rowNotes = row.notes ? JSON.parse(String(row.notes)) : {};
          const rowSport = rowNotes.sport || "pickleball";
          const rowCourt = Number(row.court_number) || 1;

          // Resolve courts occupied by existing booking
          const rowCourts = rowSport === "cricket" ? [1, 2, 3] : [rowCourt];
          // Resolve courts requested by the new booking (per its own sport)
          const reqSport = (s as SlotInput).sport ?? sport;
          const requestedCourts = reqSport === "cricket" ? [1, 2, 3] : [s.court];

          const sharesCourt = requestedCourts.some((c) => rowCourts.includes(c));

          return (
            sharesCourt &&
            rangesOverlap(s.time, dur(s), String(row.slot_time), Number(row.duration_min) || 60)
          );
        });

        if (clash) {
          const reqSport = (s as SlotInput).sport ?? sport;
          const displayCourt = reqSport === "cricket" ? "Cricket Turf" : `Court ${s.court}`;
          return NextResponse.json(
            { error: `${displayCourt} at ${s.time.slice(0, 5)} is no longer available.` },
            { status: 409 },
          );
        }
      }
    }

    const base = slots.reduce((sum, s) => sum + priceForRange(slotSport(s, sport), s.date, s.time, dur(s)), 0);
    const addonTotal = addons.reduce((sum, a) => sum + (Number(a.price) || 0) * (Number(a.qty) || 1), 0);
    const totals = calculateTotals(base, addonTotal);

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId) {
      return NextResponse.json({ error: "Razorpay is not configured." }, { status: 500 });
    }
    // Charging exactly ₹200 (or ₹1 in TEST_ONE_RUPEE mode) as booking advance.
    const payAmount = TEST_ONE_RUPEE ? 100 : 200 * 100;

    // Two modes, by whether the server SECRET is configured:
    //  • Secret present  → create a real Razorpay Order so the payment can be
    //    cryptographically verified server-side (the secure path).
    //  • Secret absent   → DIRECT checkout with just the public key id (the
    //    original single-key setup): Razorpay still collects the money, but
    //    there is no server-side order/signature. Returns no orderId.
    if (!keySecret) {
      return NextResponse.json({ amount: payAmount, currency: "INR", keyId, totals });
    }

    let order;
    try {
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
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
