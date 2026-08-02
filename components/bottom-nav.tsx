"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { GlassTabBar } from "@/components/glass-tab-bar";
import { isActivePath, secondaryNavigationFor } from "@/components/navigation";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { cn } from "@/lib/utils";

/**
 * 画面移動は親指の届く下端に置く。主要 4 画面はタブバーに、残りは同じく下から開く
 * 「その他」シートに入れるので、どの移動先にも上端へ手を伸ばさずに到達できる。
 */
export function BottomNav() {
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingSecondaryHref, setPendingSecondaryHref] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const { preferences } = usePreferences();
  const secondaryNavigation = useMemo(
    () => secondaryNavigationFor(preferences.bottomBarItems),
    [preferences.bottomBarItems],
  );

  // pathname が変わったレンダーは破棄して、楽観状態を消した値ですぐ再レンダーする。
  // effect で後から消すと、遷移先確定後にも1フレーム古い選択状態が見えてしまう。
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setPendingSecondaryHref(null);
  }

  useFocusTrap(sheetRef, sheetOpen, closeSheet);

  return (
    <>
      {sheetOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="メニューを閉じる"
            className="absolute inset-0 bg-black/40"
            onClick={closeSheet}
          />
          <div
            ref={sheetRef}
            id="navigation-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="そのほかの画面"
            className="glass-panel screen-enter absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+6rem)] rounded-3xl p-3"
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <h2 className="text-sm font-semibold">そのほかの画面</h2>
              <button
                type="button"
                aria-label="メニューを閉じる"
                onClick={closeSheet}
                className="press-spring grid size-10 place-items-center rounded-full hover:bg-secondary"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <nav aria-label="そのほかのナビゲーション" className="grid grid-cols-2 gap-1">
              {secondaryNavigation.map((item) => {
                const active = isActivePath(item.href, pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      setPendingSecondaryHref(item.href);
                      closeSheet();
                    }}
                    className={cn(
                      "press-spring flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium",
                      active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.9} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

      {/* この帯の外周 (左右の余白) はタブバーの丸みの外側にあたる透明な領域なので、
          pointer-events-none で下のコンテンツへクリックを通す。実際に操作できる
          ピル本体 (GlassTabBar) 側だけ pointer-events-auto で受け取り直す。 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 px-3 lg:hidden">
        <GlassTabBar
          moreOpen={sheetOpen}
          pendingSecondaryHref={pendingSecondaryHref}
          onOpenMore={() => setSheetOpen((open) => !open)}
          onNavigate={() => {
            setPendingSecondaryHref(null);
            closeSheet();
          }}
        />
      </div>
    </>
  );
}
