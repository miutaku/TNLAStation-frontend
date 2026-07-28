"use client";

import { ChevronDown, ChevronUp, Columns3 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TableColumnDefinition<Key extends string = string> {
  key: Key;
  label: string;
}

export interface StoredTableColumnsState {
  order: string[];
  hidden: string[];
}

export interface TableColumnVisibilityState<Key extends string = string> {
  columns: readonly TableColumnDefinition<Key>[];
  visibleCount: number;
  isVisible: (key: Key) => boolean;
  toggle: (key: Key) => void;
  showAll: () => void;
  moveUp: (key: Key) => void;
  moveDown: (key: Key) => void;
}

const STORAGE_PREFIX = "tnlastation:table-columns:";
const CHANGE_EVENT = "tnlastation:table-columns-change";
const volatileColumnsState = new Map<string, string>();

/**
 * 保存済みの並び順・非表示列を現行の列定義へ合わせる。壊れた値や全列非表示になる値、
 * 旧形式（非表示キーのみの配列）は安全な状態へ戻し、新しく追加された列は末尾に表示で足す。
 */
export function parseStoredTableColumns(
  stored: string | null,
  validKeys: readonly string[],
): StoredTableColumnsState {
  if (!stored || validKeys.length === 0) return { order: [...validKeys], hidden: [] };

  let rawOrder: unknown[] = [];
  let rawHidden: unknown[] = [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      rawHidden = parsed;
    } else if (parsed && typeof parsed === "object") {
      const candidate = parsed as { order?: unknown; hidden?: unknown };
      if (Array.isArray(candidate.order)) rawOrder = candidate.order;
      if (Array.isArray(candidate.hidden)) rawHidden = candidate.hidden;
    }
  } catch {
    return { order: [...validKeys], hidden: [] };
  }

  const validSet = new Set(validKeys);
  const seen = new Set<string>();
  const order: string[] = [];
  for (const key of rawOrder) {
    if (typeof key === "string" && validSet.has(key) && !seen.has(key)) {
      order.push(key);
      seen.add(key);
    }
  }
  for (const key of validKeys) {
    if (!seen.has(key)) order.push(key);
  }

  const hidden = new Set(
    rawHidden.filter((value): value is string => typeof value === "string" && validSet.has(value)),
  );
  if (hidden.size >= order.length) hidden.delete(order[0]);

  return { order, hidden: order.filter((key) => hidden.has(key)) };
}

function readStoredColumns(tableKey: string, validKeys: readonly string[]): string {
  if (typeof window === "undefined") return JSON.stringify({ order: validKeys, hidden: [] });
  let stored = volatileColumnsState.get(tableKey) ?? null;
  try {
    stored = window.localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`) ?? stored;
  } catch {
  }
  return JSON.stringify(parseStoredTableColumns(stored, validKeys));
}

export function useTableColumnVisibility<Key extends string>(
  tableKey: string,
  columns: readonly TableColumnDefinition<Key>[],
): TableColumnVisibilityState<Key> {
  const validKeys = useMemo(() => columns.map((column) => column.key), [columns]);
  const definitionsByKey = useMemo(
    () => new Map(columns.map((column) => [column.key, column])),
    [columns],
  );

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
  const getSnapshot = useCallback(
    () => readStoredColumns(tableKey, validKeys),
    [tableKey, validKeys],
  );
  const getServerSnapshot = useCallback(() => JSON.stringify({ order: [], hidden: [] }), []);
  const serializedState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const stored = useMemo(
    () => parseStoredTableColumns(serializedState, validKeys),
    [serializedState, validKeys],
  );

  const orderedColumns = useMemo(
    () => stored.order
      .map((key) => definitionsByKey.get(key as Key))
      .filter((column): column is TableColumnDefinition<Key> => column !== undefined),
    [stored.order, definitionsByKey],
  );
  const hiddenColumns = useMemo(() => new Set(stored.hidden as Key[]), [stored.hidden]);

  const persist = useCallback((nextOrder: readonly Key[], nextHidden: ReadonlySet<Key>) => {
    const serialized = JSON.stringify({
      order: nextOrder,
      hidden: nextOrder.filter((key) => nextHidden.has(key)),
    });
    volatileColumnsState.set(tableKey, serialized);
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${tableKey}`, serialized);
    } catch {
    }
    window.dispatchEvent(new CustomEvent<string>(CHANGE_EVENT, { detail: tableKey }));
  }, [tableKey]);

  const toggle = useCallback((key: Key) => {
    const nextHidden = new Set(hiddenColumns);
    if (nextHidden.has(key)) {
      nextHidden.delete(key);
    } else {
      if (columns.length - nextHidden.size <= 1) return;
      nextHidden.add(key);
    }
    persist(stored.order as Key[], nextHidden);
  }, [columns.length, hiddenColumns, persist, stored.order]);

  const showAll = useCallback(
    () => persist(stored.order as Key[], new Set<Key>()),
    [persist, stored.order],
  );

  const moveBy = useCallback((key: Key, delta: -1 | 1) => {
    const order = stored.order as Key[];
    const index = order.indexOf(key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= order.length) return;
    const nextOrder = [...order];
    [nextOrder[index], nextOrder[target]] = [nextOrder[target], nextOrder[index]];
    persist(nextOrder, hiddenColumns);
  }, [hiddenColumns, persist, stored.order]);

  const moveUp = useCallback((key: Key) => moveBy(key, -1), [moveBy]);
  const moveDown = useCallback((key: Key) => moveBy(key, 1), [moveBy]);
  const isVisible = useCallback((key: Key) => !hiddenColumns.has(key), [hiddenColumns]);

  return {
    columns: orderedColumns,
    visibleCount: columns.length - hiddenColumns.size,
    isVisible,
    toggle,
    showAll,
    moveUp,
    moveDown,
  };
}

export function TableColumnVisibilityMenu<Key extends string>({
  state,
  label = "表の列",
  className,
}: {
  state: TableColumnVisibilityState<Key>;
  label?: string;
  className?: string;
}) {
  const hintId = `table-columns-${label.replace(/\s+/g, "-")}-hint`;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 「列」ボタンはツールバー内のどこにでも置かれうるため、右寄せ (right-0) のままだと
  // 幅の狭い画面でボタンの右端から左へ張り出したメニューが画面外へこぼれる。開いた直後に
  // 実測し、左端が画面からはみ出す場合だけ left へ切り替えて画面内に収める。
  //
  // モバイルは下端に固定のボトムタブバーがあり (z-50)、ボタンがページ下部にあるとメニューが
  // 下向きに開いてボトムバーの裏に重なり、重なった部分のボタン・チェックボックスが押せなく
  // なっていた。ボトムバーの領域に掛かりそうなときは上向きに開き直す。
  useEffect(() => {
    const details = detailsRef.current;
    const popover = popoverRef.current;
    if (!details || !popover) return;

    const MARGIN = 12;
    // モバイルのボトムタブバー (高さ + 余白 + セーフエリア) を避けるための下端の予約幅。
    // ボトムバーは lg 以上では表示されない。
    const BOTTOM_NAV_RESERVE = 128;
    const reposition = () => {
      if (!details.open) return;
      popover.style.left = "";
      popover.style.right = "0px";
      popover.style.top = "";
      popover.style.bottom = "";
      popover.style.marginTop = "";
      popover.style.marginBottom = "";

      const detailsRect = details.getBoundingClientRect();
      const rect = popover.getBoundingClientRect();
      if (rect.left < MARGIN) {
        popover.style.right = "auto";
        popover.style.left = `${MARGIN - detailsRect.left}px`;
      }

      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const bottomLimit = window.innerHeight - (isDesktop ? MARGIN : BOTTOM_NAV_RESERVE);
      if (rect.bottom > bottomLimit) {
        popover.style.top = "auto";
        popover.style.bottom = "100%";
        popover.style.marginTop = "0px";
        popover.style.marginBottom = "0.5rem";
      }
    };

    const onToggle = () => {
      if (details.open) requestAnimationFrame(reposition);
    };

    details.addEventListener("toggle", onToggle);
    window.addEventListener("resize", reposition);
    return () => {
      details.removeEventListener("toggle", onToggle);
      window.removeEventListener("resize", reposition);
    };
  }, []);

  return (
    <details ref={detailsRef} className={cn("relative shrink-0", className)}>
      <summary
        className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&::-webkit-details-marker]:hidden"
        aria-label={`${label}を選択`}
        title={`${label}を選択`}
      >
        <Columns3 aria-hidden="true" className="size-4" />
        <span>列</span>
      </summary>
      <div
        ref={popoverRef}
        className="absolute right-0 z-[60] mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg"
      >
        <fieldset aria-describedby={hintId}>
          <legend className="mb-2 text-sm font-semibold">{label}</legend>
          <p id={hintId} className="mb-2 text-xs leading-5 text-muted-foreground">
            表示する列と並び順を選べます。1列以上必要です。
          </p>
          <div className="max-h-72 space-y-1 overflow-y-auto overscroll-contain">
            {state.columns.map((column, index) => {
              const visible = state.isVisible(column.key);
              const isLastVisible = visible && state.visibleCount === 1;
              return (
                <div
                  key={column.key}
                  className={cn(
                    "flex items-center gap-1 rounded-md pr-1 hover:bg-muted",
                    isLastVisible && "opacity-60",
                  )}
                >
                  <label
                    className={cn(
                      "flex min-h-9 flex-1 cursor-pointer items-center gap-3 px-2 text-sm",
                      isLastVisible && "cursor-not-allowed",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      checked={visible}
                      disabled={isLastVisible}
                      onChange={() => state.toggle(column.key)}
                    />
                    <span>{column.label}</span>
                  </label>
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      aria-label={`${column.label}を上へ移動`}
                      disabled={index === 0}
                      onClick={() => state.moveUp(column.key)}
                      className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronUp aria-hidden="true" className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${column.label}を下へ移動`}
                      disabled={index === state.columns.length - 1}
                      onClick={() => state.moveDown(column.key)}
                      className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronDown aria-hidden="true" className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-2 w-full"
          disabled={state.visibleCount === state.columns.length}
          onClick={state.showAll}
        >
          すべて選択
        </Button>
      </div>
    </details>
  );
}
