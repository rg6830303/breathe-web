import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getAdminSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ask Razorpay what a payment actually was — `?payment_id=pay_…`.
 *
 * The entries table shows the amount the gateway captured, but not what the
 * money was FOR. When a figure looks wrong (a ₹200 payment sitting against a
 * ₹3,000 captain entry) this returns the gateway's own record — amount, method,
 * who paid, when, the description, and the notes that say which event it
 * belonged to — so the row can be judged on Razorpay's word rather than on
 * what our database happens to claim.
 *
 * Read-only, admin-only. Nothing here changes a payment or a registration.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const paymentId = (req.nextUrl.searchParams.get("payment_id") ?? "").trim();
    if (!paymentId) return NextResponse.json({ error: "A payment id is required." }, { status: 400 });

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay is not configured with a key secret." }, { status: 400 });
    }

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    let p: Record<string, unknown>;
    try {
      p = (await rzp.payments.fetch(paymentId)) as unknown as Record<string, unknown>;
    } catch (rzpErr) {
      console.error("[inspect payment error]", rzpErr);
      return NextResponse.json({ error: "Razorpay does not have that payment." }, { status: 404 });
    }

    // The order carries the notes our checkout wrote (which event, which
    // category) and the receipt, when the payment itself has none.
    let order: Record<string, unknown> | null = null;
    if (p.order_id) {
      try {
        order = (await rzp.orders.fetch(String(p.order_id))) as unknown as Record<string, unknown>;
      } catch {
        order = null;
      }
    }

    const notes = {
      ...(((order?.notes ?? {}) as Record<string, string>) || {}),
      ...(((p.notes ?? {}) as Record<string, string>) || {}),
    };

    return NextResponse.json(
      {
        payment_id: String(p.id ?? paymentId),
        amount: Math.round(Number(p.amount ?? 0) / 100),
        status: String(p.status ?? ""),
        method: p.method ? String(p.method) : null,
        email: p.email ? String(p.email) : null,
        contact: p.contact ? String(p.contact) : null,
        description: p.description ? String(p.description) : null,
        created_at: Number(p.created_at ?? 0) * 1000,
        order_id: p.order_id ? String(p.order_id) : null,
        order_receipt: order?.receipt ? String(order.receipt) : null,
        order_amount: order ? Math.round(Number(order.amount ?? 0) / 100) : null,
        // "kind" tells you whether our own checkout created this at all.
        notes,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[inspect error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
