"use client";

import { useFormState, useFormStatus } from "react-dom";
import { sendMagicLink, type SendMagicLinkState } from "./actions";

const initialState: SendMagicLinkState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-sm font-medium px-5 py-3 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
    >
      {pending ? "送信中..." : "ログインリンクを送る"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(sendMagicLink, initialState);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-sm font-bold text-gradient tracking-tight">KAITAKU</p>
          <h1 className="text-xl font-bold text-zinc-900 mt-3">ログイン</h1>
          <p className="text-sm text-zinc-500 mt-2">
            パスワードは不要です。メールアドレス宛にログイン用リンクを送ります。
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6">
          {state.status === "sent" ? (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-700 font-medium">メールを送信しました</p>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                {state.message} 宛にログインリンクを送りました。メール内のリンクを開くとログインできます。
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-xs text-zinc-500 block mb-1.5">
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full text-sm bg-white/70 border border-black/[0.08] rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-300"
                />
              </div>
              {state.status === "error" && (
                <p className="text-xs text-red-600">{state.message}</p>
              )}
              <SubmitButton />
            </form>
          )}
        </div>

        <p className="text-[11px] text-zinc-400 text-center mt-6 leading-relaxed">
          14日間無料トライアル。クレジットカードの登録は不要です。
        </p>
      </div>
    </main>
  );
}
