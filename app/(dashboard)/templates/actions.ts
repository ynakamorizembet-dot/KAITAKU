"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SaveTemplateState = {
  status: "idle" | "success" | "error";
  message?: string;
};

// 新規作成・更新の両方をこの1つのactionで扱う(idがあれば更新、なければ新規作成)。
export async function saveTemplate(
  _prevState: SaveTemplateState,
  formData: FormData
): Promise<SaveTemplateState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!name) {
    return { status: "error", message: "テンプレート名を入力してください。" };
  }
  if (!body) {
    return { status: "error", message: "本文を入力してください。" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "ログインが必要です。" };
  }

  const row = {
    user_id: user.id,
    name,
    category: category || null,
    subject,
    body,
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("email_templates").update(row).eq("id", id).eq("user_id", user.id)
    : await supabase.from("email_templates").insert(row);

  if (error) {
    return { status: "error", message: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath("/templates");
  revalidatePath("/send");
  return { status: "success", message: id ? "更新しました。" : "作成しました。" };
}

export async function deleteTemplate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("email_templates").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/templates");
  revalidatePath("/send");
}
