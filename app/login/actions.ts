"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type SendMagicLinkState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

export type PasswordLoginState = {
  status: "idle" | "error";
  message?: string;
};

// パスワード未設定・忘れた場合用:ワンタイムリンクを送る。
// リンク先は /auth/callback → /auth/set-password(パスワード設定画面)。
export async function sendSetupLink(
  _prevState: SendMagicLinkState,
  formData: FormData
): Promise<SendMagicLinkState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { status: "error", message: "メールアドレスを正しく入力してください。" };
  }

  const supabase = createClient();
  const origin = headers().get("origin");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/auth/set-password`,
    },
  });

  if (error) {
    return { status: "error", message: "送信に失敗しました。時間をおいて再度お試しください。" };
  }

  return { status: "sent", message: email };
}

// 通常ログイン:メールアドレス+パスワード(設定済みの場合)
export async function signInWithPassword(
  _prevState: PasswordLoginState,
  formData: FormData
): Promise<PasswordLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@") || !password) {
    return { status: "error", message: "メールアドレスとパスワードを入力してください。" };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      status: "error",
      message:
        "メールアドレスまたはパスワードが正しくありません。パスワード未設定の場合は下の「初めての方」からリンクを送ってください。",
    };
  }

  redirect("/");
}
