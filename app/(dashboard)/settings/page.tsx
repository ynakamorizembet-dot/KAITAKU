import { createClient } from "@/lib/supabase/server";
import ApiKeyForm from "./ApiKeyForm";
import AdvancedProviders from "./AdvancedProviders";

// 迷わせないため、AI文面生成は「まずGeminiだけ」を前面に出す。無料枠があり手順も一番短い。
const RECOMMENDED_AI = {
  id: "gemini",
  label: "Google Gemini",
  helpUrl: "https://aistudio.google.com/apikey",
  helpText: "営業メール・SMS文面の自動生成に使います。無料枠があり、最も簡単に始められます。迷ったらこれだけでOKです。",
  steps: [
    "上の「キー発行ページを開く」ボタンでGoogle AI Studioを開く(お使いのGoogleアカウントでログイン)",
    "「Create API key」(APIキーを作成)ボタンをクリック",
    "表示された文字列(AIzaSyから始まります)をコピーして下の欄に貼り付け、保存する",
  ],
};

// OpenAI/Anthropicは「他のAIを使いたい方」向けの上級者オプションとして畳んでおく。
const OTHER_AI_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI(GPT)",
    helpUrl: "https://platform.openai.com/api-keys",
    helpText: "営業メール・SMS文面の自動生成に使用します。利用には支払い方法の登録が必要です。",
    steps: [
      "上のボタンでOpenAIの管理画面を開く",
      "「Create new secret key」をクリック",
      "表示されたキー(sk-から始まります。この場でしか表示されないため必ずコピー)を下の欄に貼り付け",
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic(Claude)",
    helpUrl: "https://console.anthropic.com/settings/keys",
    helpText: "営業メール・SMS文面の自動生成に使用します。利用には支払い方法の登録が必要です。",
    steps: [
      "上のボタンでAnthropic Consoleを開く",
      "「Create Key」をクリック",
      "表示されたキー(sk-ant-から始まります)を下の欄に貼り付け",
    ],
  },
] as const;

const COLLECTION_PROVIDER = {
  id: "google_places",
  label: "Google Places API",
  helpUrl: "https://console.cloud.google.com/apis/credentials",
  helpText:
    "企業の自動収集(Googleマップから一括取得)に使います。今はまだ使わなくても、手動で企業を登録すればすぐに始められます。",
};

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: keys } = await supabase
    .from("api_keys")
    .select("provider")
    .eq("user_id", user?.id ?? "");

  const configured = new Set((keys ?? []).map((k: { provider: string }) => k.provider));

  return (
    <main className="min-h-screen px-6 sm:px-10 py-12 max-w-3xl mx-auto">
      <header className="mb-8 animate-fade-in-up">
        <p className="text-xs font-semibold tracking-[0.15em] text-violet-500 uppercase">Settings</p>
        <h1 className="text-2xl font-bold mt-1 text-zinc-900">APIキー連携</h1>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
          AI文面生成を使うには、下のGeminiのキーを1つ登録するだけでOKです(無料)。他社のAIやGoogleマップ自動収集は、必要になったときにいつでも追加できます。キーは暗号化して保存され、平文のままDBに保存されることはありません。社内の一般アカウントのキーは、管理者(社長側)を含め他の誰からも読み出せません。
        </p>
      </header>

      <div className="space-y-4">
        <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <ApiKeyForm
            provider={RECOMMENDED_AI.id}
            label={RECOMMENDED_AI.label}
            helpUrl={RECOMMENDED_AI.helpUrl}
            helpText={RECOMMENDED_AI.helpText}
            isConfigured={configured.has(RECOMMENDED_AI.id)}
            steps={[...RECOMMENDED_AI.steps]}
            recommended
          />
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <AdvancedProviders>
            {OTHER_AI_PROVIDERS.map((p) => (
              <ApiKeyForm
                key={p.id}
                provider={p.id}
                label={p.label}
                helpUrl={p.helpUrl}
                helpText={p.helpText}
                isConfigured={configured.has(p.id)}
                steps={[...p.steps]}
              />
            ))}
          </AdvancedProviders>
        </div>
      </div>

      <div className="mt-10 pt-8 border-t border-black/[0.06] animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        <h2 className="text-sm font-semibold text-zinc-500 mb-3 tracking-wide">
          企業の自動収集を使う場合(オプション)
        </h2>
        <ApiKeyForm
          provider={COLLECTION_PROVIDER.id}
          label={COLLECTION_PROVIDER.label}
          helpUrl={COLLECTION_PROVIDER.helpUrl}
          helpText={COLLECTION_PROVIDER.helpText}
          isConfigured={configured.has(COLLECTION_PROVIDER.id)}
        />
      </div>
    </main>
  );
}
