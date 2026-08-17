import CountUp from "@/components/CountUp";
import FlowSteps from "@/components/FlowSteps";

const setupSteps = [
  {
    title: "企業を登録する",
    description: "まずは手動で1社入力するだけで始められます。Googleマップからの自動収集(APIキーが必要)は、あとからいつでも追加設定できます。",
    done: false,
    actions: ["手動で追加(すぐ使える)", "Googleマップから自動収集"],
  },
  {
    title: "AI生成サービスを接続",
    description: "使っているAIサービスを選ぶだけで、キーの貼り付け先まで案内します。営業メール・SMS文面の自動生成に使用します。",
    done: false,
    actions: ["Geminiを接続", "GPTを接続", "Claudeを接続"],
  },
  {
    title: "送信用メールアカウントを連携",
    description: "Gmail または Outlook をOAuth連携すると、そのアカウントから送信できます。",
    done: false,
  },
];

const secondaryStats = [
  { label: "登録企業数", value: 0 },
  { label: "送信済み", value: 0 },
  { label: "開封済み", value: 0 },
  { label: "返信率", value: 0, suffix: "%" },
];

const TRIAL_SEND_LIMIT = 50;
const sentDuringTrial = 0;

export default function DashboardPage() {
  const doneCount = setupSteps.filter((s) => s.done).length;
  const remaining = setupSteps.length - doneCount;
  const trialUsageRate = Math.round((sentDuringTrial / TRIAL_SEND_LIMIT) * 100);
  const headline =
    remaining === 0
      ? "今日も自動で営業を進めましょう"
      : `あと${remaining}ステップで使い始められます`;

  return (
    <main className="min-h-screen px-6 sm:px-10 py-12 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8 animate-fade-in-up">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-violet-500 uppercase">
            AI Sales Automation
          </p>
          <h1 className="text-2xl font-bold mt-1 text-zinc-900">{headline}</h1>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full glass-card text-violet-700 self-start sm:self-auto">
          14日間無料トライアル中
        </span>
      </header>

      {/* はじめての方向け:全体の流れ */}
      <p className="text-xs text-zinc-500 mb-2 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
        はじめての方へ:このアプリは次の流れで営業を自動化します
      </p>
      <div className="animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <FlowSteps />
      </div>

      {/* AIネイティブ:今週の最重要インサイト(プログレッシブ・ディスクロージャー) */}
      <section
        className="glass-card-hero rounded-3xl p-8 mb-6 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex items-start gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500 mt-2 pulse-glow flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-wide text-violet-600 uppercase mb-2">
              AIからの提案
            </p>
            <h2 className="text-xl font-semibold leading-snug text-zinc-900">
              初期設定を完了すると、企業収集からメール送信までを自動で提案し始めます
            </h2>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
              まずは下の3ステップを完了してください。完了後は、返信のあった企業を毎朝AIが優先順位付けしてここに表示します。
            </p>
          </div>
          <div className="text-3xl font-bold text-gradient flex-shrink-0">
            <CountUp value={doneCount} />
            <span className="text-zinc-400 text-lg">/{setupSteps.length}</span>
          </div>
        </div>
      </section>

      {/* セカンダリ指標(控えめに、進捗の裏付けとして) */}
      <section
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 animate-fade-in-up"
        style={{ animationDelay: "140ms" }}
      >
        {secondaryStats.map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">
              <CountUp value={s.value} />
              {s.suffix}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      {/* トライアル送信枠 */}
      <section className="glass-card rounded-2xl p-4 mb-10 animate-fade-in-up" style={{ animationDelay: "170ms" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500">トライアル送信枠(14日間)</p>
          <p className="text-xs font-medium text-zinc-700">
            <CountUp value={sentDuringTrial} duration={600} />/{TRIAL_SEND_LIMIT}通
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
            style={{ width: `${trialUsageRate}%` }}
          />
        </div>
        <p className="text-[11px] text-zinc-400 mt-2">
          上限に達すると、有料プランへのアップグレードが必要になります。
        </p>
      </section>

      {/* 初期設定 */}
      <section className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <h3 className="text-sm font-semibold text-zinc-500 mb-4 tracking-wide">
          はじめに:初期設定
        </h3>
        <div className="space-y-3">
          {setupSteps.map((step, i) => (
            <div key={step.title} className="glass-card rounded-2xl p-5 transition-colors hover:bg-white/[0.9]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center text-xs text-zinc-500 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-zinc-900">{step.title}</p>
                    <p className="text-zinc-500 text-xs mt-1">{step.description}</p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full border border-black/10 text-zinc-500 whitespace-nowrap">
                  未設定
                </span>
              </div>

              {step.actions && (
                <div className="flex flex-wrap gap-2 mt-4 ml-11">
                  {step.actions.map((a, idx) => (
                    <button
                      key={a}
                      type="button"
                      disabled
                      className={`text-xs px-3.5 py-1.5 rounded-full cursor-not-allowed ${
                        idx === 0
                          ? "bg-violet-600/10 border border-violet-300 text-violet-700"
                          : "bg-black/[0.04] border border-black/10 text-zinc-600"
                      }`}
                      title="準備中"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-12 text-xs text-zinc-400 leading-relaxed">
        SMS送信機能は、送信対象者の同意が確認できたご連絡先のみ登録できます(準備中)。
      </footer>
    </main>
  );
}
