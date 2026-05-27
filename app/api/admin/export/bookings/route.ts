import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { getAdminOverview } from "@/lib/admin-data";
import { hasSupabaseEnv } from "@/lib/supabase";

async function authorize(request: NextRequest) {
  const key = request.headers.get("x-integration-key") ?? request.nextUrl.searchParams.get("key");
  const userId = request.nextUrl.searchParams.get("userId");
  if (process.env.SHEETS_INTEGRATION_KEY && key === process.env.SHEETS_INTEGRATION_KEY) return;
  if (userId && hasSupabaseEnv()) return assertAdmin(userId);
  if (!hasSupabaseEnv()) return;
  throw new Error("Admin authorization required.");
}

export async function GET(request: NextRequest) {
  try {
    await authorize(request);
    const from = request.nextUrl.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = request.nextUrl.searchParams.get("to") ?? from;
    const overview = await getAdminOverview(from, to);
    const headers = [
      "id",
      "user_id",
      "player_name",
      "player_email",
      "court_id",
      "start_time",
      "end_time",
      "status",
      "total_amount",
      "base_amount",
      "tax_amount",
      "operating_cost",
      "gross_profit",
    ];
    const csv = toCsv(headers, overview.ledger);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="breathe-bookings-${from}-to-${to}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed." }, { status: 401 });
  }
}
