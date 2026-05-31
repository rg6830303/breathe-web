import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await turso.execute({
      sql: "SELECT id, email, full_name, phone, created_at FROM users WHERE id = ? LIMIT 1",
      args: [session.id],
    });
    const row = result.rows[0];
    if (!row) return NextResponse.json({ error: "User not found." }, { status: 404 });

    return NextResponse.json({
      profile: {
        id: String(row.id),
        email: String(row.email),
        full_name: String(row.full_name),
        phone: row.phone ? String(row.phone) : null,
        created_at: Number(row.created_at),
      },
    });
  } catch (err) {
    console.error("[player profile get error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { name, phone } = parsed.data;

  try {
    await turso.execute({
      sql: "UPDATE users SET full_name = ?, phone = ? WHERE id = ?",
      args: [name, phone ?? null, session.id],
    });
  } catch (err) {
    console.error("[player profile update error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  try {
    const { supabase, hasSupabase } = require("@/lib/supabase");
    if (hasSupabase) {
      await supabase
        .from("users")
        .update({ full_name: name, phone: phone ?? null })
        .eq("id", session.id);
    }
  } catch (sbErr) {
    console.error("[player profile supabase sync error]", sbErr);
  }

  return NextResponse.json({ ok: true });
}
