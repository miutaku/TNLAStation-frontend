import type { ReactNode } from "react";

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
      <h1 className="min-w-0 text-[2rem] leading-[1.1] font-bold tracking-tight text-balance [overflow-wrap:anywhere] sm:text-[2.6rem]">
        {title}
      </h1>
      <p className="mt-2.5 min-w-0 max-w-2xl text-[0.95rem] leading-6 text-muted-foreground [overflow-wrap:anywhere] sm:text-base">
        {description}
      </p>
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
