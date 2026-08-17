import CountUp from "@/components/CountUp";
import EmptyState from "@/components/EmptyState";
import { IconChat } from "@/components/Icons";

const replyStats = [
  { label: "未読の返信", value: 0 },
  { label: "商談化", value: 0 },
  { label: "返信率", value: 0, suffix: "%" },
];

export default function RepliesPage() {
  return (
    <main className="min-h-screen px-6 sm:px-10 py-12 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8 animate-fade-in-up">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-violet-500 uppercase">
            Replies
          </p>
          <h1 className="text-2xl font-bold mt-1 text-zinc-900">返信管理</h1>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full glass-card text-violet-700 self-start sm:self-auto">
          AIが優先度を自動判定
        </span>
      </header>

      {/* AIからの提案 */}
      <section
        className="glass-card-hero rounded-3xl p-8 mb-6 animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-start gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500 mt-2 pulse-glow flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-wide text-violet-600 uppercase mb-2">
              AIからの提案
            </p>
            <h2 className="text-xl font-semibold leading-snug text-zinc-900">
              返信が届くと、AIが「興味あり・断り・要フォロー」を自動で分類して並び替えます
            </h2>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
              最も反応の良い企業を毎朝ここに優先表示するので、確認する順番に迷いません。
            </p>
          </div>
        </div>
      </section>

      {/* セカンダリ指標 */}
      <section className="grid grid-cols-3 gap-3 mb-10 animate-fade-in-up" style={{ animationDelay: "140ms" }}>
        {replyStats.map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">
              <CountUp value={s.value} />
              {s.suffix}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <EmptyState
          icon={<IconChat className="w-7 h-7" />}
          title="まだ返信はありません"
          description="メールを送信すると、届いた返信がここに自動で集約され、AIが対応の優先順位を提案します。"
          actionLabel="メール送信へ移動(準備中)"
        />
      </section>
    </main>
  );
}
