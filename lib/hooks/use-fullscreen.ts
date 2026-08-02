"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * 指定した要素をブラウザーの Fullscreen API で全画面表示に切り替える。
 * Esc キーやブラウザー UI からの解除にも fullscreenchange を見て追従する。
 * API 自体が使えない環境 (iOS Safari の通常要素など) では
 * isSupported が false になるので、呼び出し側でボタンを隠す判断に使う。
 */
export function useFullscreen(target: RefObject<HTMLElement | null>): {
  isFullscreen: boolean;
  isSupported: boolean;
  toggle: () => void;
} {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // ref は安定した参照なので依存配列には含めない (React の作法)。
    const sync = () => {
      setIsSupported(document.fullscreenEnabled === true);
      setIsFullscreen(document.fullscreenElement === target.current);
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void target.current?.requestFullscreen();
    }
  }, []);

  return { isFullscreen, isSupported, toggle };
}
