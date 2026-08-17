import CountUp from "@/components/CountUp";
import { IconBuilding } from "@/components/Icons";
import { createClient } from "@/lib/supabase/server";
import AddCompanyForm from "./AddCompanyForm";

const collectFilters = [
  { label: "エリア", value: "未設定" },
  { label: "半径", value: "未設定" },
  { label: "業種", value: "未設定" },
  { label: "条件", value: "ホームページなし企業を優先" },
];

const statusStyles: Record<string, string> = {
  未接触: "bg-black/[0.04] border-black/10 text-zinc-500",
  送信済み: "bg-blue-50 border-blue-200 text-blue-700",
  開封済み: "bg-amber-50 border-amber-200 text-amber-700",
  返信あり: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

export default async function CompaniesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, industry, address, status, created_at")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  const list = companies ?? [];
  const stats = [
    { label: "登録企業数", value: list.length },
    { label: "送信済み", value: list.filter((c) => c.status !== "未接触").length },
    { label: "開封済み", value: list.filter((c) => c.status === "開封済み" || c.status === "返信あり").length },
    { label: "返信あり", value: list.filter((c) => c.status === "返信あり").length },
  ];

  return (
    <main className="min-h-screen px-6 sm:px-10 py-12 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8 animate-fade-in-up">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-violet-500 uppercase">
            Companies
          </p>
          <h1 className="text-2xl font-bold mt-1 text-zinc-900">企業リスト</h1>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full glass-card text-violet-700 self-start sm:self-auto">
          手動登録・自動収集どちらも対応
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
              まずは1社、手入力で追加するだけで始められます
            </h2>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
              エリア・業種を指定した自動収集(Googleマップ)は、APIキーの準備ができてからで大丈夫です。あとから設定すれば、その場で今のリストに合流します。
            </p>
          </div>
        </div>
      </section>

      {/* 手動追加フォーム(実際にDBへ保存されます) */}
      <div className="animate-fade-in-up" style={{ animationDelay: "110ms" }}>
        <AddCompanyForm />
      </div>

      {/* 収集条件プレビュー(任意設定・未実装) */}
      <p className="text-xs text-zinc-400 mb-2 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        自動収集の条件(任意・あとからでもOK・準備中)
      </p>
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: "130ms" }}>
        {collectFilters.map((f) => (
          <div key={f.label} className="glass-card rounded-2xl p-4">
            <p className="text-[11px] text-zinc-500">{f.label}</p>
            <p className="text-sm font-medium mt-1 text-zinc-700">{f.value}</p>
          </div>
        ))}
      </section>

      {/* セカンダリ指標 */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">
              <CountUp value={s.value} />
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      {/* 企業リスト本体 */}
      <section className="animate-fade-in-up" style={{ animationDelay: "230ms" }}>
        {list.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center text-violet-500 mb-5">
              <IconBuilding className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900">まだ企業が登録されていません</h3>
            <p className="text-sm text-zinc-500 mt-2 max-w-sm leading-relaxed">
              上のフォームから会社名を入力するだけで、すぐにリストに追加されます。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((c) => (
              <div
                key={c.id}
                className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{c.name}</p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {[c.industry, c.address].filter(Boolean).join(" ・ ") || "詳細未登録"}
                  </p>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${statusStyles[c.status] ?? statusStyles["未接触"]}`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
