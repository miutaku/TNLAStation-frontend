import {
  CalendarClock,
  CircleDot,
  Cpu,
  Database,
  LayoutDashboard,
  ListChecks,
  MonitorPlay,
  Radio,
  Search,
  Settings,
  Tv,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * サイドバーの正規順序。モバイルの主要／その他メニューもこの配列から抽出する
 * (別々の配列を連結すると、主要項目の増減でサイドバーの順番まで変わってしまう)。
 */
export const navigation: readonly NavigationItem[] = [
  { href: "/", label: "ホーム", icon: LayoutDashboard },
  { href: "/onair", label: "放送中", icon: Tv },
  { href: "/guide", label: "番組表", icon: Radio },
  { href: "/recording", label: "録画中", icon: CircleDot },
  { href: "/recorded", label: "録画済み", icon: MonitorPlay },
  { href: "/encode", label: "エンコード", icon: Cpu },
  { href: "/reserves", label: "予約", icon: CalendarClock },
  { href: "/search", label: "番組検索", icon: Search },
  { href: "/rule", label: "録画ルール", icon: ListChecks },
  { href: "/storages", label: "ストレージ", icon: Database },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

/** ボトムバーの既定の並び。ユーザーが設定を変えるまではこの4画面・この順序で表示する。 */
export const DEFAULT_BOTTOM_BAR_ITEMS: readonly string[] = ["/", "/guide", "/recorded", "/reserves"];

/** ボトムバーに置ける主要画面の上限。残り 1 枠は「その他」が使う。 */
export const MAX_BOTTOM_BAR_ITEMS = 4;

/**
 * 親指の届く範囲に置く主要画面。ユーザーが選んだ並び順 (hrefs) をそのまま表示順とする。
 * 未知の href や欠落した項目は取り除き、結果が空になる場合は既定の並びへ戻す。
 */
export function primaryNavigationFor(hrefs: readonly string[]): NavigationItem[] {
  const byHref = new Map(navigation.map((item) => [item.href, item] as const));
  const resolved = hrefs
    .map((href) => byHref.get(href))
    .filter((item): item is NavigationItem => item !== undefined);
  if (resolved.length === 0 && hrefs !== DEFAULT_BOTTOM_BAR_ITEMS) return primaryNavigationFor(DEFAULT_BOTTOM_BAR_ITEMS);
  return resolved;
}

/**
 * ボトムバーに入りきらない画面。「その他」シートから開く。canonical 順を保つ。
 */
export function secondaryNavigationFor(hrefs: readonly string[]): NavigationItem[] {
  const primarySet = new Set(primaryNavigationFor(hrefs).map((item) => item.href));
  return navigation.filter((item) => !primarySet.has(item.href));
}

export function isActivePath(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
