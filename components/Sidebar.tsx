"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconBuilding, IconMail, IconPhone, IconChat, IconClipboard, IconKey, IconTemplate } from "./Icons";
import { signOut } from "@/app/auth/actions";

const navItems = [
  { href: "/", label: "ダッシュボード", hint: "全体の状況を見る", icon: IconHome },
  { href: "/companies", label: "企業リスト", hint: "法人リードを集める", icon: IconBuilding },
  { href: "/send", label: "メール送信", hint: "法人へ1件ずつ営業", icon: IconMail },
  { href: "/templates", label: "テンプレート", hint: "文面を用途別に使い回す", icon: IconTemplate },
  { href: "/sms", label: "SMS配信", hint: "個人へ一斉配信", icon: IconPhone },
  { href: "/replies", label: "返信管理", hint: "返信の優先度を確認", icon: IconChat },
  { href: "/settings", label: "APIキー連携", hint: "自動収集・AI生成の設定", icon: IconKey },
];

const adminItems = [
  { href: "/admin", label: "契約管理", hint: "顧客の契約状況を確認", icon: IconClipboard },
];

function NavLink({
  item,
  active,
}: {
  item: { href: string; label: string; hint: string; icon: typeof IconHome };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
        active
          ? "bg-black/[0.05] text-zinc-900 border border-black/10"
          : "text-zinc-500 hover:text-zinc-900 hover:bg-black/[0.03] border border-transparent"
      }`}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${active ? "text-violet-600" : "text-zinc-400"}`} />
      <span>
        <span className="block">{item.label}</span>
        <span className="block text-[10px] text-zinc-400 font-normal mt-0.5">{item.hint}</span>
      </span>
    </Link>
  );
}

export default function Sidebar({
  userEmail,
  isAdmin = false,
}: {
  userEmail?: string | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* デスクトップ:左固定サイドバー */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-60 md:flex-col md:z-20 border-r border-black/[0.06] bg-white/60 backdrop-blur-xl">
        <div className="px-6 py-7">
          <p className="text-sm font-bold text-gradient tracking-tight">KAITAKU</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Sales Automation</p>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}

          {/* 運営管理メニューは管理者(is_admin=true)のみに表示。一般顧客には出さない・アクセスもさせない */}
          {isAdmin && (
            <>
              <p className="px-3 pt-5 pb-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
                運営管理
              </p>
              {adminItems.map((item) => (
                <NavLink key={item.href} item={item} active={pathname === item.href} />
              ))}
            </>
          )}
        </nav>
        <div className="px-6 py-5">
          {userEmail && (
            <p className="text-[11px] text-zinc-500 truncate mb-1" title={userEmail}>
              {userEmail}
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-zinc-400">14日間無料トライアル中</p>
            {userEmail && (
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-[11px] text-zinc-400 hover:text-zinc-700 underline underline-offset-2"
                >
                  ログアウト
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>

      {/* モバイル:上部タブ */}
      <nav className="md:hidden sticky top-0 z-20 flex overflow-x-auto gap-1 px-3 py-2.5 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]">
        {[...navItems, ...(isAdmin ? adminItems : [])].map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                active ? "bg-black/[0.06] text-zinc-900" : "text-zinc-500"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
