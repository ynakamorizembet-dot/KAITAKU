"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveApiKey, deleteApiKey, type SaveApiKeyState } from "./actions";

const initialState: SaveApiKeyState = { status: "idle" };

function SaveButton({ isConfigured }: { isConfigured: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium px-4 py-2 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      {pending ? "接続確認中..." : isConfigured ? "更新する" : "保存する"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-zinc-400 hover:text-red-600 transition-colors whitespace-nowrap disabled:opacity-60"
    >
      削除
    </button>
  );
}

export default function ApiKeyForm({
  provider,
  label,
  helpUrl,
  helpText,
  isConfigured,
  steps,
  recommended = false,
}: {
  provider: string;
  label: string;
  helpUrl: string;
  helpText: string;
  isConfigured: boolean;
  steps?: string[];
  recommended?: boolean;
}) {
  const [state, formAction] = useFormState(saveApiKey, initialState);

  return (
    <div className={`rounded-2xl p-5 ${recommended ? "glass-card-hero border-2 border-violet-200" : "glass-card"}`}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-sm font-semibold text-zinc-900 flex items-center gap-2 flex-wrap">
          {label}
          {recommended && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white font-medium whitespace-nowrap">
              おすすめ・無料
            </span>
          )}
        </p>
        <span
          className={`text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${
            isConfigured
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-black/[0.04] border-black/10 text-zinc-500"
          }`}
        >
          {isConfigured ? "設定済み" : "未設定"}
        </span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed mb-3">{helpText}</p>

      {steps && steps.length > 0 && !isConfigured && (
        <ol className="text-xs text-zinc-600 leading-relaxed mb-3 space-y-1 list-decimal list-inside bg-white/50 rounded-xl p-3">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}

      {!isConfigured && (
        <a
          href={helpUrl}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-1 text-xs px-3.5 py-1.5 rounded-full mb-3 transition-colors ${
            recommended
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-black/[0.04] border border-black/10 text-violet-700 hover:bg-black/[0.07]"
          }`}
        >
          キー発行ページを開く(別タブ)
        </a>
      )}

      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="provider" value={provider} />
        <input
          type="password"
          name="key"
          autoComplete="off"
          placeholder={isConfigured ? "新しいキーで上書き" : "発行したキーをここに貼り付け"}
          className="flex-1 min-w-0 text-sm bg-white/70 border border-black/[0.08] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-300"
        />
        <SaveButton isConfigured={isConfigured} />
      </form>
      {isConfigured && (
        <div className="flex items-center justify-between mt-2">
          <a href={helpUrl} target="_blank" rel="noreferrer" className="text-[11px] text-zinc-400 hover:underline">
            キー発行ページ
          </a>
          <form action={deleteApiKey}>
            <input type="hidden" name="provider" value={provider} />
            <DeleteButton />
          </form>
        </div>
      )}
      {state.status === "error" && <p className="text-xs text-red-600 mt-2">{state.message}</p>}
      {state.status === "success" && <p className="text-xs text-emerald-600 mt-2">✓ {state.message}</p>}
    </div>
  );
}
