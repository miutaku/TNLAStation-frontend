"use client";

import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { usePortalContainer } from "@/lib/hooks/use-portal-container";
import { cn } from "@/lib/utils";

/** 画面の端に貼り付かないための余白。 */
const EDGE = 12;
/** 上に固定されるヘッダー (モバイルのみ)。この下から出す。 */
const HEADER = 56;
/** 下に固定されるボトムタブバー (モバイルのみ)。この上で止める。 */
const BOTTOM_NAV = 96;

interface Placement {
  left: number;
  top: number;
  maxHeight: number;
  width: number;
}

/**
 * ボタンに紐づくメニュー。カードや表の overflow に切られないよう画面直下へ出し、
 * ヘッダーとボトムタブバーを避けた範囲へ収める。開いている間は外側を触れなくする。
 */
export function AnchoredMenu({
  open,
  anchor,
  title,
  onClose,
  children,
  className,
  width = 288,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  /** 見出し。閉じるボタンと並べて出す。 */
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  width?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const portalContainer = usePortalContainer();

  useLayoutEffect(() => {
    if (!open || anchor === null) return;

    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      const top = desktop ? EDGE : HEADER + EDGE;
      const bottom = window.innerHeight - (desktop ? EDGE : BOTTOM_NAV);
      const panelWidth = Math.min(width, window.innerWidth - EDGE * 2);

      // 下に十分な高さが取れないときは上へ出す。どちらも足りなければ広いほうを使う。
      const below = bottom - (rect.bottom + 8);
      const above = rect.top - 8 - top;
      const openDown = below >= Math.min(240, above);
      const maxHeight = Math.max(140, openDown ? below : above);

      setPlacement({
        left: Math.min(Math.max(EDGE, rect.right - panelWidth), window.innerWidth - panelWidth - EDGE),
        top: openDown ? rect.bottom + 8 : Math.max(top, rect.top - 8 - maxHeight),
        maxHeight,
        width: panelWidth,
      });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, open, width]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open, placement]);

  if (!open || placement === null || portalContainer === null) return null;

  return createPortal(
    <>
      {/* 外側を押したら閉じる。開いている間は下の操作を受け付けない。 */}
      <div className="fixed inset-0 z-90" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "glass-panel fixed z-90 flex flex-col overflow-hidden rounded-xl border p-3 shadow-lg outline-none",
          className,
        )}
        style={{ left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.maxHeight }}
      >
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <button
            type="button"
            aria-label={`${title}を閉じる`}
            onClick={onClose}
            className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </>,
    portalContainer,
  );
}
