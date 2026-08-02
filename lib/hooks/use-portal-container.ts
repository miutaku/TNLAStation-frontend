"use client";

import { useEffect, useState } from "react";

function currentPortalContainer(): Element | null {
  if (typeof document === "undefined") return null;
  return document.fullscreenElement ?? document.body;
}

/**
 * ダイアログなどを portal で出す先。全画面表示中は Fullscreen API の仕様上、
 * 全画面化した要素の外は描画されないため、その要素の中へ出さないとダイアログ等が
 * 見えなくなる (全画面解除で急に見えるのはこのため)。全画面時はその要素へ、
 * それ以外はいつも通り body へ出す。
 */
export function usePortalContainer(): Element | null {
  const [container, setContainer] = useState(currentPortalContainer);

  useEffect(() => {
    const sync = () => setContainer(currentPortalContainer());
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  return container;
}
