"use client";

import { useState, type ReactNode } from "react";

// OpenAI/Anthropicなど「上級者向け」のAPIキー設定を、初期状態では畳んでおくための開閉ラッパー。
// 初めての方はGemini(推奨カード)だけ見えればよく、選択肢を減らして迷いを無くす狙い。
export default function AdvancedProviders({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
      >
        {open ? "閉じる" : "他のAIサービス(OpenAI / Claude)を使いたい方はこちら"}
      </button>
      {open && <div className="space-y-4 mt-4">{children}</div>}
    </div>
  );
}
