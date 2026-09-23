import { createClient } from "@/lib/supabase/server";
import ApiKeyForm from "./ApiKeyForm";

const PROVIDERS = [
  {
    id: "google_places",
    label: "Google Places API",
    helpUrl: "https://console.cloud.google.com/apis/credentials",
    helpText: "企業の自動収集(Googleマップ)に使用します。",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    helpUrl: "https://aistudio.google.com/apikey",
    helpText: "営業メール・SMS文面の自動生成に使用します。",
  },
  {
    id: "openai",
    label: "OpenAI(GPT)",
    helpUrl: "https://platform.openai.com/api-keys",
    helpText: "営業メール・SMS文面の自動生成に使用します。",
  },
  {
    id: "anthropic",
    label: "Anthropic(Claude)",
    helpUrl: "https://console.anthropic.com/settings/keys",
    helpText: "営業メール・SMS文面の自動生成に使用します。",
  },
] as const;

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: keys } = await supabase
    .from("api_keys")
    .select("provider")
    .eq("user_id", user?.id ?? "");

  const configured = new Set((keys ?? []).map((k) => k.provider));

  return (
    <main className="min-h-screen px-6 sm:px-10 py-12 max-w-3xl mx-auto">
      <header className="mb-8 animate-fade-in-up">
        <p className="text-xs font-semibold tracking-[0.15em] text-violet-500 uppercase">
          Settings
        </p>
        <h1 className="text-2xl font-bold mt-1 text-zinc-900">APIキー連携</h1>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
          ご自身が契約しているサービスのAPIキーを登録すると、企業の自動収集・AI文面生成が使えるようになります。キーは暗号化して保存され、平文のままDBに保存されることはありません。社内の一般アカウントのキーは、管理者(社長側)を含め他の誰からも読み出せません。
        </p>
      </header>

      <div className="space-y-4">
        {PROVIDERS.map((p, i) => (
          <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${80 + i * 40}ms` }}>
            <ApiKeyForm
              provider={p.id}
              label={p.label}
              helpUrl={p.helpUrl}
              helpText={p.helpText}
              isConfigured={configured.has(p.id)}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
