"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { IconSparkle } from "@/components/Icons";
import { generateDraftForCompany } from "./actions";

type Company = { id: string; name: string; industry: string | null; address: string | null };

const PROVIDER_LABEL: Record<string, string> = {
  gemini: "Gemini",
  openai: "GPT",
  anthropic: "Claude",
};

export default function SendComposer({
  companies,
  hasAnyApiKey,
}: {
  companies: Company[];
  hasAnyApiKey: boolean;
}) {
  const [selectedId, setSelectedId] = useState(companies[0]?.id ?? "");
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [usedProvider, setUsedProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    setError(null);
    if (!selectedId) {
      setError("企業を選択してください。");
      return;
    }
    startTransition(async () => {
      const result = await generateDraftForCompany(selectedId);
      if (result.status === "success") {
        setSubject(result.subject ?? "");
        setBody(result.body ?? "");
        setUsedProvider(result.provider ?? null);
      } else {
        setError(result.message ?? "生成に失敗しました。");
      }
    });
  };

  const handleManual = () => {
    setMode("manual");
    setError(null);
    setUsedProvider(null);
    setSubject("");
    setBody("");
  };

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 mb-6 animate-fade-in-up" style={{ animationDelay: "130ms" }}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 text-sm bg-white/70 border border-black/[0.08] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-300"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.industry ? `(${c.industry})` : ""}
            </option>
          ))}
        </select>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending || !hasAnyApiKey}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap disabled:opacity-50 ${
              mode === "ai" && subject
                ? "bg-violet-600 border-violet-600 text-white"
                : "bg-black/[0.04] border-black/10 text-zinc-600 hover:bg-black/[0.07]"
            }`}
          >
            {isPending ? "生成中..." : "AIで生成"}
          </button>
          <button
            type="button"
            onClick={handleManual}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
              mode === "manual"
                ? "bg-zinc-900 border-zinc-900 text-white"
                : "bg-black/[0.04] border-black/10 text-zinc-600 hover:bg-black/[0.07]"
            }`}
          >
            自分で書く
          </button>
        </div>
      </div>

      {!hasAnyApiKey && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          AIで生成するには、先に
          <Link href="/settings" className="underline font-medium mx-1">
            設定画面
          </Link>
          でGemini/OpenAI/Anthropicいずれかのご自身のAPIキーを登録してください。「自分で書く」はキーなしでも使えます。
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      {usedProvider && (
        <p className="text-[11px] text-emerald-700 flex items-center gap-1 mb-2">
          <IconSparkle className="w-3.5 h-3.5" />
          {PROVIDER_LABEL[usedProvider] ?? usedProvider}が実際に生成した下書きです。自由に書き換えてください。
        </p>
      )}

      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="件名"
        className="w-full text-sm font-medium text-zinc-800 bg-white/70 border border-black/[0.06] rounded-xl px-4 py-2.5 mb-2 focus:outline-none focus:border-violet-300"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={9}
        placeholder={mode === "manual" ? "本文をここに入力してください" : "「AIで生成」を押すと、ここに本物の下書きが表示されます"}
        className="w-full text-sm text-zinc-700 bg-white/70 border border-black/[0.06] rounded-2xl p-4 leading-relaxed resize-none focus:outline-none focus:border-violet-300"
      />
      <p className="text-[11px] text-zinc-400 mt-2">
        ここで内容を確認・編集してから送信してください(送信ボタンはメールアカウント連携(準備中)の後に有効化されます)。
      </p>
    </section>
  );
}
