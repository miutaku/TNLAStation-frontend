"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * 汎用モーダル。ConfirmDialog と同じ背景・フォーカストラップの作法をそろえ、
 * 中身だけ差し替えられるようにしたもの。番組の予約メニューや視聴選択で使う。
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  labelledBy,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** 見出しに独自 id を割り当てたいとき (未指定なら内部 id を使う)。 */
  labelledBy?: string;
}) {
  const fallbackTitleId = useId();
  const titleId = labelledBy ?? fallbackTitleId;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // preventScroll を付けないと、開いた瞬間にブラウザがフォーカス先を見せようとして
    // 背後の番組表などがスクロールし、ページが動いて見える。
    panelRef.current?.querySelector<HTMLElement>("button:not([disabled]), [href], input:not([disabled])")?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  // ガラス面 (backdrop-filter) などが包含ブロックを作ると position:fixed の基準がずれ、
  // ダイアログがビューポート中央ではなくページ中央に出てしまう。body へ portal して回避する。
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <button type="button" aria-label="閉じる" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Note: 下端はモバイルの BottomNav (h-[4.5rem] + bottom オフセット) と
        // 重ならない位置を目安に止める。100vh はモバイルでアドレスバーの出入りにより
        // 実際に見えている高さとずれるため、app-shell.tsx が書き込む visualViewport
        // 由来の --app-viewport-height を優先する。
        className="glass-panel relative flex min-w-0 max-h-[calc(var(--app-viewport-height,100dvh)-env(safe-area-inset-bottom)-6.25rem)] w-full max-w-lg flex-col rounded-2xl [overflow-wrap:anywhere] lg:max-h-[calc(var(--app-viewport-height,100vh)-2rem)]"
      >
        <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
          <h2 id={titleId} className="min-w-0 text-lg font-bold leading-7 [overflow-wrap:anywhere]">{title}</h2>
          <button type="button" aria-label="閉じる" className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={onClose}>
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
        {footer ? <div className="flex flex-col-reverse gap-2 border-t p-5 landscape:flex-row sm:flex-row sm:justify-end sm:p-6">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
