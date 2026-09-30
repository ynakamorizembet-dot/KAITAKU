// BYOK(ユーザー自身のAPIキー)でGemini / OpenAI / Anthropicのいずれかを呼び出し、
// 営業メールの件名・本文を生成する。サーバー側(Server Actions)からのみ呼び出すこと。
//
// 【重要・要メンテナンス】各社のモデルIDは時間とともに変わる。呼び出しが404等で失敗する場合は、
// 下記 MODEL_IDS を各社の最新ドキュメントに合わせて更新すること。追加のnpmパッケージは使わず、
// すべて素のfetchでREST APIを直接叩く実装にしている(依存を増やさずMVPで動かす方針)。

export type AiProvider = "gemini" | "openai" | "anthropic";

// 2026-09-30時点で確認済み(各社の廃止スケジュールを要ウォッチ):
// - gemini-2.5-flash は2026-10-16に退役するため、後継の gemini-3.8-flash に切り替え済み
// - claude-3-5-haiku-20241022 は2026-02-19付で既に退役済みだったため、
//   後継の claude-haiku-4-5-20251001 に切り替え済み(Anthropicキー利用者は本更新まで生成が全滅していた)
// - gpt-4o-mini は現時点で廃止予定リストに入っておらず変更なし
const MODEL_IDS: Record<AiProvider, string> = {
  gemini: "gemini-3.8-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
};

export type DraftResult = { subject: string; body: string };

function buildPrompt(input: {
  companyName: string;
  industry?: string | null;
  address?: string | null;
  notes?: string | null;
}): string {
  return `以下の企業に向けた、丁寧で自然な日本語の新規営業メールの件名と本文を作成してください。

【送付先企業】
会社名: ${input.companyName}
業種: ${input.industry || "不明"}
所在地: ${input.address || "不明"}
メモ: ${input.notes || "なし"}

【条件】
- 唐突すぎず、相手の業種を踏まえた自然な書き出しにする
- 売り込み感を抑え、まずは接点を作ることを目的とした短めの文面(200〜350字程度)
- 自社サービスの具体名は書かず、「貴社のお力になれることがないか、一度お話しできればと思いご連絡しました」という趣旨に留める(送信者本人があとで自社サービスの説明を書き足す前提)
- 敬語・ビジネスメールの体裁を守る
- 必ず以下の形式のみで出力する(前置き・説明文は一切不要):

件名: (ここに件名)
本文: (ここに本文)`;
}

function parseDraft(raw: string): DraftResult {
  const subjectMatch = raw.match(/件名[:：]\s*(.+)/);
  const bodyMatch = raw.match(/本文[:：]\s*([\s\S]+)/);
  return {
    subject: subjectMatch?.[1]?.trim() || "新規のご挨拶",
    body: bodyMatch?.[1]?.trim() || raw.trim(),
  };
}

// maxOutputTokens/maxTokensを指定すると短い応答で済ませられる(APIキーの接続確認用)。
// 省略時は通常の文面生成として動作する。
async function callGemini(apiKey: string, prompt: string, maxOutputTokens?: number): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_IDS.gemini}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(maxOutputTokens ? { generationConfig: { maxOutputTokens } } : {}),
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API エラー(${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Geminiから有効な応答がありませんでした。");
  return text;
}

async function callOpenAI(apiKey: string, prompt: string, maxTokens?: number): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_IDS.openai,
      messages: [{ role: "user", content: prompt }],
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI API エラー(${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAIから有効な応答がありませんでした。");
  return text;
}

async function callAnthropic(apiKey: string, prompt: string, maxTokens = 600): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL_IDS.anthropic,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API エラー(${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Claudeから有効な応答がありませんでした。");
  return text;
}

export async function generateEmailDraft(
  provider: AiProvider,
  apiKey: string,
  company: { companyName: string; industry?: string | null; address?: string | null; notes?: string | null }
): Promise<DraftResult> {
  const prompt = buildPrompt(company);
  let raw: string;
  if (provider === "gemini") raw = await callGemini(apiKey, prompt);
  else if (provider === "openai") raw = await callOpenAI(apiKey, prompt);
  else raw = await callAnthropic(apiKey, prompt);
  return parseDraft(raw);
}

// 設定画面でAPIキー保存時に、実際にそのキーが有効か軽量なリクエストで確認する。
// 生成本番と同じ関数・同じエンドポイントを使うことで「保存時は成功したのに本番の文面生成で
// 初めて失敗に気づく」という事態を防ぐ。トークン数を絞っているのでコストはごく僅か。
export type PingResult = { ok: true } | { ok: false; message: string };

export async function pingProvider(provider: AiProvider, apiKey: string): Promise<PingResult> {
  try {
    if (provider === "gemini") await callGemini(apiKey, "接続確認", 5);
    else if (provider === "openai") await callOpenAI(apiKey, "接続確認", 5);
    else await callAnthropic(apiKey, "接続確認", 5);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "接続確認に失敗しました。" };
  }
}
