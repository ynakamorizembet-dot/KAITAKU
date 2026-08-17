"use client";

import { useRef, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addCompany, type AddCompanyState } from "./actions";

const initialState: AddCompanyState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm px-5 py-2.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      {pending ? "追加中..." : "企業を追加"}
    </button>
  );
}

export default function AddCompanyForm() {
  const [state, formAction] = useFormState(addCompany, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <div className="glass-card rounded-2xl p-5 mb-6">
      <p className="text-sm font-semibold text-zinc-700 mb-3">企業を手動で追加</p>
      <form ref={formRef} action={formAction} className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_2fr_auto] gap-2 items-start">
        <input
          name="name"
          placeholder="会社名(必須)"
          required
          className="text-sm bg-white/70 border border-black/[0.08] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-violet-300"
        />
        <input
          name="industry"
          placeholder="業種(任意)"
          className="text-sm bg-white/70 border border-black/[0.08] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-violet-300"
        />
        <input
          name="address"
          placeholder="住所(任意)"
          className="text-sm bg-white/70 border border-black/[0.08] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-violet-300"
        />
        <SubmitButton />
      </form>
      {state.status === "error" && (
        <p className="text-xs text-red-600 mt-2">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-xs text-emerald-600 mt-2">追加しました。</p>
      )}
    </div>
  );
}
