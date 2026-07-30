import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { DEFAULT_ACCENT_HUE, PREFERENCES_STORAGE_KEY } from "@/lib/preferences";

import "./globals.css";

// React の初回コミット前 (useEffect の適用前) に --primary-hue を確定させ、既定の赤が
// 一瞬見えてから差し色へ切り替わるちらつきを防ぐ。<head> 内で同期実行される。
const noFlashAccentHueScript = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(PREFERENCES_STORAGE_KEY)}));var h=typeof p.accentHue==="number"&&Number.isFinite(p.accentHue)?((Math.round(p.accentHue)%360)+360)%360:${DEFAULT_ACCENT_HUE};document.documentElement.style.setProperty("--primary-hue",String(h))}catch(e){}})()`;

export const metadata: Metadata = {
  title: {
    default: "TNLAStation",
    template: "%s | TNLAStation",
  },
  description: "TNLAStation recording dashboard",
  applicationName: "TNLAStation",
  // iOS は Web App Manifest だけでは PWAを認識しない。
  // apple-mobile-web-app-* 系のメタタグが別途要る。
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TNLAStation",
  },
  // Note: appleWebApp.capable はこの Next.js バージョンだと mobile-web-app-capable
  // (無印) しか出力しない。iOS Safari は無印を見ないため apple- 接頭辞版が要る。
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
  // viewport-fit: cover がないと iOS では env(safe-area-inset-*) が常に 0 扱いになる。
  // ノッチ/ホームインジケーター分の余白 (ボトムバーの下パディング等) を効かせるために必須。
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashAccentHueScript }} />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
