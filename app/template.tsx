"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isViewportLockedRoute } from "@/lib/viewport-lock";
import { cn } from "@/lib/utils";

/**
 * route ごとに作り直される枠。layout ではなく template なのは、入場アニメーションを
 * route 遷移のたびに再生させるため (layout だと初回しか動かない)。
 * Note: 番組表ページでは AppShell の flex 列にこの div も参加させ、高さの連鎖を保つ。
 */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const locked = isViewportLockedRoute(pathname);

  return (
    <div className={cn("screen-enter", locked && "flex min-h-0 flex-1 flex-col overflow-hidden")}>{children}</div>
  );
}
