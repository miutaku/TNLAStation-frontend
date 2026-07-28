"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ApiResource<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  /** 表示を保ったまま裏で取り直している最中。 */
  isRefreshing: boolean;
  /** 最後に取得できた時刻。まだ一度も取れていなければ 0。 */
  loadedAt: number;
  /** 取り直す。表示は一度消える。読み込みに失敗した後のやり直しに使う。 */
  reload: () => void;
  /** 表示を保ったまま取り直す。中身が入れ替わるまで画面は動かない。 */
  revalidate: () => void;
}

interface ResourceState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  loadedAt: number;
}

export function useApiResource<T>(loader: (signal: AbortSignal) => Promise<T>): ApiResource<T> {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    error: null,
    isLoading: true,
    isRefreshing: false,
    loadedAt: 0,
  });
  const activeLoader = useRef(loader);

  useEffect(() => {
    activeLoader.current = loader;
  }, [loader]);

  useEffect(() => {
    const controller = new AbortController();
    // The effect owns request lifecycle state for dependency-driven reloads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ data: null, error: null, isLoading: true, isRefreshing: false, loadedAt: 0 });

    void loader(controller.signal).then(
      (data) => setState({ data, error: null, isLoading: false, isRefreshing: false, loadedAt: Date.now() }),
      (reason: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          error: reason instanceof Error ? reason : new Error("Unknown API error"),
          isLoading: false,
          isRefreshing: false,
          loadedAt: 0,
        });
      },
    );

    return () => controller.abort();
  }, [loader, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const revalidate = useCallback(() => {
    const controller = new AbortController();
    setState((previous) => (previous.isRefreshing ? previous : { ...previous, isRefreshing: true }));

    void activeLoader.current(controller.signal).then(
      (data) => setState({ data, error: null, isLoading: false, isRefreshing: false, loadedAt: Date.now() }),
      () => {
        // 取り直しに失敗しても、いま出ているものは消さない。見えていた内容が消えるほうが困る。
        setState((previous) => ({ ...previous, isRefreshing: false }));
      },
    );
  }, []);

  return { ...state, reload, revalidate };
}
