import { IconClipboard } from "@/components/Icons";

const managedFields = [
  { label: "顧客名 / 会社名" },
  { label: "プラン種別(トライアル/月額/年間)" },
  { label: "トライアル終了日" },
  { label: "契約更新日" },
  { label: "ステータス(有効/期限切れ/解約)" },
];

const summary = [
  { label: "契約中の顧客数", value: "0" },
  { label: "トライアル中", value: "0" },
  { label: "7日以内に終了予定", value: "0" },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen px-6 sm:px-10 py-12 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8 animate-fade-in-up">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-violet-500 uppercase">
            Admin
          </p>
          <h1 className="text-2xl font-bold mt-1 text-zinc-900">契約管理</h1>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 self-start sm:self-auto">
          管理画面
        </span>
      </header>

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
              トライアル終了・契約更新が近い顧客を、ここで一覧して見逃さないようにします
            </h2>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
              各テナントが見る画面とは別に、運営者が全顧客を横断して確認できる画面です。将来的には期限が近い顧客への自動アラートも検討します。
            </p>
          </div>
        </div>
      </section>

      {/* サマリ */}
      <section className="grid grid-cols-3 gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: "130ms" }}>
        {summary.map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            <p className="text-[11px] text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      {/* 管理する項目のプレビュー */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 mb-10 animate-fade-in-up" style={{ animationDelay: "170ms" }}>
        <p className="text-sm font-semibold text-zinc-700 mb-4">顧客ごとに管理する項目</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {managedFields.map((f) => (
            <div key={f.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/[0.03] text-sm text-zinc-600">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
              {f.label}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-400 mt-4">
          基本プランは年間契約¥60,000(月払いの場合は¥6,000/月)。認証・DB実装後、契約者データと連動して自動集計されます。
        </p>
      </section>

      <section className="glass-card rounded-3xl p-12 flex flex-col items-center text-center animate-fade-in-up" style={{ animationDelay: "210ms" }}>
        <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center text-violet-500 mb-5">
          <IconClipboard className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900">まだ契約中の顧客がいません</h3>
        <p className="text-sm text-zinc-500 mt-2 max-w-sm leading-relaxed">
          販売開始後、ここに顧客ごとのプラン・トライアル終了日・契約更新日が一覧表示されます。
        </p>
      </section>
    </main>
  );
}
