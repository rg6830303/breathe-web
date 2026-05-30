import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";

type Category = "daily" | "weekly" | "monthly";
type Notice = {
  id: string;
  title: string;
  body: string | null;
  category: Category;
  active: boolean;
  created_at: string;
};

const FALLBACK: Notice[] = [
  {
    id: "fallback-1",
    title: "Tonight: prime-time courts filling fast",
    body: "7–9 PM slots on Courts 1 & 2 are nearly gone — lock yours in now.",
    category: "daily",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "fallback-2",
    title: "Weekend Doubles Ladder",
    body: "Saturday social ladder, all levels welcome. Registration closes Friday 6 PM.",
    category: "weekly",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "fallback-3",
    title: "Breathe Monthly Open",
    body: "Open & beginner brackets with cash prizes. Early-bird passes now available.",
    category: "monthly",
    active: true,
    created_at: new Date().toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const onlyActive = request.nextUrl.searchParams.get("active") === "true";
  if (!hasSupabaseEnv()) {
    const notices = onlyActive ? FALLBACK.filter((n) => n.active) : FALLBACK;
    return NextResponse.json({ notices });
  }
  const supabase = getSupabaseService();
  let query = supabase.from("notices").select("*").order("created_at", { ascending: false });
  if (onlyActive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notices: data ?? [] });
}

export async function POST(request: NextRequest) {
  await assertAdmin();
  const { title, body, category } = (await request.json()) as Partial<Notice>;
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  const safeCategory: Category = category && ["daily", "weekly", "monthly"].includes(category) ? category : "daily";
  if (!hasSupabaseEnv()) {
    return NextResponse.json({
      notice: {
        id: `local-${Date.now()}`,
        title,
        body: body ?? null,
        category: safeCategory,
        active: true,
        created_at: new Date().toISOString(),
      } satisfies Notice,
    });
  }
  const { data, error } = await getSupabaseService()
    .from("notices")
    .insert({ title, body: body ?? null, category: safeCategory })
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notice: data });
}

export async function PATCH(request: NextRequest) {
  await assertAdmin();
  const { id, active } = await request.json();
  if (!id || typeof active !== "boolean") {
    return NextResponse.json({ error: "id and active are required" }, { status: 400 });
  }
  if (!hasSupabaseEnv()) return NextResponse.json({ ok: true });
  const { error } = await getSupabaseService().from("notices").update({ active }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  await assertAdmin();
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (!hasSupabaseEnv()) return NextResponse.json({ ok: true });
  const { error } = await getSupabaseService().from("notices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
