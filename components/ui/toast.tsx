"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

/** 成功は自動で消す。失敗は読み終える前に消えると困るので長めに置く。 */
const LIFETIME_MS: Record<ToastTone, number> = { success: 4_000, error: 8_000 };

interface ToastApi {
  notify: (tone: ToastTone, message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * 操作の結果を右下から差し込む。画面上部の Alert だと、下の方を操作したときに
 * 結果が視界の外へ出てしまう。
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback((tone: ToastTone, message: string) => {
    const id = (nextId.current += 1);
    setToasts((current) => [...current, { id, tone, message }]);
    timers.current.set(id, window.setTimeout(() => dismiss(id), LIFETIME_MS[tone]));
  }, [dismiss]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext value={api}>
      {children}
      {/* 読み上げは polite。操作の結果であって、割り込んで読ませるほどではない。 */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-100 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "glass-panel pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg",
              "motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:fade-in",
              toast.tone === "error" ? "border-destructive/45" : "border-emerald-500/45",
            )}
          >
            {toast.tone === "error"
              ? <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
              : <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-500" />}
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{toast.message}</span>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="通知を閉じる"
              onClick={() => dismiss(toast.id)}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) throw new Error("useToast must be used inside ToastProvider");
  return api;
}
