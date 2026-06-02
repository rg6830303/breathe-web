import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSchema } from "@/lib/db/ensure";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  full_name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    await ensureSchema();
    const [userRes, bookingsRes, statsRes] = await Promise.all([
      turso.execute({
        sql: "SELECT id, full_name, email, phone, created_at FROM users WHERE id = ? LIMIT 1",
        args: [id],
      }),
      turso.execute({
        sql: `SELECT id, slot_date, slot_time, court_number, duration_min,
                     subtotal, gst, total, amount_paid, status, created_at
              FROM bookings WHERE user_id = ?
              ORDER BY slot_date DESC, slot_time DESC LIMIT 500`,
        args: [id],
      }),
      turso.execute({
        sql: `SELECT
                COUNT(CASE WHEN status='confirmed' THEN 1 END) as sessions,
                COALESCE(SUM(CASE WHEN status='confirmed' THEN duration_min ELSE 0 END), 0) as minutes,
                COALESCE(SUM(CASE WHEN status='confirmed' THEN amount_paid ELSE 0 END), 0) as spent
              FROM bookings WHERE user_id = ?`,
        args: [id],
      }),
    ]);

    const u = userRes.rows[0];
    if (!u) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

    const s = statsRes.rows[0];

    return NextResponse.json({
      customer: {
        id: String(u.id),
        full_name: String(u.full_name),
        email: String(u.email),
        phone: u.phone ? String(u.phone) : null,
        created_at: Number(u.created_at),
      },
      stats: {
        sessions: Number(s?.sessions ?? 0),
        hours: Math.round((Number(s?.minutes ?? 0) / 60) * 10) / 10,
        spent: Number(s?.spent ?? 0),
      },
      bookings: bookingsRes.rows.map((row) => ({
        id: String(row.id),
        slot_date: String(row.slot_date),
        slot_time: String(row.slot_time).slice(0, 5),
        court_number: Number(row.court_number) || 1,
        duration_min: Number(row.duration_min) || 60,
        subtotal: Number(row.subtotal) || 0,
        gst: Number(row.gst) || 0,
        total: Number(row.total) || Number(row.amount_paid) || 0,
        status: String(row.status),
        created_at: String(row.created_at),
      })),
    });
  } catch (err) {
    console.error("[admin customer detail error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/** Admin edits a customer's profile (name / email / phone). Writes both DBs. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const sets: string[] = [];
  const args: (string | null)[] = [];
  const sbPatch: Record<string, unknown> = {};
  if (parsed.data.full_name !== undefined) { sets.push("full_name = ?"); args.push(parsed.data.full_name); sbPatch.full_name = parsed.data.full_name; }
  if (parsed.data.email !== undefined) { sets.push("email = ?"); args.push(parsed.data.email); sbPatch.email = parsed.data.email; }
  if (parsed.data.phone !== undefined) { const p = parsed.data.phone || null; sets.push("phone = ?"); args.push(p); sbPatch.phone = p; }
  if (sets.length === 0) return NextResponse.json({ ok: true });
  args.push(id);

  let ok = false;
  try {
    await ensureSchema();
    await turso.execute({ sql: `UPDATE users SET ${sets.join(", ")} WHERE id = ?`, args });
    ok = true;
  } catch (e) {
    console.error("[admin customer patch turso error]", e);
  }
  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase) {
      const { error } = await supabase.from("users").update(sbPatch).eq("id", id);
      if (!error) ok = true;
    }
  } catch (e) {
    console.error("[admin customer patch supabase error]", e);
  }
  if (!ok) return NextResponse.json({ error: "Could not update customer." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Admin deletes a customer (and their bookings) from both DBs. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let ok = false;
  try {
    await turso.execute({ sql: "DELETE FROM bookings WHERE user_id = ?", args: [id] });
    await turso.execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] });
    ok = true;
  } catch (e) {
    console.error("[admin customer delete turso error]", e);
  }
  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase) {
      await supabase.from("bookings").delete().eq("user_id", id);
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (!error) ok = true;
    }
  } catch (e) {
    console.error("[admin customer delete supabase error]", e);
  }
  if (!ok) return NextResponse.json({ error: "Could not delete customer." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
