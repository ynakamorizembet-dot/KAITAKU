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
      {pending ? "保存中..." : isConfigured ? "更新する" : "保存する"}
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
}: {
  provider: string;
  label: string;
  helpUrl: string;
  helpText: string;
  isConfigured: boolean;
}) {
  const [state, formAction] = useFormState(saveApiKey, initialState);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
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
      <p className="text-xs text-zinc-500 leading-relaxed mb-3">
        {helpText}{" "}
        <a
          href={helpUrl}
          target="_blank"
          rel="noreferrer"
          className="text-violet-600 hover:underline"
        >
          キーの取得はこちら
        </a>
      </p>
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="provider" value={provider} />
        <input
          type="password"
          name="key"
          autoComplete="off"
          placeholder={isConfigured ? "新しいキーで上書き" : "APIキーを貼り付け"}
          className="flex-1 min-w-0 text-sm bg-white/70 border border-black/[0.08] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-300"
        />
        <SaveButton isConfigured={isConfigured} />
      </form>
      {isConfigured && (
        <form action={deleteApiKey} className="mt-2">
          <input type="hidden" name="provider" value={provider} />
          <DeleteButton />
        </form>
      )}
      {state.status === "error" && <p className="text-xs text-red-600 mt-2">{state.message}</p>}
      {state.status === "success" && (
        <p className="text-xs text-emerald-600 mt-2">{state.message}</p>
      )}
    </div>
  );
}
