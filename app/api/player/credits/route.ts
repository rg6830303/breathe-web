import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCreditBalance, BULK_PACKAGE, SLOT_MINUTES } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current player's prepaid credit balance + the package on offer. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const balanceMin = await getCreditBalance(session.id);
    return NextResponse.json({
      balanceMin,
      balanceHours: Math.round((balanceMin / 60) * 10) / 10,
      slotsRemaining: Math.floor(balanceMin / SLOT_MINUTES),
      package: BULK_PACKAGE,
    });
  } catch (err) {
    console.error("[player credits error]", err);
    // Degrade gracefully — a credit-balance hiccup must never 500 the booking
    // page. Report a zero balance with the package still on offer.
    return NextResponse.json({ balanceMin: 0, balanceHours: 0, slotsRemaining: 0, package: BULK_PACKAGE });
  }
}
