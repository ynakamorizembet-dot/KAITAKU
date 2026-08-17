import EmptyState from "@/components/EmptyState";
import { IconPhone, IconSparkle } from "@/components/Icons";

const TRIAL_FREE_SMS = 10;
const sentDuringTrial = 0;

const sampleCampaign = `【〇〇からのお知らせ】
いつもご利用ありがとうございます。
期間限定キャンペーンのご案内です。

(AIが配信目的に合わせてここに文面を自動生成します)

詳しくはこちら:https://example.com
配信停止をご希望の方はご返信ください。`;

export default function SmsPage() {
  return (
    <main className="min-h-screen px-6 sm:px-10 py-12 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8 animate-fade-in-up">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-violet-500 uppercase">
            SMS Campaign
          </p>
          <h1 className="text-2xl font-bold mt-1 text-zinc-900">SMS配信</h1>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full glass-card text-violet-700 self-start sm:self-auto">
          同意済みの連絡先のみ
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
              個人のお客様向けに、キャンペーンやお知らせをSMSで一斉配信できます
            </h2>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
              「企業リスト・メール送信」が法人への1件ずつの営業なのに対し、こちらは同意済みの個人連絡先への1対多のお知らせ配信です。用途に応じて使い分けられます。
            </p>
          </div>
        </div>
      </section>

      {/* 文面プレビュー */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 mb-6 animate-fade-in-up" style={{ animationDelay: "130ms" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <IconSparkle className="w-4 h-4 text-violet-500" />
            配信文面プレビュー(サンプル)
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
          value={sampleCampaign}
          rows={7}
          className="w-full text-sm text-zinc-600 bg-white/70 border border-black/[0.06] rounded-2xl p-4 leading-relaxed resize-none focus:outline-none"
        />
      </section>

      {/* 料金の考え方 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-[11px] text-zinc-500">トライアル中の無料枠</p>
          <p className="text-sm font-medium mt-1 text-zinc-700">{sentDuringTrial}/{TRIAL_FREE_SMS}通(月10通まで無料)</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-[11px] text-zinc-500">超過分の料金</p>
          <p className="text-sm font-medium mt-1 text-zinc-700">11通目以降 1通¥20</p>
        </div>
      </section>

      <section className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <EmptyState
          icon={<IconPhone className="w-7 h-7" />}
          title="配信先の連絡先がまだありません"
          description="SMSは、送信への同意が確認できた連絡先のみ登録できます。同意なしの一斉送信機能は法令上実装しません。"
          actionLabel="連絡先を登録する(準備中)"
        />
      </section>

      <footer className="mt-8 text-xs text-zinc-400 leading-relaxed">
        SMS送信は運営契約のSMS APIサービス経由で行われます(送信元の電話番号はユーザー個人の番号ではありません)。
      </footer>
    </main>
  );
}
