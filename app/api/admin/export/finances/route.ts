import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/admin-data";
import { toCsv } from "@/lib/csv";
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
    const rows = [
      { section: "summary", label: "bookings", amount: overview.summary.bookings },
      { section: "summary", label: "court_revenue", amount: overview.summary.courtRevenue },
      { section: "summary", label: "tax_collected", amount: overview.summary.taxCollected },
      { section: "summary", label: "operating_cost", amount: overview.summary.operatingCost },
      { section: "summary", label: "gross_profit", amount: overview.summary.grossProfit },
      { section: "summary", label: "adjustments", amount: overview.summary.adjustments },
      { section: "summary", label: "net_profit", amount: overview.summary.netProfit },
      ...overview.financeEntries.map((entry) => ({
        section: "ledger",
        label: entry.label,
        amount: entry.amount,
        entry_date: entry.entry_date,
        category: entry.category,
        notes: entry.notes,
      })),
    ];
    const csv = toCsv(["section", "entry_date", "category", "label", "amount", "notes"], rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="breathe-finances-${from}-to-${to}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed." }, { status: 401 });
  }
}
