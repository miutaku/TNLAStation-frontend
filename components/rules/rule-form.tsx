"use client";

import { Plus, RotateCcw, Save, X } from "lucide-react";
import type { FormEvent } from "react";

import {
  hasAnySearchCondition,
  SearchConditionsForm,
  searchConditionsToOption,
  type SearchConditions,
} from "@/components/search/search-conditions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ChannelItem,
  Rule,
  RuleSearchOptions,
  UpdateRuleOptions,
} from "@/lib/api/types";

function formatLocalDateTime(value?: number): string {
  if (value === undefined) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * API のルールを作成画面と共通のフォーム状態へ展開する。フォームが一つしか
 * 表現できない複数時刻・複数期間は先頭を表示し、保存時には未変更なら API の配列を
 * そのまま維持する。
 */
export function ruleSearchOptionToConditions(option: RuleSearchOptions): SearchConditions {
  const firstTime = option.times?.[0];
  const week = option.times?.reduce((mask, time) => mask | time.week, 0) ?? 0;
  const firstPeriod = option.searchPeriods?.[0];

  return {
    keyword: option.keyword ?? "",
    ignoreKeyword: option.ignoreKeyword ?? "",
    keyCS: option.keyCS ?? false,
    keyRegExp: option.keyRegExp ?? false,
    name: option.name ?? false,
    description: option.description ?? false,
    extended: option.extended ?? false,
    ignoreName: option.ignoreName ?? false,
    ignoreDescription: option.ignoreDescription ?? false,
    ignoreExtended: option.ignoreExtended ?? false,
    broadcasts: {
      GR: option.GR ?? false,
      BS: option.BS ?? false,
      CS: option.CS ?? false,
      SKY: option.SKY ?? false,
    },
    channelIds: [...(option.channelIds ?? [])],
    genres: [...new Set(option.genres?.map((genre) => genre.genre) ?? [])],
    weekdays: Array.from({ length: 7 }, (_, index) => (week & (1 << index)) !== 0),
    startHour: firstTime?.start === undefined ? "" : String(firstTime.start),
    rangeHours: firstTime?.range === undefined ? "" : String(firstTime.range),
    durationMin: option.durationMin === undefined ? "" : String(option.durationMin / 60),
    durationMax: option.durationMax === undefined ? "" : String(option.durationMax / 60),
    periodStart: formatLocalDateTime(firstPeriod?.startAt),
    periodEnd: formatLocalDateTime(firstPeriod?.endAt),
    isFree: option.isFree ?? false,
  };
}

function sameValues(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * 編集フォームで扱わない上流互換フィールドも含め、既存ルールを丸ごと基に更新する。
 * サブジャンルや複数時刻などは、対応するフォーム欄を変更した場合だけ置き換える。
 */
export function buildRuleUpdateOptions(
  rule: Rule,
  initialConditions: SearchConditions,
  conditions: SearchConditions,
  name: string,
  avoidDuplicate: boolean,
): UpdateRuleOptions {
  const edited = searchConditionsToOption(conditions);
  const searchOption: RuleSearchOptions = { ...rule.searchOption };

  const assignIfChanged = (
    key: keyof RuleSearchOptions,
    before: unknown,
    after: unknown,
  ) => {
    if (!sameValues(before, after)) Object.assign(searchOption, { [key]: edited[key] });
  };
  assignIfChanged("keyword", initialConditions.keyword, conditions.keyword);
  assignIfChanged("ignoreKeyword", initialConditions.ignoreKeyword, conditions.ignoreKeyword);
  assignIfChanged("keyCS", initialConditions.keyCS, conditions.keyCS);
  assignIfChanged("keyRegExp", initialConditions.keyRegExp, conditions.keyRegExp);
  assignIfChanged("name", initialConditions.name, conditions.name);
  assignIfChanged("description", initialConditions.description, conditions.description);
  assignIfChanged("extended", initialConditions.extended, conditions.extended);
  assignIfChanged("ignoreName", initialConditions.ignoreName, conditions.ignoreName);
  assignIfChanged("ignoreDescription", initialConditions.ignoreDescription, conditions.ignoreDescription);
  assignIfChanged("ignoreExtended", initialConditions.ignoreExtended, conditions.ignoreExtended);
  assignIfChanged("GR", initialConditions.broadcasts.GR, conditions.broadcasts.GR);
  assignIfChanged("BS", initialConditions.broadcasts.BS, conditions.broadcasts.BS);
  assignIfChanged("CS", initialConditions.broadcasts.CS, conditions.broadcasts.CS);
  assignIfChanged("SKY", initialConditions.broadcasts.SKY, conditions.broadcasts.SKY);
  assignIfChanged("channelIds", initialConditions.channelIds, conditions.channelIds);
  assignIfChanged("isFree", initialConditions.isFree, conditions.isFree);
  assignIfChanged("durationMin", initialConditions.durationMin, conditions.durationMin);
  assignIfChanged("durationMax", initialConditions.durationMax, conditions.durationMax);

  searchOption.genres = sameValues(initialConditions.genres, conditions.genres)
    ? rule.searchOption.genres
    : edited.genres;
  searchOption.times = sameValues(
    [initialConditions.weekdays, initialConditions.startHour, initialConditions.rangeHours],
    [conditions.weekdays, conditions.startHour, conditions.rangeHours],
  )
    ? rule.searchOption.times
    : edited.times;
  searchOption.searchPeriods = sameValues(
    [initialConditions.periodStart, initialConditions.periodEnd],
    [conditions.periodStart, conditions.periodEnd],
  )
    ? rule.searchOption.searchPeriods
    : edited.searchPeriods;

  return {
    name: name.trim() || undefined,
    isTimeSpecification: rule.isTimeSpecification,
    searchOption,
    reserveOption: {
      ...rule.reserveOption,
      avoidDuplicate,
    },
    saveOption: rule.saveOption,
    encodeOption: rule.encodeOption,
  };
}

export function RuleForm({
  mode,
  name,
  avoidDuplicate,
  conditions,
  channels,
  busy,
  onNameChange,
  onAvoidDuplicateChange,
  onConditionsChange,
  onReset,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  name: string;
  avoidDuplicate: boolean;
  conditions: SearchConditions;
  channels: ChannelItem[];
  busy: boolean;
  onNameChange: (value: string) => void;
  onAvoidDuplicateChange: (value: boolean) => void;
  onConditionsChange: (value: SearchConditions) => void;
  onReset: () => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const canSubmit = hasAnySearchCondition(conditions);
  const isEdit = mode === "edit";

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-5">
        <label htmlFor={`${mode}-rule-name`} className="mb-2 block text-sm font-semibold">
          ルール名 <span className="font-normal text-muted-foreground">(任意・未入力なら「無題のルール」)</span>
        </label>
        <Input
          id={`${mode}-rule-name`}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="例: 日曜の映画"
          maxLength={100}
        />
      </div>

      <SearchConditionsForm conditions={conditions} onChange={onConditionsChange} channels={channels} />

      <div className="mt-6 grid grid-cols-1 gap-4 border-t pt-5">
        <div className="min-w-0">
          <span className="mb-2 block text-sm font-semibold">重複</span>
          <label className="flex min-h-[42px] min-w-0 items-center gap-2 rounded-lg bg-muted px-3 text-sm [overflow-wrap:anywhere]">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-[var(--primary)]"
              checked={avoidDuplicate}
              onChange={(event) => onAvoidDuplicateChange(event.target.checked)}
            />
            同じ番組の重複予約を避ける
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          <X aria-hidden="true" />
          キャンセル
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onReset}>
          <RotateCcw aria-hidden="true" />
          入力を元に戻す
        </Button>
        <Button type="submit" disabled={!canSubmit || busy}>
          {isEdit ? <Save aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {busy ? (isEdit ? "保存中…" : "作成中…") : (isEdit ? "変更を保存" : "この条件でルールを作成")}
        </Button>
      </div>
      {!canSubmit ? (
        <p className="mt-2 text-right text-xs text-muted-foreground">
          キーワード・チャンネル・ジャンル・時刻・長さなどの条件を 1 つ以上指定してください。
        </p>
      ) : null}
    </form>
  );
}
