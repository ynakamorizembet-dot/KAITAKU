import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Supabaseのマジックリンクからのリダイレクト先。
// ?code= を受け取ってセッションを確立し、元々行きたかったページへ戻す。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
