"use client";

import { Grid2X2, TableProperties } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CollectionViewMode = "cards" | "list";

const STORAGE_PREFIX = "tnlastation:collection-view:";
const CHANGE_EVENT = "tnlastation:collection-view-change";
const volatileModes = new Map<string, CollectionViewMode>();

export function collectionLayoutClass(mode: CollectionViewMode, cardColumns: string): string {
  return cn("grid grid-cols-1 gap-4", mode === "cards" && cardColumns);
}

function readMode(key: string): CollectionViewMode {
  if (typeof window === "undefined") return "cards";
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (stored === "cards" || stored === "list") return stored;
  } catch {
  }
  return volatileModes.get(key) ?? "cards";
}

/**
 * 一覧ごとに選んだ表示方法を端末へ保存する。useSyncExternalStore のサーバー値を
 * カードへ固定することで、保存値がリストでも hydration のマークアップを一致させる。
 */
export function useCollectionViewMode(key: string): readonly [
  CollectionViewMode,
  (mode: CollectionViewMode) => void,
] {
  const subscribe = useCallback((notify: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === `${STORAGE_PREFIX}${key}`) notify();
    };
    const onLocalChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) notify();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onLocalChange);
    };
  }, [key]);
  const getSnapshot = useCallback(() => readMode(key), [key]);
  const getServerSnapshot = useCallback((): CollectionViewMode => "cards", []);
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const changeMode = useCallback((nextMode: CollectionViewMode) => {
    volatileModes.set(key, nextMode);
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, nextMode);
    } catch {
    }
    window.dispatchEvent(new CustomEvent<string>(CHANGE_EVENT, { detail: key }));
  }, [key]);

  return [mode, changeMode] as const;
}

export function CollectionViewToggle({
  value,
  onChange,
  label = "表示形式",
  className,
}: {
  value: CollectionViewMode;
  onChange: (mode: CollectionViewMode) => void;
  label?: string;
  className?: string;
}) {
  return (
    <fieldset
      className={cn("inline-flex shrink-0 gap-1 rounded-lg border bg-background/70 p-1", className)}
    >
      <legend className="sr-only">{label}</legend>
      <Button
        type="button"
        size="sm"
        variant={value === "cards" ? "default" : "ghost"}
        aria-pressed={value === "cards"}
        aria-label="カード表示"
        title="カード表示"
        onClick={() => onChange("cards")}
      >
        <Grid2X2 aria-hidden="true" />
        <span className="hidden sm:inline">カード</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "list" ? "default" : "ghost"}
        aria-pressed={value === "list"}
        aria-label="表表示"
        title="表表示"
        onClick={() => onChange("list")}
      >
        <TableProperties aria-hidden="true" />
        <span className="hidden sm:inline">表</span>
      </Button>
    </fieldset>
  );
}
