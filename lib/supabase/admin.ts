// service_roleキーを使う唯一の場所。RLSを無視できる強い権限を持つため、
// 【絶対厳守】このファイルはサーバー専用コード(Server Action / Route Handler / cron)からのみimportすること。
// 【絶対厳守】"use client"が付くファイルや、クライアントへ渡すpropsに、このモジュールの値を絶対に含めないこと。
// 前身aiman-oneでservice_roleキーがブラウザのlocalStorageに保存され、DB管理者権限がクライアントから
// 直接呼べてしまっていた重大なセキュリティ欠陥があった。これを繰り返さないための隔離。
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
