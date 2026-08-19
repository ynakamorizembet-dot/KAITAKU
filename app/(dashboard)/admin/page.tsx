import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IconClipboard } from "@/components/Icons";

const managedFields = [
  { label: "顧客名 / 会社名" },
  { label: "担当者名 / 電話番号" },
  { label: "プラン種別(トライアル/月額/年間)" },
  { label: "トライアル終了日" },
  { label: "契約更新日" },
  { label: "ステータス(有効/期限切れ/解約)" },
];

const PLAN_LABEL: Record<string, string> = {
  trial: "トライアル",
  monthly: "月払い",
  annual: "年間契約",
};

const STATUS_LABEL: Record<string, string> = {
  trial: "トライアル中",
  active: "契約中",
  expired: "期限切れ",
  cancelled: "解約",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ja-JP");
}

export default async function AdminPage() {
  // 1. ログイン確認
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. 管理者判定(自分のprofiles行のみ参照。RLSで他人の行は読めない)
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!myProfile?.is_admin) {
    // 管理者でない場合はダッシュボードへ強制送還(直接URLアクセス対策)
    redirect("/");
  }

  // 3. 管理者のみ、service_roleで全顧客を横断取得(RLSを越えて全件参照する唯一の正当な経路)
  const adminClient = createAdminClient();
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("email, company_name, contact_name, phone_number, plan_type, trial_ends_at, contract_renews_at, status, created_at")
    .order("created_at", { ascending: false });

  const customers = profiles ?? [];
  const totalActive = customers.filter((p) => p.status === "active").length;
  const totalTrial = customers.filter((p) => p.status === "trial").length;
  const now = Date.now();
  const endingWithin7Days = customers.filter((p) => {
    if (!p.trial_ends_at) return false;
    const diff = new Date(p.trial_ends_at).getTime() - now;
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const summary = [
    { label: "契約中の顧客数", value: String(totalActive) },
    { label: "トライアル中", value: String(totalTrial) },
    { label: "7日以内に終了予定", value: String(endingWithin7Days) },
  ];

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
          基本プランは年間契約¥60,000(月払いの場合は¥6,000/月)。
        </p>
      </section>

      {customers.length === 0 ? (
        <section className="glass-card rounded-3xl p-12 flex flex-col items-center text-center animate-fade-in-up" style={{ animationDelay: "210ms" }}>
          <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center text-violet-500 mb-5">
            <IconClipboard className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900">まだ契約中の顧客がいません</h3>
          <p className="text-sm text-zinc-500 mt-2 max-w-sm leading-relaxed">
            販売開始後、ここに顧客ごとのプラン・トライアル終了日・契約更新日が一覧表示されます。
          </p>
        </section>
      ) : (
        <section className="glass-card rounded-3xl p-4 sm:p-6 overflow-x-auto animate-fade-in-up" style={{ animationDelay: "210ms" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-zinc-400 uppercase tracking-wide">
                <th className="px-3 py-2 font-medium">顧客</th>
                <th className="px-3 py-2 font-medium">連絡先</th>
                <th className="px-3 py-2 font-medium">プラン</th>
                <th className="px-3 py-2 font-medium">ステータス</th>
                <th className="px-3 py-2 font-medium">トライアル終了</th>
                <th className="px-3 py-2 font-medium">契約更新日</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.email} className="border-t border-black/[0.05]">
                  <td className="px-3 py-3">
                    <p className="text-zinc-900 font-medium">{c.company_name || "—"}</p>
                    <p className="text-[11px] text-zinc-400">{c.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-zinc-700">{c.contact_name || "—"}</p>
                    <p className="text-[11px] text-zinc-400">{c.phone_number || "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-zinc-600">{PLAN_LABEL[c.plan_type] ?? c.plan_type}</td>
                  <td className="px-3 py-3 text-zinc-600">{STATUS_LABEL[c.status] ?? c.status}</td>
                  <td className="px-3 py-3 text-zinc-600">{formatDate(c.trial_ends_at)}</td>
                  <td className="px-3 py-3 text-zinc-600">{formatDate(c.contract_renews_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
