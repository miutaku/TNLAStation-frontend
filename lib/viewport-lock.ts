/** 番組表ページだけ viewport 固定の flex 列にする。AppShell/template.tsx で共有する判定。 */
export function isViewportLockedRoute(pathname: string): boolean {
  return pathname === "/guide";
}
