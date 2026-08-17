import EmptyState from "@/components/EmptyState";
import { IconMail, IconSparkle } from "@/components/Icons";

const TRIAL_SEND_LIMIT = 50;
const sentDuringTrial = 0;

const sampleDraft = `〇〇株式会社
ご担当者様

はじめまして、△△と申します。
貴社のホームページを拝見し、〜〜という点に大変魅力を感じてご連絡いたしました。

(AIが企業の情報をもとに、ここに文面を自動生成します)

ご興味があれば、一度お話しできればと思います。
どうぞよろしくお願いいたします。`;

export default function SendPage() {
  return (
    <main className="min-h-screen px-6 sm:px-10 py-12 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8 animate-fade-in-up">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-violet-500 uppercase">
            Send
          </p>
          <h1 className="text-2xl font-bold mt-1 text-zinc-900">メール送信</h1>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full glass-card text-violet-700 self-start sm:self-auto">
          送信前に必ず本人確認あり
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
              企業を選ぶと、AIが企業の特徴に合わせた営業メールを自動で下書きします
            </h2>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
              下書きはAI任せにせず、その場で自由に書き換えられます。送信は連携したご自身のメールアカウント(Gmail / Outlook)から行われ、誤送信防止のため必ず内容確認の画面を挟みます。
            </p>
          </div>
        </div>
      </section>

      {/* 文面作成の流れ + サンプル下書き(AI生成 → 手動編集 → 送信) */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 mb-6 animate-fade-in-up" style={{ animationDelay: "130ms" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <IconSparkle className="w-4 h-4 text-violet-500" />
            文面プレビュー(サンプル)
          </p>
          <div className="flex gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full bg-black/[0.04] border border-black/10 text-zinc-500">
              AIで生成
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-black/[0.04] border border-black/10 text-zinc-500">
              自分で書く
            </span>
          </div>
        </div>
        <textarea
          readOnly
          value={sampleDraft}
          rows={9}
          className="w-full text-sm text-zinc-600 bg-white/70 border border-black/[0.06] rounded-2xl p-4 leading-relaxed resize-none focus:outline-none"
        />
        <p className="text-[11px] text-zinc-400 mt-2">
          ※実データ接続後は、この欄をそのまま編集して送信できます(全文を自分で書き直すことも可能です)。
        </p>
      </section>

      {/* トライアル送信枠 */}
      <section className="glass-card rounded-2xl p-4 mb-10 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500">トライアル送信枠(14日間)</p>
          <p className="text-xs font-medium text-zinc-700">{sentDuringTrial}/{TRIAL_SEND_LIMIT}通</p>
        </div>
        <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
            style={{ width: `${Math.round((sentDuringTrial / TRIAL_SEND_LIMIT) * 100)}%` }}
          />
        </div>
      </section>

      <section className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <EmptyState
          icon={<IconMail className="w-7 h-7" />}
          title="送信対象の企業がまだありません"
          description="先に「企業リスト」で企業を登録してください(手動追加ですぐに始められます)。企業が登録されると、ここでAI下書きの生成・編集・送信ができるようになります。"
          actionLabel="企業リストへ移動(準備中)"
        />
      </section>

      <footer className="mt-8 text-xs text-zinc-400 leading-relaxed space-y-1">
        <p>メールアカウントは運営側で保有せず、ユーザーご自身のアカウントをOAuth連携して送信します。</p>
        <p>開封トラッキングは、メールに埋め込む開封確認用の目印で判定します。仕組み上、メールソフトの画像読み込み設定によっては実際に開封されても「未開封」と表示される場合があります(100%正確な計測ではありません)。</p>
      </footer>
    </main>
  );
}
