import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 自分自身のprofiles行のみ参照(RLSで他人の行は取得できない)。管理者判定に使う。
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <>
      <Sidebar userEmail={user?.email ?? null} isAdmin={isAdmin} />
      <div className="md:pl-60">{children}</div>
    </>
  );
}
