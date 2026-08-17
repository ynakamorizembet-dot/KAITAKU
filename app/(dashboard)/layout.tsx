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

  return (
    <>
      <Sidebar userEmail={user?.email ?? null} />
      <div className="md:pl-60">{children}</div>
    </>
  );
}
