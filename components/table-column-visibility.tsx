"use client";

import { ChevronDown, ChevronUp, Columns3 } from "lucide-react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { AnchoredMenu } from "@/components/ui/anchored-menu";
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
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className={cn("shrink-0", className)}>
      <Button
        ref={setAnchor}
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}を選択`}
        title={`${label}を選択`}
        onClick={() => setOpen((current) => !current)}
      >
        <Columns3 aria-hidden="true" className="size-4" />
        <span>列</span>
      </Button>
      <AnchoredMenu open={open} anchor={anchor} title={label} onClose={close}>
        <TableColumnVisibilityPanel state={state} hintId={hintId} />
      </AnchoredMenu>
    </div>
  );
}

/** メニューの中身。開閉と配置は AnchoredMenu が持つ。 */
export function TableColumnVisibilityPanel<Key extends string>({
  state,
  hintId,
}: {
  state: TableColumnVisibilityState<Key>;
  hintId: string;
}) {
  return (
    <>
      <fieldset aria-describedby={hintId}>
          <p id={hintId} className="mb-2 text-xs leading-5 text-muted-foreground">
            表示する列と並び順を選べます。1列以上必要です。
          </p>
          <div className="space-y-1">
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
    </>
  );
}
