"use client";

import { useEffect, useState } from "react";

/**
 * いま暗い面かどうか。ガラスの素材 (clear / dark) を面に合わせて選ぶために使う。
 *
 * テーマは <html> の dark クラスで切り替わる。設定でもシステム追従でも変わるので、
 * クラスの付け外しを見張って追う。
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIsDark(root.classList.contains("dark"));
    read();

    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
