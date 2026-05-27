"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
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
