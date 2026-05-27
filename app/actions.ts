"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { getSupabaseService } from "@/lib/supabase";
import type { NoticeType } from "@/lib/types";

export async function createNotice(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  await assertAdmin(userId);
  const payload = {
    title: formData.get("title")?.toString() ?? "",
    content: formData.get("content")?.toString() ?? "",
    type: (formData.get("type")?.toString() ?? "daily") as NoticeType,
  };
  const { error } = await getSupabaseService().from("notice_board").insert(payload);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateNotice(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  await assertAdmin(userId);
  const id = Number(formData.get("id"));
  const { error } = await getSupabaseService()
    .from("notice_board")
    .update({
      title: formData.get("title")?.toString(),
      content: formData.get("content")?.toString(),
      type: formData.get("type")?.toString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteNotice(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  await assertAdmin(userId);
  const id = Number(formData.get("id"));
  const { error } = await getSupabaseService().from("notice_board").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateBookingAdmin(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  await assertAdmin(userId);
  const id = Number(formData.get("id"));
  const payload = {
    court_id: Number(formData.get("courtId")),
    start_time: formData.get("startTime")?.toString(),
    end_time: formData.get("endTime")?.toString(),
    total_amount: Number(formData.get("totalAmount")),
    status: formData.get("status")?.toString() ?? "confirmed",
  };
  const { error } = await getSupabaseService().from("bookings").update(payload).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/book");
}

export async function upsertPricingRule(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  await assertAdmin(userId);
  const id = Number(formData.get("id") || 0);
  const court = formData.get("courtId")?.toString();
  const payload = {
    label: formData.get("label")?.toString() ?? "Custom rate",
    court_id: court ? Number(court) : null,
    start_time: formData.get("startTime")?.toString(),
    end_time: formData.get("endTime")?.toString(),
    price: Number(formData.get("price")),
    active: formData.get("active") === "on",
  };
  const query = id
    ? getSupabaseService().from("pricing_rules").update(payload).eq("id", id)
    : getSupabaseService().from("pricing_rules").insert(payload);
  const { error } = await query;
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/book");
}

export async function addFinanceEntry(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  await assertAdmin(userId);
  const { error } = await getSupabaseService().from("finance_entries").insert({
    entry_date: formData.get("entryDate")?.toString(),
    category: formData.get("category")?.toString(),
    label: formData.get("label")?.toString(),
    amount: Number(formData.get("amount")),
    notes: formData.get("notes")?.toString() || null,
  });
  if (error) throw error;
  revalidatePath("/admin");
}

export async function importBookingsCsv(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  await assertAdmin(userId);
  const file = formData.get("file");
  const pasted = formData.get("csv")?.toString();
  const csv = file instanceof File && file.size > 0 ? await file.text() : pasted;
  if (!csv) throw new Error("Upload a CSV file or paste CSV rows.");

  const rows = parseCsv(csv).map((row) => ({
    id: row.id ? Number(row.id) : undefined,
    user_id: row.user_id,
    court_id: Number(row.court_id),
    start_time: row.start_time,
    end_time: row.end_time,
    total_amount: Number(row.total_amount),
    status: row.status || "confirmed",
  }));

  const { error } = await getSupabaseService().from("bookings").upsert(rows);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/book");
}
