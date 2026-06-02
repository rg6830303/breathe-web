import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db/ensure";
import { adjustCredit, getCreditBalance, BULK_PACKAGE } from "@/lib/credits";

export const runtime = "nodejs";

const schema = z.object({
  user_id: z.string().min(1),
  // Either grant the standard package, or a custom number of hours (+/-).
  hours: z.number().optional(),
  grantPackage: z.boolean().optional(),
  reason: z.string().trim().max(200).optional(),
});

/** Admin grants prepaid hours to a user (offline package sale / comp). */
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  await ensureSchema().catch(() => {});

  const minutes = parsed.data.grantPackage
    ? BULK_PACKAGE.minutes
    : Math.round((parsed.data.hours ?? 0) * 60);
  if (!minutes) return NextResponse.json({ error: "Specify hours or grantPackage." }, { status: 400 });

  const reason = parsed.data.reason || (parsed.data.grantPackage ? "Admin granted 12h bulk pass" : "Admin credit adjustment");
  const balance = await adjustCredit(parsed.data.user_id, minutes, reason);
  return NextResponse.json({ ok: true, balanceMin: balance });
}

/** Read a user's balance (for the admin customer view). */
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  const balanceMin = await getCreditBalance(userId);
  return NextResponse.json({ balanceMin, balanceHours: Math.round((balanceMin / 60) * 10) / 10 });
}
