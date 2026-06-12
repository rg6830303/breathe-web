import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noticeSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(160),
  body: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  category: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  active: z.boolean().default(true),
});

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await turso.execute({
      sql: "SELECT id, title, body, category, active, created_at, updated_at FROM notices ORDER BY created_at DESC",
      args: [],
    });
    const notices = result.rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      body: r.body ? String(r.body) : null,
      category: String(r.category),
      active: Number(r.active) === 1,
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at),
    }));
    return NextResponse.json({ notices });
  } catch (err) {
    console.error("[admin notices list error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = noticeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const id = uuid();
  const now = Date.now();
  let tursoOk = false;
  try {
    await turso.execute({
      sql: "INSERT INTO notices (id, title, body, category, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        id,
        parsed.data.title,
        parsed.data.body ?? null,
        parsed.data.category,
        parsed.data.active ? 1 : 0,
        now,
        now,
      ],
    });
    tursoOk = true;
  } catch (err) {
    console.error("[admin notice create turso error]", err);
  }
  // Mirror to Supabase so the notice survives + shows even if Turso is down.
  let supabaseOk = false;
  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase) {
      const { error } = await supabase.from("notices").insert({
        id,
        title: parsed.data.title,
        body: parsed.data.body ?? null,
        category: parsed.data.category,
        active: parsed.data.active ? 1 : 0,
        created_at: now,
        updated_at: now,
      });
      supabaseOk = !error;
    }
  } catch (sbErr) {
    console.error("[admin notice create supabase error]", sbErr);
  }
  if (!tursoOk && !supabaseOk) {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  try {
    const { notifyAdminAction } = require("@/lib/notifications");
    await notifyAdminAction("Notice published", `${parsed.data.title} · ${parsed.data.category}`, { actor: admin.email });
  } catch (e) {
    console.error("[admin notice notify error]", e);
  }

  return NextResponse.json({ ok: true, id });
}
