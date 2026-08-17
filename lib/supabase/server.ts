// サーバー側(Server Component / Server Action / Route Handler)で使うSupabaseクライアント。
// こちらもanonキーのみ。ユーザーのセッションCookie経由でRLSが効く。
// service_roleキーが必要な管理operationは、専用のadmin.ts(サーバー専用・絶対にクライアントへ渡さない)側でのみ扱うこと。
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component からの呼び出しではCookie書き込みができない場合がある。
            // middleware側でセッションのリフレッシュを行うため、ここは無視してよい。
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // 上と同様、無視してよい。
          }
        },
      },
    }
  );
}
