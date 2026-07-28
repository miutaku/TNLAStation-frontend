import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ErrorState({
  title = "データを取得できませんでした",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Alert role="alert" className="border-destructive/30 bg-destructive/5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <AlertCircle aria-hidden="true" className="size-6 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description ?? "サーバーとの接続と設定を確認してください。"}</AlertDescription>
        </div>
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            再試行
          </Button>
        ) : null}
      </div>
    </Alert>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div role="status" className="glass-panel rounded-2xl border-dashed px-6 py-12 text-center">
      <Inbox aria-hidden="true" className="mx-auto size-9 text-muted-foreground/70" strokeWidth={1.5} />
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ContentSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="読み込み中" className="space-y-4">
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="glass-panel rounded-2xl p-5">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="mt-3 h-4 w-4/5" />
          <Skeleton className="mt-2 h-4 w-3/5" />
        </div>
      ))}
    </div>
  );
}
