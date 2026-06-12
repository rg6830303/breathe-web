import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db/ensure";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPENSE_CATEGORIES = [
  "food",
  "maintenance",
  "staff",
  "utilities",
  "equipment",
  "marketing",
  "rent",
  "other",
] as const;

const createSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD."),
  category: z.enum(EXPENSE_CATEGORIES).default("other"),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  amount: z.number().int().min(0).max(10_000_000),
  payment_method: z.string().trim().max(40).optional().or(z.literal("")),
});

function dual(): { supabase: unknown; hasSupabase: boolean } {
  try {
    return require("@/lib/supabase");
  } catch {
    return { supabase: null, hasSupabase: false };
  }
}

/** List expenses in a date range (default: current month) + summary by category. */
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema().catch(() => {});

  const url = new URL(req.url);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const monthStart = `${today.slice(0, 7)}-01`;
  const from = url.searchParams.get("from") || monthStart;
  const to = url.searchParams.get("to") || today;

  let rows: Array<Record<string, unknown>> = [];
  try {
    const r = await turso.execute({
      sql: `SELECT id, expense_date, category, description, amount, payment_method, created_at
            FROM expenses WHERE expense_date >= ? AND expense_date <= ?
            ORDER BY expense_date DESC, created_at DESC LIMIT 1000`,
      args: [from, to],
    });
    rows = r.rows as unknown as Array<Record<string, unknown>>;
  } catch (e) {
    console.error("[expenses list turso error]", e);
    // Supabase fallback
    const { supabase, hasSupabase } = dual() as { supabase: any; hasSupabase: boolean };
    if (hasSupabase) {
      const { data } = await supabase
        .from("expenses")
        .select("id, expense_date, category, description, amount, payment_method, created_at")
        .gte("expense_date", from)
        .lte("expense_date", to)
        .order("expense_date", { ascending: false });
      if (Array.isArray(data)) rows = data;
    }
  }

  const expenses = rows.map((r) => ({
    id: String(r.id),
    expense_date: String(r.expense_date),
    category: String(r.category),
    description: r.description ? String(r.description) : "",
    amount: Number(r.amount) || 0,
    payment_method: r.payment_method ? String(r.payment_method) : "",
  }));

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;

  return NextResponse.json({ from, to, expenses, total, byCategory });
}

/** Add a daily expense. Writes both backends. */
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema().catch(() => {});

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const id = uuid();
  const now = Date.now();
  const row = {
    id,
    expense_date: parsed.data.expense_date,
    category: parsed.data.category,
    description: parsed.data.description || null,
    amount: parsed.data.amount,
    payment_method: parsed.data.payment_method || null,
    created_at: now,
  };

  let ok = false;
  try {
    await turso.execute({
      sql: `INSERT INTO expenses (id, expense_date, category, description, amount, payment_method, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [row.id, row.expense_date, row.category, row.description, row.amount, row.payment_method, row.created_at],
    });
    ok = true;
  } catch (e) {
    console.error("[expense create turso error]", e);
  }
  try {
    const { supabase, hasSupabase } = dual() as { supabase: any; hasSupabase: boolean };
    if (hasSupabase) {
      const { error } = await supabase.from("expenses").insert(row);
      if (!error) ok = true;
    }
  } catch (e) {
    console.error("[expense create supabase error]", e);
  }
  if (!ok) return NextResponse.json({ error: "Could not save the expense." }, { status: 500 });

  try {
    const { notifyAdminAction } = require("@/lib/notifications");
    const desc = row.description ? ` · ${row.description}` : "";
    await notifyAdminAction(
      "Expense recorded",
      `₹${row.amount.toLocaleString("en-IN")} · ${row.category} · ${row.expense_date}${desc}`,
      { actor: admin.email },
    );
  } catch (e) {
    console.error("[expense notify error]", e);
  }

  return NextResponse.json({ ok: true, id });
}

/** Delete an expense by id. */
export async function DELETE(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let ok = false;
  try {
    await turso.execute({ sql: "DELETE FROM expenses WHERE id = ?", args: [id] });
    ok = true;
  } catch (e) {
    console.error("[expense delete turso error]", e);
  }
  try {
    const { supabase, hasSupabase } = dual() as { supabase: any; hasSupabase: boolean };
    if (hasSupabase) {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (!error) ok = true;
    }
  } catch (e) {
    console.error("[expense delete supabase error]", e);
  }
  if (!ok) return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
