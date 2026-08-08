"use client";

import { Info } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Dialog } from "@/components/ui/dialog";

export function PageInfoButton({ title, description }: { title: string; description: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={`${title}の説明を表示`}
        className="grid size-8 shrink-0 self-center place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen(true)}
      >
        <Info aria-hidden="true" className="size-5" />
      </button>
      <Dialog open={open} title={`${title}について`} onClose={() => setOpen(false)}>
        <p className="leading-7 text-muted-foreground [overflow-wrap:anywhere]">{description}</p>
      </Dialog>
    </>
  );
}

/**
 * ページの見出し。操作はすべてタイトルと説明の下へ並べる。横に置くと、長い番組名で
 * 押し出されたり、画面幅によって位置が変わって探すことになる。
 */
export function PageHeader({
  title,
  description,
  titleActions,
  subActions,
  actions,
}: {
  /** 使わなくなった小見出し。既存の呼び出しを壊さないために受けるだけ。 */
  eyebrow?: string;
  title: string;
  description: string;
  /** 主な操作。並びは subActions より先。 */
  titleActions?: ReactNode;
  subActions?: ReactNode;
  actions?: ReactNode;
}) {
  const hasActions = titleActions !== undefined || subActions !== undefined || actions !== undefined;

  return (
    <header className="mb-8 min-w-0">
      <h1 className="flex min-w-0 items-center gap-2 text-[2rem] leading-[1.1] font-bold tracking-tight text-balance [overflow-wrap:anywhere] sm:text-[2.6rem]">
        <span className="min-w-0">{title}</span>
        <PageInfoButton title={title} description={description} />
      </h1>
      {hasActions ? (
        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
          {titleActions}
          {subActions}
          {actions}
        </div>
      ) : null}
    </header>
  );
}
