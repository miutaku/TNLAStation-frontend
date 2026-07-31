import type { ReactNode } from "react";

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
  titleActions?: ReactNode;
  /** タイトルと説明の下。操作が多いときはこちらへ置く。 */
  subActions?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 min-w-0 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-3xl flex-1">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <h1 className="min-w-0 flex-1 text-[2rem] leading-[1.1] font-bold tracking-tight text-balance [overflow-wrap:anywhere] sm:text-[2.6rem]">
            {title}
          </h1>
          {titleActions ? <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{titleActions}</div> : null}
        </div>
        <p className="mt-2.5 min-w-0 max-w-2xl text-[0.95rem] leading-6 text-muted-foreground [overflow-wrap:anywhere] sm:text-base">
          {description}
        </p>
        {subActions ? <div className="mt-4 flex max-w-full flex-wrap items-center gap-2">{subActions}</div> : null}
      </div>
      {actions ? <div className="flex max-w-full flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
    </header>
  );
}
