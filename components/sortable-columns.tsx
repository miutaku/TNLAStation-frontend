"use client";

import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { AnchoredMenu } from "@/components/ui/anchored-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";
export type SortValue = string | number | boolean | null | undefined;
export type SortAccessors<T, Key extends string> = Partial<Record<Key, (item: T) => SortValue>>;

export interface StoredSortState {
  key: string | null;
  direction: SortDirection;
}

export interface SortState<Key extends string> {
  key: Key | null;
  direction: SortDirection;
  /** その項目が今どちら向きにソートされているか。ソート対象でなければ false。 */
  directionOf: (key: Key) => SortDirection | false;
  /** 昇順→降順→解除の順で切り替える。別の項目を選ぶと常に昇順から始まる。 */
  toggle: (key: Key) => void;
  /** ソートを解除し、元の並び順に戻す。 */
  clear: () => void;
}

export interface SortColumnDefinition<Key extends string = string> {
  key: Key;
  label: string;
}

const STORAGE_PREFIX = "tnlastation:table-sort:";
const CHANGE_EVENT = "tnlastation:table-sort-change";
const volatileSortState = new Map<string, string>();
const UNSORTED: StoredSortState = { key: null, direction: "asc" };

export function parseStoredSort(stored: string | null, validKeys: readonly string[]): StoredSortState {
  if (!stored) return UNSORTED;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return UNSORTED;
    const candidate = parsed as { key?: unknown; direction?: unknown };
    const key = typeof candidate.key === "string" && validKeys.includes(candidate.key) ? candidate.key : null;
    const direction = candidate.direction === "desc" ? "desc" : "asc";
    return key ? { key, direction } : UNSORTED;
  } catch {
    return UNSORTED;
  }
}

/** 昇順→降順→解除。別の列を押したときは常に昇順から始める。 */
export function nextSortState(current: StoredSortState, pressedKey: string): StoredSortState {
  if (current.key !== pressedKey) return { key: pressedKey, direction: "asc" };
  if (current.direction === "asc") return { key: pressedKey, direction: "desc" };
  return UNSORTED;
}

function readStoredSort(tableKey: string): string {
  if (typeof window === "undefined") return JSON.stringify(UNSORTED);
  let stored = volatileSortState.get(tableKey) ?? null;
  try {
    stored = window.localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`) ?? stored;
  } catch {
  }
  return stored ?? JSON.stringify(UNSORTED);
}

/**
 * 一覧ごとのソート列・向きを端末へ保存する。列の並び替え・表示形式と同じ保存の仕組みに揃えてある。
 */
export function useSortState<Key extends string>(
  tableKey: string,
  validKeys: readonly Key[],
): SortState<Key> {
  const subscribe = useCallback((notify: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === `${STORAGE_PREFIX}${tableKey}`) notify();
    };
    const onLocalChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === tableKey) notify();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onLocalChange);
    };
  }, [tableKey]);
  const getSnapshot = useCallback(() => readStoredSort(tableKey), [tableKey]);
  const getServerSnapshot = useCallback(() => JSON.stringify(UNSORTED), []);
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const stored = useMemo(() => parseStoredSort(serialized, validKeys), [serialized, validKeys]);

  const persist = useCallback((next: StoredSortState) => {
    const serializedNext = JSON.stringify(next);
    volatileSortState.set(tableKey, serializedNext);
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${tableKey}`, serializedNext);
    } catch {
    }
    window.dispatchEvent(new CustomEvent<string>(CHANGE_EVENT, { detail: tableKey }));
  }, [tableKey]);

  const toggle = useCallback((key: Key) => persist(nextSortState(stored, key)), [persist, stored]);
  const clear = useCallback(() => persist(UNSORTED), [persist]);
  const directionOf = useCallback(
    (key: Key): SortDirection | false => (stored.key === key ? stored.direction : false),
    [stored.key, stored.direction],
  );

  return { key: stored.key as Key | null, direction: stored.direction, directionOf, toggle, clear };
}

/**
 * 現在の並び順に沿って複製した配列を返す。null/undefined は向きに関わらず末尾へ送る。
 * 対応する accessor が無い列や、ソートが解除されているときは元の順序のまま複製する。
 */
export function sortItems<T, Key extends string>(
  items: readonly T[],
  sort: Pick<SortState<Key>, "key" | "direction">,
  accessors: SortAccessors<T, Key>,
): T[] {
  const accessor = sort.key ? accessors[sort.key] : undefined;
  if (!accessor) return [...items];

  const factor = sort.direction === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const va = accessor(a);
    const vb = accessor(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb, "ja") * factor;
    if (va < vb) return -1 * factor;
    if (va > vb) return 1 * factor;
    return 0;
  });
}

/**
 * カード表示・表表示のどちらでも使える、独立したソート選択ボタン。表の見出しクリックには
 * 依存しないので、カード表示中でも並び替え・解除ができる。列の表示/並び替えメニュー
 * (TableColumnVisibilityMenu) と同じ AnchoredMenu の殻を使う。
 */
export function SortMenu<Key extends string>({
  sort,
  columns,
  label = "並び替え",
  className,
}: {
  sort: SortState<Key>;
  columns: readonly SortColumnDefinition<Key>[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className={cn("shrink-0", className)}>
      <Button
        ref={setAnchor}
        type="button"
        variant={sort.key !== null ? "default" : "outline"}
        size="sm"
        className="h-9"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}を選択`}
        title={`${label}を選択`}
        onClick={() => setOpen((current) => !current)}
      >
        <ArrowUpDown aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">並び替え</span>
      </Button>
      <AnchoredMenu open={open} anchor={anchor} title={label} onClose={close}>
        <SortMenuPanel sort={sort} columns={columns} />
      </AnchoredMenu>
    </div>
  );
}

/** メニューの中身。開閉と配置は AnchoredMenu が持つ。 */
export function SortMenuPanel<Key extends string>({
  sort,
  columns,
}: {
  sort: SortState<Key>;
  columns: readonly SortColumnDefinition<Key>[];
}) {
  return (
    <>
      <fieldset>
        <div className="space-y-1">
          {columns.map((column) => {
            const direction = sort.directionOf(column.key);
            return (
              <button
                key={column.key}
                type="button"
                onClick={() => sort.toggle(column.key)}
                aria-pressed={direction !== false}
                className={cn(
                  "flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-2 text-sm hover:bg-muted",
                  direction !== false && "bg-muted font-medium text-foreground",
                )}
              >
                <span>{column.label}</span>
                {direction === "asc" ? (
                  <ChevronUp aria-hidden="true" className="size-4 shrink-0 text-primary" />
                ) : direction === "desc" ? (
                  <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-primary" />
                ) : (
                  <ArrowUpDown aria-hidden="true" className="size-4 shrink-0 opacity-30" />
                )}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-2 w-full"
        disabled={sort.key === null}
        onClick={sort.clear}
      >
        並び替えを解除
      </Button>
    </>
  );
}
