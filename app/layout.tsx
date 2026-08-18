import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAITAKU | ダッシュボード",
  description: "企業自動収集からAI営業メール、SMS配信、返信管理までを一気通貫で行う営業・マーケティング自動化SaaS「KAITAKU」",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
