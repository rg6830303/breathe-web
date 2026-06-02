import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  body: z.string().trim().max(2000).optional(),
  category: z.enum(["daily", "weekly", "monthly"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const updates: string[] = [];
  const args: (string | number)[] = [];
  if (parsed.data.title !== undefined) {
    updates.push("title = ?");
    args.push(parsed.data.title);
  }
  if (parsed.data.body !== undefined) {
    updates.push("body = ?");
    args.push(parsed.data.body);
  }
  if (parsed.data.category !== undefined) {
    updates.push("category = ?");
    args.push(parsed.data.category);
  }
  if (parsed.data.active !== undefined) {
    updates.push("active = ?");
    args.push(parsed.data.active ? 1 : 0);
  }
  if (updates.length === 0) return NextResponse.json({ ok: true });

  updates.push("updated_at = ?");
  args.push(Date.now());
  args.push(id);

  let tursoOk = false;
  try {
    await turso.execute({
      sql: `UPDATE notices SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });
    tursoOk = true;
  } catch (err) {
    console.error("[admin notice patch turso error]", err);
  }
  // Mirror the same field changes to Supabase.
  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase) {
      const patch: Record<string, unknown> = { updated_at: Date.now() };
      if (parsed.data.title !== undefined) patch.title = parsed.data.title;
      if (parsed.data.body !== undefined) patch.body = parsed.data.body;
      if (parsed.data.category !== undefined) patch.category = parsed.data.category;
      if (parsed.data.active !== undefined) patch.active = parsed.data.active ? 1 : 0;
      const { error } = await supabase.from("notices").update(patch).eq("id", id);
      if (!error) tursoOk = true; // at least one backend succeeded
    }
  } catch (sbErr) {
    console.error("[admin notice patch supabase error]", sbErr);
  }
  if (!tursoOk) return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  let ok = false;
  try {
    await turso.execute({ sql: "DELETE FROM notices WHERE id = ?", args: [id] });
    ok = true;
  } catch (err) {
    console.error("[admin notice delete turso error]", err);
  }
  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase) {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (!error) ok = true;
    }
  } catch (sbErr) {
    console.error("[admin notice delete supabase error]", sbErr);
  }
  if (!ok) return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
