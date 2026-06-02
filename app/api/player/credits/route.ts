import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCreditBalance, BULK_PACKAGE, SLOT_MINUTES } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current player's prepaid credit balance + the package on offer. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const balanceMin = await getCreditBalance(session.id);
  return NextResponse.json({
    balanceMin,
    balanceHours: Math.round((balanceMin / 60) * 10) / 10,
    slotsRemaining: Math.floor(balanceMin / SLOT_MINUTES),
    package: BULK_PACKAGE,
  });
}
