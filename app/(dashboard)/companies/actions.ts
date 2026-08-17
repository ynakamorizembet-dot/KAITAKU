"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AddCompanyState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function addCompany(
  _prevState: AddCompanyState,
  formData: FormData
): Promise<AddCompanyState> {
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name) {
    return { status: "error", message: "会社名を入力してください。" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "ログインが必要です。" };
  }

  const { error } = await supabase.from("companies").insert({
    user_id: user.id,
    name,
    industry: industry || null,
    address: address || null,
    source: "manual",
  });

  if (error) {
    return { status: "error", message: "追加に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath("/companies");
  revalidatePath("/");
  return { status: "success" };
}
