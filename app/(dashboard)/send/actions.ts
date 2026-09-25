"use server";

import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto";
import { generateEmailDraft, type AiProvider } from "@/lib/ai/generateDraft";

export type GenerateDraftState = {
  status: "idle" | "success" | "error";
  subject?: string;
  body?: string;
  provider?: AiProvider;
  message?: string;
};

const PROVIDER_PRIORITY: AiProvider[] = ["gemini", "openai", "anthropic"];

// 指定した企業の情報をもとに、ユーザー自身のBYOKキーでAI下書き(件名・本文)を生成する。
// 実際に外部AI APIを呼び出す(サンプル文面ではない)。
export async function generateDraftForCompany(companyId: string): Promise<GenerateDraftState> {
  if (!companyId) {
    return { status: "error", message: "企業を選択してください。" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "ログインが必要です。" };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("name, industry, address, notes")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();

  if (companyError || !company) {
    return { status: "error", message: "企業情報が見つかりませんでした。" };
  }

  const { data: keys } = await supabase
    .from("api_keys")
    .select("provider, encrypted_key")
    .eq("user_id", user.id);

  const available = new Map<string, string>(
    (keys ?? []).map((k: { provider: string; encrypted_key: string }) => [k.provider, k.encrypted_key])
  );
  const provider = PROVIDER_PRIORITY.find((p) => available.has(p));

  if (!provider) {
    return {
      status: "error",
      message:
        "AIプロバイダのAPIキーが未設定です。設定画面(APIキー連携)でGemini/OpenAI/Anthropicのいずれかを登録してください。",
    };
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(available.get(provider)!);
  } catch (e) {
    return {
      status: "error",
      message: "APIキーの復号に失敗しました(サーバー側のENCRYPTION_KEY設定を確認してください)。",
    };
  }

  try {
    const draft = await generateEmailDraft(provider, apiKey, {
      companyName: company.name,
      industry: company.industry,
      address: company.address,
      notes: company.notes,
    });
    return { status: "success", subject: draft.subject, body: draft.body, provider };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI生成に失敗しました。";
    return { status: "error", message: msg };
  }
}
