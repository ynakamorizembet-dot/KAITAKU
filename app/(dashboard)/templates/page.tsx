import { createClient } from "@/lib/supabase/server";
import TemplateForm from "./TemplateForm";

export default async function TemplatesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: templates } = await supabase
    .from("email_templates")
    .select("id, name, category, subject, body")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const list = templates ?? [];

  return (
    <main className="min-h-screen px-6 sm:px-10 py-12 max-w-3xl mx-auto">
      <header className="mb-8 animate-fade-in-up">
        <p className="text-xs font-semibold tracking-[0.15em] text-violet-500 uppercase">Templates</p>
        <h1 className="text-2xl font-bold mt-1 text-zinc-900">メールテンプレート</h1>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
          業種・用途ごとにあらかじめ文面を用意しておくと、「メール送信」画面で企業を選ぶだけで
          {"{{会社名}}"}などが自動で差し込まれます。まずAIやChatGPTなどで下書きを作り、それをここに
          テンプレートとして登録して使い回す使い方もできます。
        </p>
      </header>

      <section className="mb-10 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <h2 className="text-sm font-semibold text-zinc-500 mb-3 tracking-wide">新規テンプレート</h2>
        <TemplateForm />
      </section>

      <section className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        <h2 className="text-sm font-semibold text-zinc-500 mb-3 tracking-wide">
          登録済みテンプレート({list.length})
        </h2>
        {list.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-zinc-500">
            テンプレートはまだありません。上のフォームから最初の1件を作成してください。
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((t: { id: string; name: string; category: string | null; subject: string; body: string }) => (
              <div key={t.id} className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-zinc-900">
                    {t.name}
                    {t.category && (
                      <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-black/[0.04] border border-black/10 text-zinc-500">
                        {t.category}
                      </span>
                    )}
                  </p>
                </div>
                <TemplateForm existing={t} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
