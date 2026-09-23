"use server";

import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

export type SaveApiKeyState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const VALID_PROVIDERS = ["google_places", "gemini", "openai", "anthropic"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

// APIキーを暗号化してDBへ保存(新規 or 上書き)。
// 平文は暗号化直前まで一瞬だけメモリ上に存在し、DBには絶対に平文で書き込まれない。
export async function saveApiKey(
  _prevState: SaveApiKeyState,
  formData: FormData
): Promise<SaveApiKeyState> {
  const provider = String(formData.get("provider") ?? "");
  const rawKey = String(formData.get("key") ?? "").trim();

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return { status: "error", message: "不正なプロバイダーです。" };
  }
  if (!rawKey) {
    return { status: "error", message: "APIキーを入力してください。" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "ログインが必要です。" };
  }

  let encrypted: string;
  try {
    encrypted = encryptSecret(rawKey);
  } catch (e) {
    return {
      status: "error",
      message: "サーバー側の暗号化設定に問題があります(ENCRYPTION_KEY未設定の可能性)。運営に連絡してください。",
    };
  }

  const { error } = await supabase
    .from("api_keys")
    .upsert(
      { user_id: user.id, provider, encrypted_key: encrypted },
      { onConflict: "user_id,provider" }
    );

  if (error) {
    return { status: "error", message: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { status: "success", message: "保存しました。" };
}

export async function deleteApiKey(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  if (!VALID_PROVIDERS.includes(provider as Provider)) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("api_keys").delete().eq("user_id", user.id).eq("provider", provider);
  revalidatePath("/settings");
  revalidatePath("/");
}
