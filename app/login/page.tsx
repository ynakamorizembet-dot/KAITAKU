"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  sendSetupLink,
  signInWithPassword,
  type SendMagicLinkState,
  type PasswordLoginState,
} from "./actions";

const initialSetupState: SendMagicLinkState = { status: "idle" };
const initialLoginState: PasswordLoginState = { status: "idle" };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-sm font-medium px-5 py-3 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"password" | "setup">("password");
  const [loginState, loginAction] = useFormState(signInWithPassword, initialLoginState);
  const [setupState, setupAction] = useFormState(sendSetupLink, initialSetupState);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-sm font-bold text-gradient tracking-tight">KAITAKU</p>
          <h1 className="text-xl font-bold text-zinc-900 mt-3">ログイン</h1>
          <p className="text-sm text-zinc-500 mt-2">
            {mode === "password"
              ? "メールアドレスとパスワードでログインします。"
              : "初回設定・再設定用のリンクをメールで送ります。"}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6">
          {mode === "password" ? (
            <form action={loginAction} className="space-y-4">
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
              <div>
                <label htmlFor="password" className="text-xs text-zinc-500 block mb-1.5">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full text-sm bg-white/70 border border-black/[0.08] rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-300"
                />
              </div>
              {loginState.status === "error" && (
                <p className="text-xs text-red-600 leading-relaxed">{loginState.message}</p>
              )}
              <SubmitButton label="ログイン" pendingLabel="ログイン中..." />
            </form>
          ) : setupState.status === "sent" ? (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-700 font-medium">メールを送信しました</p>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                {setupState.message} 宛にリンクを送りました。メール内のリンクを開くとパスワードを設定できます。
              </p>
            </div>
          ) : (
            <form action={setupAction} className="space-y-4">
              <div>
                <label htmlFor="setup-email" className="text-xs text-zinc-500 block mb-1.5">
                  メールアドレス
                </label>
                <input
                  id="setup-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full text-sm bg-white/70 border border-black/[0.08] rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-300"
                />
              </div>
              {setupState.status === "error" && (
                <p className="text-xs text-red-600">{setupState.message}</p>
              )}
              <SubmitButton label="設定用リンクを送る" pendingLabel="送信中..." />
            </form>
          )}

          <button
            type="button"
            onClick={() => setMode(mode === "password" ? "setup" : "password")}
            className="w-full text-xs text-violet-600 hover:text-violet-700 text-center mt-4"
          >
            {mode === "password"
              ? "初めての方 / パスワードをお忘れの方はこちら"
              : "パスワードでログインする"}
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 text-center mt-6 leading-relaxed">
          14日間無料トライアル。クレジットカードの登録は不要です。
        </p>
      </div>
    </main>
  );
}
