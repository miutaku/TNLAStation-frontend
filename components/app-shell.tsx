"use client";

import { Tv } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { isActivePath, navigation } from "@/components/navigation";
import { ToastProvider } from "@/components/ui/toast";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { cn } from "@/lib/utils";
import { isViewportLockedRoute } from "@/lib/viewport-lock";

function Brand() {
  return (
    <Link href="/" className="group flex items-center gap-2.5 px-2 py-1">
      <span className="grid size-9 place-items-center rounded-[0.65rem] bg-primary text-primary-foreground">
        <Tv aria-hidden="true" className="size-5" strokeWidth={2.2} />
      </span>
      <span className="block text-[1.05rem] font-semibold tracking-tight">TNLAStation</span>
    </Link>
  );
}

function SidebarLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="メインナビゲーション" className="space-y-0.5">
      {navigation.map((item) => {
        const active = isActivePath(item.href, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-[0.9375rem] font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon
              aria-hidden="true"
              className="size-[1.15rem] shrink-0"
              strokeWidth={active ? 2.4 : 2}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  const pathname = usePathname();

  // 番組表ページだけ main を viewport ぴったりの高さに縛り、fixed の BottomNav と
  // 重ならないようにする (判定は app/template.tsx と共有)。
  const lockViewport = isViewportLockedRoute(pathname);

  // Note: main を flex/overflow-hidden で縛っても、途中の段が高さ計算を誤ると
  // body/html にスクロールが漏れ出しうるため、根元の body 自体も直接縛る。
  useEffect(() => {
    document.body.classList.toggle("route-viewport-lock", lockViewport);
    return () => document.body.classList.remove("route-viewport-lock");
  }, [lockViewport]);

  // Note: Android の dvh はツールバー出入りで再計算がずれるため、visualViewport の
  // 実測値を --app-viewport-height として渡し、globals.css 側で優先させる。
  useEffect(() => {
    const updateViewportHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-viewport-height", `${height}px`);
    };
    updateViewportHeight();
    window.visualViewport?.addEventListener("resize", updateViewportHeight);
    window.addEventListener("resize", updateViewportHeight);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("resize", updateViewportHeight);
    };
  }, []);

  return (
    <ToastProvider>
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:translate-y-0"
      >
        本文へ移動
      </a>

      {/* 画面幅が広い環境は指を伸ばす距離が問題にならないため、一覧性の高い縦並びを残す。
          Apple Music のサイドバーと同じく、ほんのり透ける vibrancy 素材。 */}
      <aside className="chrome-surface fixed inset-y-0 left-0 z-30 hidden w-60 border-y-0 border-l-0 lg:block">
        <div className="flex h-full flex-col px-3 pt-4">
          <Brand />
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pb-4">
            <SidebarLinks />
          </div>
        </div>
      </aside>

      <div className={cn("min-w-0", "lg:pl-60", lockViewport && "flex h-full flex-col overflow-hidden")}>
        {preferences.isShowAppHeader ? (
          <header className="chrome-header sticky top-0 z-20 flex h-14 shrink-0 items-center px-4 lg:hidden">
            <Brand />
          </header>
        ) : null}

        <main
          id="main-content"
          className={cn(
            "mx-auto min-w-0 w-full max-w-[110rem]",
            lockViewport
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "min-h-screen px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:px-6 lg:px-10 lg:py-8",
          )}
        >
          {children}
        </main>
      </div>

      <BottomNav />
    </ToastProvider>
  );
}
