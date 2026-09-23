"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type SetPasswordState = {
  status: "idle" | "error";
  message?: string;
};

export async function setPassword(
  _prevState: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { status: "error", message: "パスワードは8文字以上で設定してください。" };
  }
  if (password !== confirm) {
    return { status: "error", message: "確認用パスワードが一致しません。" };
  }

  const supabase = createClient();

  // このページはメール内リンク経由の一時セッションでのみ意味を持つ。
  // セッションがない(直接URLを叩いた等)場合はログインへ戻す。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { status: "error", message: "設定に失敗しました。時間をおいて再度お試しください。" };
  }

  redirect("/");
}
