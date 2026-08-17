"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type SendMagicLinkState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

export async function sendMagicLink(
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
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: "送信に失敗しました。時間をおいて再度お試しください。" };
  }

  return { status: "sent", message: email };
}
