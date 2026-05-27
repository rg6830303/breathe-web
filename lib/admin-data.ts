import { fallbackPricingRules } from "@/lib/pricing";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";
import type { BookingLedgerRow, FinanceEntry, PricingRule } from "@/lib/types";

const today = new Date().toISOString().slice(0, 10);

export const fallbackLedger: BookingLedgerRow[] = [
  {
    id: 101,
    user_id: "demo-player",
    court_id: 1,
    start_time: `${today}T18:00:00.000Z`,
    end_time: `${today}T18:30:00.000Z`,
    total_amount: 1062,
    status: "confirmed",
    player_name: "Dinker Pro",
    player_email: "player@breathepb.example",
    base_amount: 900,
    tax_amount: 162,
    operating_cost: 180,
    gross_profit: 720,
  },
  {
    id: 102,
    user_id: "demo-player-2",
    court_id: 2,
    start_time: `${today}T16:00:00.000Z`,
    end_time: `${today}T16:30:00.000Z`,
    total_amount: 885,
    status: "confirmed",
    player_name: "Rally Captain",
    player_email: "captain@breathepb.example",
    base_amount: 750,
    tax_amount: 135,
    operating_cost: 150,
    gross_profit: 600,
  },
];

export const fallbackFinanceEntries: FinanceEntry[] = [
  { id: 1, entry_date: today, category: "expense", label: "Court staff", amount: 1200, notes: "Daily shift" },
  { id: 2, entry_date: today, category: "expense", label: "Utilities allocation", amount: 650, notes: "Lights and cooling" },
  { id: 3, entry_date: today, category: "adjustment", label: "Paddle rentals", amount: 420, notes: "Counter sales" },
];

function mapLedger(row: Record<string, any>): BookingLedgerRow {
  const total = Number(row.total_amount ?? 0);
  const base = Math.round((total / 1.18) * 100) / 100;
  const tax = Math.round((total - base) * 100) / 100;
  const operatingCost = Math.round(base * 0.2 * 100) / 100;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    user_id: row.user_id,
    court_id: row.court_id,
    start_time: row.start_time,
    end_time: row.end_time,
    total_amount: total,
    status: row.status,
    player_name: profile?.full_name ?? row.player_name ?? "",
    player_email: profile?.email ?? row.player_email ?? "",
    base_amount: base,
    tax_amount: tax,
    operating_cost: operatingCost,
    gross_profit: Math.round((base - operatingCost) * 100) / 100,
  };
}

export async function getAdminOverview(from = today, to = today) {
  let ledger = fallbackLedger;
  let pricingRules: PricingRule[] = fallbackPricingRules;
  let financeEntries = fallbackFinanceEntries;

  if (hasSupabaseEnv()) {
    const supabase = getSupabaseService();
    const fromIso = `${from}T00:00:00.000Z`;
    const toIso = `${to}T23:59:59.999Z`;
    const [bookings, rules, entries] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, profiles(full_name,email)")
        .gte("start_time", fromIso)
        .lte("start_time", toIso)
        .order("start_time", { ascending: false }),
      supabase.from("pricing_rules").select("*").order("start_time"),
      supabase.from("finance_entries").select("*").gte("entry_date", from).lte("entry_date", to).order("entry_date"),
    ]);

    if (bookings.error) throw bookings.error;
    if (rules.error && rules.error.code !== "42P01") throw rules.error;
    if (entries.error && entries.error.code !== "42P01") throw entries.error;

    ledger = (bookings.data ?? []).map(mapLedger);
    pricingRules = rules.data?.length ? rules.data : fallbackPricingRules;
    financeEntries = entries.data?.length ? entries.data : [];
  }

  const confirmed = ledger.filter((row) => row.status !== "cancelled");
  const courtRevenue = confirmed.reduce((sum, row) => sum + row.base_amount, 0);
  const taxCollected = confirmed.reduce((sum, row) => sum + row.tax_amount, 0);
  const bookingProfit = confirmed.reduce((sum, row) => sum + row.gross_profit, 0);
  const expenses = financeEntries.filter((entry) => entry.category === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const adjustments = financeEntries.filter((entry) => entry.category !== "expense").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const netProfit = bookingProfit + adjustments - expenses;

  return {
    dateRange: { from, to },
    ledger,
    pricingRules,
    financeEntries,
    summary: {
      bookings: confirmed.length,
      courtRevenue,
      taxCollected,
      operatingCost: confirmed.reduce((sum, row) => sum + row.operating_cost, 0) + expenses,
      grossProfit: bookingProfit,
      adjustments,
      netProfit,
    },
  };
}
