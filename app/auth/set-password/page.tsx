"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setPassword, type SetPasswordState } from "./actions";

const initialState: SetPasswordState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-sm font-medium px-5 py-3 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
    >
      {pending ? "設定中..." : "パスワードを設定する"}
    </button>
  );
}

export default function SetPasswordPage() {
  const [state, formAction] = useFormState(setPassword, initialState);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-sm font-bold text-gradient tracking-tight">KAITAKU</p>
          <h1 className="text-xl font-bold text-zinc-900 mt-3">パスワードを設定</h1>
          <p className="text-sm text-zinc-500 mt-2">
            次回以降はこのパスワードでログインできます。
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="password" className="text-xs text-zinc-500 block mb-1.5">
                新しいパスワード(8文字以上)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full text-sm bg-white/70 border border-black/[0.08] rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-300"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="text-xs text-zinc-500 block mb-1.5">
                確認用に再入力
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full text-sm bg-white/70 border border-black/[0.08] rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-300"
              />
            </div>
            {state.status === "error" && (
              <p className="text-xs text-red-600 leading-relaxed">{state.message}</p>
            )}
            <SubmitButton />
          </form>
        </div>
      </div>
    </main>
  );
}
