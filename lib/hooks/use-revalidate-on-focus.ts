"use client";

import { useEffect, useRef } from "react";

/**
 * 画面へ戻ってきたときにだけ取り直す。
 *
 * 一定周期で取り直すと、入力中の値や開いたままの操作が、本人が何もしていないのに
 * 消える。EPGStation も周期では取り直さない。戻ってきた直後なら、まだ何もしていない
 * ので入れ替わっても困らない。
 */
export function useRevalidateOnFocus(
  resource: { loadedAt: number; isLoading: boolean; revalidate: () => void },
  staleMilliseconds = 30_000,
): void {
  const latest = useRef(resource);

  useEffect(() => {
    latest.current = resource;
  }, [resource]);

  useEffect(() => {
    const revalidateIfStale = () => {
      if (document.visibilityState !== "visible") return;

      const { loadedAt, isLoading, revalidate } = latest.current;
      // 一度も取れていない、まだ読み込み中、取ったばかり。どれも取り直す理由がない。
      if (loadedAt === 0 || isLoading || Date.now() - loadedAt < staleMilliseconds) return;

      revalidate();
    };

    window.addEventListener("focus", revalidateIfStale);
    document.addEventListener("visibilitychange", revalidateIfStale);
    return () => {
      window.removeEventListener("focus", revalidateIfStale);
      document.removeEventListener("visibilitychange", revalidateIfStale);
    };
  }, [staleMilliseconds]);
}
