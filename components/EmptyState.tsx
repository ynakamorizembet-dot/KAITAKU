import { ReactNode } from "react";
import { IconInbox } from "./Icons";

export default function EmptyState({
  title,
  description,
  actionLabel,
  secondaryActionLabel,
  icon,
}: {
  title: string;
  description: string;
  actionLabel: string;
  secondaryActionLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="glass-card rounded-3xl p-12 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center text-violet-500 mb-5">
        {icon ?? <IconInbox />}
      </div>
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="text-sm text-zinc-500 mt-2 max-w-sm leading-relaxed">{description}</p>
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        <button
          type="button"
          disabled
          className="text-sm px-5 py-2.5 rounded-full bg-violet-600/10 border border-violet-300 text-violet-700 cursor-not-allowed"
          title="MVP開発中のため準備中です"
        >
          {actionLabel}
        </button>
        {secondaryActionLabel && (
          <button
            type="button"
            disabled
            className="text-sm px-5 py-2.5 rounded-full bg-black/[0.04] border border-black/10 text-zinc-500 cursor-not-allowed"
            title="MVP開発中のため準備中です"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
