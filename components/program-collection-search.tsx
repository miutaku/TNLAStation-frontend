"use client";

import { RotateCcw, Search } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollapsibleSearchPanel } from "@/components/collapsible-search-panel";
import type { ChannelItem, Rule } from "@/lib/api/types";
import { GENRE_ENTRIES } from "@/lib/format";

const selectClassName =
  "h-10 min-w-0 w-full max-w-full rounded-lg border border-input bg-background/75 px-3 text-sm shadow-xs";

export interface ProgramCollectionSearchValue {
  keyword: string;
  ruleId: string;
  channelId: string;
  genre: string;
}

export interface ProgramCollectionQuery {
  keyword?: string;
  ruleId?: number;
  channelId?: number;
  genre?: number;
}

export const EMPTY_PROGRAM_COLLECTION_SEARCH: ProgramCollectionSearchValue = {
  keyword: "",
  ruleId: "",
  channelId: "",
  genre: "",
};

export function toProgramCollectionQuery(value: ProgramCollectionSearchValue): ProgramCollectionQuery {
  const keyword = value.keyword.trim();
  const ruleId = value.ruleId === "" ? undefined : Number(value.ruleId);
  const channelId = value.channelId === "" ? undefined : Number(value.channelId);
  const genre = value.genre === "" ? undefined : Number(value.genre);

  return {
    keyword: keyword || undefined,
    ruleId: Number.isFinite(ruleId) ? ruleId : undefined,
    channelId: Number.isFinite(channelId) ? channelId : undefined,
    genre: Number.isFinite(genre) ? genre : undefined,
  };
}

export function hasProgramCollectionQuery(value: ProgramCollectionSearchValue): boolean {
  const query = toProgramCollectionQuery(value);
  return Object.values(query).some((item) => item !== undefined);
}

export function ruleOptionLabel(rule: Rule): string {
  return rule.name?.trim() || "無題のルール";
}

export function ProgramCollectionSearch({
  idPrefix,
  value,
  channels,
  rules,
  methodLabel = "予約方法",
  manualLabel,
  onChange,
  onSubmit,
  onClear,
  children,
}: {
  idPrefix: string;
  value: ProgramCollectionSearchValue;
  channels: readonly ChannelItem[];
  rules: readonly Rule[];
  methodLabel?: string;
  manualLabel: string;
  onChange: (value: ProgramCollectionSearchValue) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  children?: ReactNode;
}) {
  const update = (field: keyof ProgramCollectionSearchValue, next: string) => {
    onChange({ ...value, [field]: next });
  };

  return (
    <form onSubmit={onSubmit} role="search" className="mb-5 min-w-0">
      <CollapsibleSearchPanel>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 md:col-span-2">
          <label htmlFor={`${idPrefix}-keyword`} className="mb-2 block text-sm font-semibold">
            番組名・概要・番組詳細
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={`${idPrefix}-keyword`}
              type="search"
              value={value.keyword}
              onChange={(event) => update("keyword", event.target.value)}
              placeholder="キーワードを入力"
              maxLength={255}
              className="pl-9"
            />
          </div>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-rule`} className="mb-2 block text-sm font-semibold">
            {methodLabel}
          </label>
          <select
            id={`${idPrefix}-rule`}
            className={selectClassName}
            value={value.ruleId}
            onChange={(event) => update("ruleId", event.target.value)}
          >
            <option value="">すべて</option>
            <option value="0">{manualLabel}</option>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {ruleOptionLabel(rule)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-channel`} className="mb-2 block text-sm font-semibold">
            放送局
          </label>
          <select
            id={`${idPrefix}-channel`}
            className={selectClassName}
            value={value.channelId}
            onChange={(event) => update("channelId", event.target.value)}
          >
            <option value="">すべて</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name} ({channel.channelType})
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-genre`} className="mb-2 block text-sm font-semibold">
            ジャンル
          </label>
          <select
            id={`${idPrefix}-genre`}
            className={selectClassName}
            value={value.genre}
            onChange={(event) => update("genre", event.target.value)}
          >
            <option value="">すべて</option>
            {GENRE_ENTRIES.map((genre) => (
              <option key={genre.value} value={genre.value}>
                {genre.label}
              </option>
            ))}
          </select>
        </div>
        {children}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClear}>
          <RotateCcw aria-hidden="true" />
          条件をクリア
        </Button>
        <Button type="submit">
          <Search aria-hidden="true" />
          検索
        </Button>
      </div>
      </CollapsibleSearchPanel>
    </form>
  );
}
