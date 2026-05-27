import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";

async function authorize(request: NextRequest, formUserId?: string) {
  const key = request.headers.get("x-integration-key");
  if (process.env.SHEETS_INTEGRATION_KEY && key === process.env.SHEETS_INTEGRATION_KEY) return;
  if (formUserId && hasSupabaseEnv()) return assertAdmin(formUserId);
  if (!hasSupabaseEnv()) return;
  throw new Error("Admin authorization required.");
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let userId: string | undefined;
    let csv = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      userId = form.get("userId")?.toString();
      const file = form.get("file");
      csv = file instanceof File ? await file.text() : form.get("csv")?.toString() ?? "";
    } else {
      csv = await request.text();
    }

    await authorize(request, userId);
    const rows = parseCsv(csv).map((row) => ({
      id: row.id ? Number(row.id) : undefined,
      user_id: row.user_id,
      court_id: Number(row.court_id),
      start_time: row.start_time,
      end_time: row.end_time,
      total_amount: Number(row.total_amount),
      status: row.status || "confirmed",
    }));

    if (!hasSupabaseEnv()) return NextResponse.json({ ok: true, imported: rows.length, demo: true });
    const { error } = await getSupabaseService().from("bookings").upsert(rows);
    if (error) throw error;
    return NextResponse.json({ ok: true, imported: rows.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 400 });
  }
}
