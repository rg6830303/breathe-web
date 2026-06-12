import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db/ensure";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(160),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  format: z.string().trim().max(80).optional().or(z.literal("")),
  prize: z.string().trim().max(120).optional().or(z.literal("")),
  fee: z.number().int().min(0).max(1_000_000).default(0),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["upcoming", "open", "completed", "cancelled"]).default("upcoming"),
  active: z.boolean().default(true),
});

function dual(): { supabase: any; hasSupabase: boolean } {
  try {
    return require("@/lib/supabase");
  } catch {
    return { supabase: null, hasSupabase: false };
  }
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema().catch(() => {});
  let rows: Array<Record<string, unknown>> = [];
  try {
    const r = await turso.execute({
      sql: "SELECT * FROM tournaments ORDER BY event_date DESC, created_at DESC LIMIT 200",
      args: [],
    });
    rows = r.rows as unknown as Array<Record<string, unknown>>;
  } catch (e) {
    console.error("[tournaments list turso error]", e);
    const { supabase, hasSupabase } = dual();
    if (hasSupabase) {
      const { data } = await supabase.from("tournaments").select("*").order("event_date", { ascending: false });
      if (Array.isArray(data)) rows = data;
    }
  }
  const tournaments = rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    event_date: r.event_date ? String(r.event_date) : "",
    format: r.format ? String(r.format) : "",
    prize: r.prize ? String(r.prize) : "",
    fee: Number(r.fee) || 0,
    description: r.description ? String(r.description) : "",
    status: String(r.status ?? "upcoming"),
    active: Number(r.active) === 1,
  }));
  return NextResponse.json({ tournaments });
}

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
    name: parsed.data.name,
    event_date: parsed.data.event_date || null,
    format: parsed.data.format || null,
    prize: parsed.data.prize || null,
    fee: parsed.data.fee,
    description: parsed.data.description || null,
    status: parsed.data.status,
    active: parsed.data.active ? 1 : 0,
    created_at: now,
    updated_at: now,
  };
  let ok = false;
  try {
    await turso.execute({
      sql: `INSERT INTO tournaments (id, name, event_date, format, prize, fee, description, status, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [row.id, row.name, row.event_date, row.format, row.prize, row.fee, row.description, row.status, row.active, row.created_at, row.updated_at],
    });
    ok = true;
  } catch (e) {
    console.error("[tournament create turso error]", e);
  }
  try {
    const { supabase, hasSupabase } = dual();
    if (hasSupabase) {
      const { error } = await supabase.from("tournaments").insert(row);
      if (!error) ok = true;
    }
  } catch (e) {
    console.error("[tournament create supabase error]", e);
  }
  if (!ok) return NextResponse.json({ error: "Could not save the tournament." }, { status: 500 });

  try {
    const { notifyAdminAction } = require("@/lib/notifications");
    await notifyAdminAction("Tournament saved", `${row.name}${row.event_date ? ` · ${row.event_date}` : ""} · ${row.status}`, { actor: admin.email });
  } catch (e) {
    console.error("[tournament notify error]", e);
  }

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  let ok = false;
  try {
    await turso.execute({ sql: "DELETE FROM tournaments WHERE id = ?", args: [id] });
    ok = true;
  } catch (e) {
    console.error("[tournament delete turso error]", e);
  }
  try {
    const { supabase, hasSupabase } = dual();
    if (hasSupabase) {
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (!error) ok = true;
    }
  } catch (e) {
    console.error("[tournament delete supabase error]", e);
  }
  if (!ok) return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
