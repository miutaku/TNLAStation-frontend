"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-16 max-w-xl rounded-xl border border-destructive/35 bg-destructive/5 p-6 text-center">
      <AlertTriangle aria-hidden="true" className="mx-auto size-8 text-destructive" />
      <h1 className="mt-4 text-xl font-bold">画面を表示できませんでした</h1>
      <p className="mt-2 text-sm text-muted-foreground">一時的な問題の可能性があります。もう一度お試しください。</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        再試行
      </button>
    </div>
  );
}
