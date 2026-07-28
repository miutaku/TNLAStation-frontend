"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { MAX_BOTTOM_BAR_ITEMS, navigation, type NavigationItem } from "@/components/navigation";
import { Button } from "@/components/ui/button";

export function BottomBarItemsSettings({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = value
    .map((href) => navigation.find((item) => item.href === href))
    .filter((item): item is NavigationItem => item !== undefined);
  const selectedHrefs = new Set(selected.map((item) => item.href));
  const available = navigation.filter((item) => !selectedHrefs.has(item.href));
  const atLimit = selected.length >= MAX_BOTTOM_BAR_ITEMS;

  const moveBy = (href: string, delta: -1 | 1) => {
    const index = value.indexOf(href);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (href: string) => onChange(value.filter((item) => item !== href));

  const add = (href: string) => {
    if (atLimit) return;
    onChange([...value, href]);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          表示中 ({selected.length}/{MAX_BOTTOM_BAR_ITEMS})
        </p>
        <ul className="space-y-1.5">
          {selected.map((item, index) => {
            const Icon = item.icon;
            return (
              <li
                key={item.href}
                className="flex items-center gap-2 rounded-lg border glass-field px-3 py-2"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={`${item.label}を上へ移動`}
                    disabled={index === 0}
                    onClick={() => moveBy(item.href, -1)}
                    className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronUp aria-hidden="true" className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${item.label}を下へ移動`}
                    disabled={index === selected.length - 1}
                    onClick={() => moveBy(item.href, 1)}
                    className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronDown aria-hidden="true" className="size-3.5" />
                  </button>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(item.href)}>
                  外す
                </Button>
              </li>
            );
          })}
          {selected.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              表示する画面がありません。下から追加してください。
            </p>
          ) : null}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">追加できる画面</p>
        <ul className="flex flex-wrap gap-2">
          {available.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Button type="button" size="sm" variant="outline" disabled={atLimit} onClick={() => add(item.href)}>
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Button>
              </li>
            );
          })}
          {available.length === 0 ? (
            <p className="text-xs text-muted-foreground">すべての画面を選択済みです。</p>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
