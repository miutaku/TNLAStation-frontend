"use client";

import { MoreHorizontal } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { isActivePath, primaryNavigationFor, secondaryNavigationFor } from "@/components/navigation";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { cn } from "@/lib/utils";

const MORE_ID = "__more__";

export function resolveActiveBottomTab({
  pathname,
  primaryHrefs,
  secondaryHrefs,
  moreOpen,
  pendingSecondaryHref,
}: {
  pathname: string;
  primaryHrefs: readonly string[];
  secondaryHrefs: readonly string[];
  moreOpen: boolean;
  pendingSecondaryHref: string | null;
}): string {
  if (moreOpen || pendingSecondaryHref !== null || secondaryHrefs.some((href) => isActivePath(href, pathname))) {
    return MORE_ID;
  }
  return primaryHrefs.find((href) => isActivePath(href, pathname)) ?? "/";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function parseTranslateX(transform: string): number | null {
  if (!transform || transform === "none") return null;
  try {
    return new DOMMatrixReadOnly(transform).m41;
  } catch {
    return null;
  }
}

function readCurrentTranslateX(element: HTMLElement): number | null {
  return parseTranslateX(getComputedStyle(element).transform);
}

const INDICATOR_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const INDICATOR_DURATION_MS = 240;
const SQUASH_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const SQUASH_DURATION_MS = 260;

export function GlassTabBar({
  moreOpen,
  pendingSecondaryHref,
  onOpenMore,
  onNavigate,
}: {
  moreOpen: boolean;
  pendingSecondaryHref: string | null;
  onOpenMore: () => void;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { preferences } = usePreferences();
  const primaryNavigation = useMemo(
    () => primaryNavigationFor(preferences.bottomBarItems),
    [preferences.bottomBarItems],
  );
  const secondaryNavigation = useMemo(
    () => secondaryNavigationFor(preferences.bottomBarItems),
    [preferences.bottomBarItems],
  );

  const items = useMemo(
    () => [
      ...primaryNavigation.map((item) => ({ id: item.href, label: item.label, icon: item.icon })),
      { id: MORE_ID, label: "その他", icon: MoreHorizontal },
    ],
    [primaryNavigation],
  );

  const active = resolveActiveBottomTab({
    pathname,
    primaryHrefs: primaryNavigation.map((item) => item.href),
    secondaryHrefs: secondaryNavigation.map((item) => item.href),
    moreOpen,
    pendingSecondaryHref,
  });

  const glassRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const indicatorAnimationRef = useRef<Animation | null>(null);
  const isFirstLayoutRef = useRef(true);
  const prevActiveRef = useRef<string | null>(null);
  const optimisticNavRef = useRef<string | null>(null);
  const lastHandledActiveRef = useRef<string | null>(null);
  const lastXRef = useRef(0);
  const lastTransformRef = useRef("translate3d(0px, -50%, 0) scaleX(1)");
  const suppressNextClickRef = useRef(false);

  const measureButton = useCallback((button: HTMLElement, container: HTMLElement) => {
    const buttonRect = button.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      x: buttonRect.left - containerRect.left,
      width: buttonRect.width,
      height: buttonRect.height,
    };
  }, []);

  /**
   * インジケーターを targetId のボタンへ transform のみで動かす (reflow なし)。
   * animate=true では進行方向へ伸び、着地前に少し行き過ぎてから収まる。
   */
  const layoutIndicator = useCallback(
    (animate: boolean, targetId: string = active) => {
      const indicator = indicatorRef.current;
      const container = glassRef.current;
      const button = buttonRefs.current.get(targetId);
      if (!indicator || !container || !button) return;

      const geometry = measureButton(button, container);
      indicator.style.width = `${geometry.width}px`;
      indicator.style.height = `${geometry.height}px`;
      const targetTransform = `translate3d(${geometry.x}px, -50%, 0) scaleX(1)`;

      const runningAnimation = indicatorAnimationRef.current;
      let fromX = lastXRef.current;
      if (runningAnimation) {
        const currentX = readCurrentTranslateX(indicator);
        if (currentX !== null) {
          fromX = currentX;
          indicator.style.transform = `translate3d(${currentX}px, -50%, 0) scaleX(1)`;
        }
        runningAnimation.cancel();
        indicatorAnimationRef.current = null;
      }

      if (!animate || isFirstLayoutRef.current || prefersReducedMotion()) {
        indicator.style.transform = targetTransform;
        indicator.classList.add("glass-tabbar-indicator-visible");
        isFirstLayoutRef.current = false;
        lastXRef.current = geometry.x;
        lastTransformRef.current = targetTransform;
        return;
      }

      const distance = geometry.x - fromX;
      const stretch = Math.min(1 + (Math.abs(distance) / Math.max(geometry.width, 1)) * 0.6, 1.6);
      const direction = distance === 0 ? 0 : Math.sign(distance);
      const overshoot = direction * Math.min(Math.abs(distance) * 0.06, 6);

      const animation = indicator.animate(
        [
          { transform: `translate3d(${fromX}px, -50%, 0) scaleX(1)`, offset: 0 },
          { transform: `translate3d(${fromX + distance * 0.5}px, -50%, 0) scaleX(${stretch})`, offset: 0.45 },
          { transform: `translate3d(${geometry.x + overshoot}px, -50%, 0) scaleX(1.04)`, offset: 0.8 },
          { transform: targetTransform, offset: 1 },
        ],
        { duration: INDICATOR_DURATION_MS, easing: INDICATOR_EASING, fill: "forwards" },
      );
      indicatorAnimationRef.current = animation;
      indicator.classList.add("glass-tabbar-indicator-visible");
      animation.onfinish = () => {
        // Guard: キャンセル済みアニメーションの onfinish が後発を上書きしないようにする。
        if (indicatorAnimationRef.current !== animation) return;
        indicator.style.transform = targetTransform;
        lastXRef.current = geometry.x;
        lastTransformRef.current = targetTransform;
        animation.cancel();
        indicatorAnimationRef.current = null;
      };
    },
    [active, measureButton],
  );

  const syncIdleTo = useCallback(
    (targetId: string) => {
      layoutIndicator(false, targetId);
    },
    [layoutIndicator],
  );

  const triggerAnimatingTransition = useCallback(
    (targetId: string, animate: boolean) => {
      if (!animate || prefersReducedMotion()) {
        syncIdleTo(targetId);
        return;
      }
      layoutIndicator(true, targetId);
    },
    [syncIdleTo, layoutIndicator],
  );

  // mount/resize から常に最新のクロージャーを呼べるよう ref 経由で公開する。
  const syncLayoutRef = useRef<() => void>(() => {});
  useEffect(() => {
    syncLayoutRef.current = () => syncIdleTo(active);
  });

  useLayoutEffect(() => {
    if (lastHandledActiveRef.current === active) return;

    // Guard: 「その他」シートを閉じる際、route 反映前に active が一瞬前のタブへ
    // 戻ることがある。楽観ナビの行き先が確定するまで無視する。
    const pendingTarget = optimisticNavRef.current;
    if (pendingTarget !== null && active !== pendingTarget) return;
    lastHandledActiveRef.current = active;

    const isPendingTargetConfirmed = pendingTarget === active;
    if (isPendingTargetConfirmed) {
      optimisticNavRef.current = null;
      prevActiveRef.current = active;
      return;
    }

    const shouldAnimate = prevActiveRef.current !== null && prevActiveRef.current !== active;
    if (shouldAnimate) triggerAnimatingTransition(active, true);
    else syncIdleTo(active);
    prevActiveRef.current = active;
  }, [active, items, triggerAnimatingTransition, syncIdleTo]);

  useEffect(() => {
    const handleResize = () => syncLayoutRef.current();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /**
   * 選択中タブの再タップでインジケーターを潰す。移動アニメーション中なら
   * 今の描画位置を読み取ってから再生し、別の位置へワープしないようにする。
   */
  const squashIndicator = useCallback(() => {
    const indicator = indicatorRef.current;
    if (!indicator || prefersReducedMotion()) return;

    const runningAnimation = indicatorAnimationRef.current;
    let base = lastTransformRef.current;
    let wasInterrupted = false;
    if (runningAnimation) {
      const currentX = readCurrentTranslateX(indicator);
      if (currentX !== null) {
        base = `translate3d(${currentX}px, -50%, 0) scaleX(1)`;
        indicator.style.transform = base;
      }
      runningAnimation.cancel();
      indicatorAnimationRef.current = null;
      wasInterrupted = true;
    }

    const animation = indicator.animate(
      [
        { transform: `${base} scaleY(1) scaleX(1)`, offset: 0 },
        { transform: `${base} scaleY(0.82) scaleX(1.06)`, offset: 0.45 },
        { transform: `${base} scaleY(1) scaleX(1)`, offset: 1 },
      ],
      { duration: SQUASH_DURATION_MS, easing: SQUASH_EASING },
    );
    indicatorAnimationRef.current = animation;
    animation.onfinish = () => {
      if (indicatorAnimationRef.current !== animation) return;
      indicator.style.transform = base;
      indicatorAnimationRef.current = null;
      if (wasInterrupted) layoutIndicator(false);
    };
  }, [layoutIndicator]);

  const setPointerPosition = useCallback((clientX: number, clientY: number) => {
    const indicator = indicatorRef.current;
    if (!indicator || prefersReducedMotion()) return;
    const rect = indicator.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    indicator.style.setProperty("--pointer-x", `${Math.min(Math.max(x, 0), 100)}%`);
    indicator.style.setProperty("--pointer-y", `${Math.min(Math.max(y, 0), 100)}%`);
  }, []);

  const resetPointerPosition = useCallback(() => {
    indicatorRef.current?.style.removeProperty("--pointer-x");
    indicatorRef.current?.style.removeProperty("--pointer-y");
  }, []);

  return (
    <div
      ref={glassRef}
      className={cn(
        "chrome-tabbar relative mx-auto flex h-[4.5rem] w-full max-w-[26rem] items-center justify-around rounded-full border border-border/50 px-2 shadow-[0_10px_28px_rgb(0_0_0_/_0.16)]",
      )}
    >
      {/* 常駐する選択ピル。layoutIndicator/squashIndicator が transform だけで動かす。 */}
      <span ref={indicatorRef} aria-hidden="true" className="glass-tabbar-indicator" />
      {items.map((item) => {
        const isSelected = active === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            ref={(el) => {
              if (el) buttonRefs.current.set(item.id, el);
              else buttonRefs.current.delete(item.id);
            }}
            type="button"
            aria-current={isSelected ? "page" : undefined}
            onPointerDown={(event) => {
              setPointerPosition(event.clientX, event.clientY);
              if (isSelected) squashIndicator();
            }}
            onPointerUp={() => {
              resetPointerPosition();
              if (item.id === MORE_ID || isSelected) return;
              suppressNextClickRef.current = true;
              optimisticNavRef.current = item.id;
              prevActiveRef.current = item.id;
              triggerAnimatingTransition(item.id, true);
              onNavigate();
              router.push(item.id);
            }}
            onPointerCancel={resetPointerPosition}
            onPointerLeave={resetPointerPosition}
            onClick={() => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                return;
              }
              // pointerdown/up を経由しない活性化 (キーボード操作など) はここだけを通る。
              if (item.id === MORE_ID) {
                onOpenMore();
                return;
              }
              onNavigate();
              router.push(item.id);
            }}
            className={cn(
              "press-spring relative z-10 flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-2 text-[10.5px] font-semibold transition-colors",
              isSelected ? "text-primary" : "text-tabbar-inactive hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-[22px]" strokeWidth={isSelected ? 2.4 : 2} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
