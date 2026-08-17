import Link from "next/link";
import { IconBuilding, IconSparkle, IconMail, IconChat, IconArrowRight } from "./Icons";

const steps = [
  { href: "/companies", label: "企業を集める", icon: IconBuilding },
  { href: "/send", label: "AIが文面を作る", icon: IconSparkle },
  { href: "/send", label: "送信する", icon: IconMail },
  { href: "/replies", label: "返信を管理する", icon: IconChat },
];

// はじめての人向けに「このアプリが何をするものか」を一目で伝えるための全体フロー表示
export default function FlowSteps() {
  return (
    <div className="glass-card rounded-2xl px-5 py-4 mb-6 flex items-center gap-1 overflow-x-auto">
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={`${s.href}-${s.label}`} className="flex items-center gap-1 flex-shrink-0">
            <Link
              href={s.href}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-black/[0.04] transition-colors"
            >
              <span className="w-6 h-6 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-medium text-zinc-600 whitespace-nowrap">{s.label}</span>
            </Link>
            {i < steps.length - 1 && (
              <IconArrowRight className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
