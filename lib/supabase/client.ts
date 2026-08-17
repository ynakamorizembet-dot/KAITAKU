// ブラウザ(Client Component)側で使うSupabaseクライアント。
// anonキーのみ使用。service_roleキーは絶対にここに置かない(ブラウザに露出するため)。
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
