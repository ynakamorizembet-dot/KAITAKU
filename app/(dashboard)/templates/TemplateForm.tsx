"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveTemplate, deleteTemplate, type SaveTemplateState } from "./actions";

const initialState: SaveTemplateState = { status: "idle" };

const PLACEHOLDER_LEGEND = [
  { token: "{{会社名}}", label: "会社名" },
  { token: "{{業種}}", label: "業種" },
  { token: "{{所在地}}", label: "所在地" },
  { token: "{{メモ}}", label: "企業メモ" },
];

function SaveButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium px-4 py-2 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      {pending ? "保存中..." : isEdit ? "更新する" : "テンプレートを作成"}
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

export type EmailTemplate = {
  id: string;
  name: string;
  category: string | null;
  subject: string;
  body: string;
};

// existingがあれば編集フォーム、無ければ新規作成フォームとして動く。
export default function TemplateForm({ existing }: { existing?: EmailTemplate }) {
  const isEdit = Boolean(existing);
  const [state, formAction] = useFormState(saveTemplate, initialState);
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // 新規作成フォームは、保存成功後に入力欄をクリアして続けて次のテンプレートを作れるようにする。
  useEffect(() => {
    if (!isEdit && state.status === "success") {
      setName("");
      setCategory("");
      setSubject("");
      setBody("");
    }
  }, [state.status, isEdit]);

  const insertPlaceholder = (token: string) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  };

  return (
    <div className={isEdit ? "" : "glass-card-hero rounded-3xl p-6 sm:p-8"}>
      <form action={formAction} className="space-y-3">
        {existing && <input type="hidden" name="id" value={existing.id} />}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="テンプレート名(例:初回営業_IT業界向け)"
            className="flex-1 text-sm font-medium bg-white/70 border border-black/[0.08] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-300"
          />
          <input
            type="text"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="用途タグ(任意・例:初回営業)"
            className="sm:w-56 text-sm bg-white/70 border border-black/[0.08] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-300"
          />
        </div>
        <input
          type="text"
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="件名"
          className="w-full text-sm bg-white/70 border border-black/[0.06] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-300"
        />
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="text-[11px] text-zinc-400">差し込み項目:</span>
            {PLACEHOLDER_LEGEND.map((p) => (
              <button
                key={p.token}
                type="button"
                onClick={() => insertPlaceholder(p.token)}
                className="text-[11px] px-2 py-1 rounded-full bg-black/[0.04] border border-black/10 text-violet-700 hover:bg-black/[0.07]"
              >
                {p.token}
              </button>
            ))}
          </div>
          <textarea
            ref={bodyRef}
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            placeholder={"例:{{会社名}} ご担当者様\n\nはじめまして。{{業種}}の貴社にご興味を持ちご連絡しました。"}
            className="w-full text-sm text-zinc-700 bg-white/70 border border-black/[0.06] rounded-2xl p-4 leading-relaxed resize-none focus:outline-none focus:border-violet-300"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <SaveButton isEdit={isEdit} />
          {state.status === "error" && <p className="text-xs text-red-600">{state.message}</p>}
          {state.status === "success" && <p className="text-xs text-emerald-600">✓ {state.message}</p>}
        </div>
      </form>
      {existing && (
        <form action={deleteTemplate} className="mt-2 text-right">
          <input type="hidden" name="id" value={existing.id} />
          <DeleteButton />
        </form>
      )}
    </div>
  );
}
