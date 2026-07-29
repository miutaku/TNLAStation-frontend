"use client";

import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ChannelItem, ChannelType, RuleSearchOptions } from "@/lib/api/types";
import { GENRE_ENTRIES } from "@/lib/format";
import { cn } from "@/lib/utils";

const BROADCASTS: { value: ChannelType; label: string }[] = [
  { value: "GR", label: "地デジ" },
  { value: "BS", label: "BS" },
  { value: "CS", label: "CS" },
  { value: "SKY", label: "SKY" },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export interface SearchConditions {
  keyword: string;
  ignoreKeyword: string;
  keyCS: boolean;
  keyRegExp: boolean;
  name: boolean;
  description: boolean;
  extended: boolean;
  ignoreName: boolean;
  ignoreDescription: boolean;
  ignoreExtended: boolean;
  broadcasts: Record<ChannelType, boolean>;
  channelIds: number[];
  genres: number[];
  weekdays: boolean[];
  startHour: string;
  rangeHours: string;
  durationMin: string;
  durationMax: string;
  periodStart: string;
  periodEnd: string;
  isFree: boolean;
}

export const DEFAULT_SEARCH_CONDITIONS: SearchConditions = {
  keyword: "",
  ignoreKeyword: "",
  keyCS: false,
  keyRegExp: false,
  name: true,
  description: true,
  extended: false,
  ignoreName: true,
  ignoreDescription: true,
  ignoreExtended: false,
  broadcasts: { GR: true, BS: true, CS: true, SKY: true },
  channelIds: [],
  genres: [],
  weekdays: [false, false, false, false, false, false, false],
  startHour: "",
  rangeHours: "",
  durationMin: "",
  durationMax: "",
  periodStart: "",
  periodEnd: "",
  isFree: false,
};

/** キーワード・チャンネル・ジャンル・時刻・長さ・期間のいずれかが指定されているか。放送波 (既定で全部 ON) だけでは条件とみなさない。 */
export function hasAnySearchCondition(conditions: SearchConditions): boolean {
  return (
    conditions.keyword.trim() !== "" ||
    conditions.ignoreKeyword.trim() !== "" ||
    conditions.channelIds.length > 0 ||
    conditions.genres.length > 0 ||
    conditions.weekdays.some(Boolean) ||
    conditions.durationMin.trim() !== "" ||
    conditions.durationMax.trim() !== "" ||
    (conditions.periodStart !== "" && conditions.periodEnd !== "") ||
    conditions.isFree
  );
}

export function validateSearchConditions(conditions: SearchConditions): string[] {
  const errors: string[] = [];
  if (conditions.keyword.trim() && !conditions.name && !conditions.description && !conditions.extended) {
    errors.push("検索キーワードの対象を1つ以上選択してください。");
  }
  if (conditions.ignoreKeyword.trim() && !conditions.ignoreName && !conditions.ignoreDescription && !conditions.ignoreExtended) {
    errors.push("除外キーワードの対象を1つ以上選択してください。");
  }
  if (conditions.keyRegExp && conditions.keyword.trim()) {
    try {
      new RegExp(conditions.keyword);
    } catch {
      errors.push("検索キーワードの正規表現が正しくありません。");
    }
  }
  if (!Object.values(conditions.broadcasts).some(Boolean)) errors.push("放送波を1つ以上選択してください。");

  const durationMin = toNumber(conditions.durationMin);
  const durationMax = toNumber(conditions.durationMax);
  if (conditions.durationMin.trim() && durationMin === undefined) errors.push("最小の長さを数値で入力してください。");
  if (conditions.durationMax.trim() && durationMax === undefined) errors.push("最大の長さを数値で入力してください。");
  if (durationMin !== undefined && durationMin < 0) errors.push("最小の長さは0分以上にしてください。");
  if (durationMax !== undefined && durationMax < 0) errors.push("最大の長さは0分以上にしてください。");
  if (durationMin !== undefined && durationMax !== undefined && durationMax < durationMin) {
    errors.push("最大の長さは最小の長さ以上にしてください。");
  }

  if (Boolean(conditions.periodStart) !== Boolean(conditions.periodEnd)) {
    errors.push("放送期間は開始と終了の両方を入力してください。");
  } else if (conditions.periodStart && conditions.periodEnd && Date.parse(conditions.periodEnd) <= Date.parse(conditions.periodStart)) {
    errors.push("放送期間の終了は開始より後にしてください。");
  }
  return errors;
}

function toWeekBitmask(weekdays: boolean[]): number {
  return weekdays.reduce((mask, on, index) => (on ? mask | (1 << index) : mask), 0);
}

function toNumber(value: string): number | undefined {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) ? parsed : undefined;
}

export function searchConditionsToOption(conditions: SearchConditions): RuleSearchOptions {
  const hasKeyword = conditions.keyword.trim() !== "";
  const hasIgnoreKeyword = conditions.ignoreKeyword.trim() !== "";
  const week = toWeekBitmask(conditions.weekdays);
  const startHour = toNumber(conditions.startHour);
  const rangeHours = toNumber(conditions.rangeHours);
  const periodStart = conditions.periodStart ? Date.parse(conditions.periodStart) : undefined;
  const periodEnd = conditions.periodEnd ? Date.parse(conditions.periodEnd) : undefined;
  const durationMin = toNumber(conditions.durationMin);
  const durationMax = toNumber(conditions.durationMax);

  return {
    keyword: conditions.keyword.trim() || undefined,
    ignoreKeyword: conditions.ignoreKeyword.trim() || undefined,
    keyCS: hasKeyword && conditions.keyCS,
    keyRegExp: hasKeyword && conditions.keyRegExp,
    name: hasKeyword && conditions.name,
    description: hasKeyword && conditions.description,
    extended: hasKeyword && conditions.extended,
    ignoreName: hasIgnoreKeyword && conditions.ignoreName,
    ignoreDescription: hasIgnoreKeyword && conditions.ignoreDescription,
    ignoreExtended: hasIgnoreKeyword && conditions.ignoreExtended,
    GR: conditions.broadcasts.GR,
    BS: conditions.broadcasts.BS,
    CS: conditions.broadcasts.CS,
    SKY: conditions.broadcasts.SKY,
    channelIds: conditions.channelIds.length > 0 ? conditions.channelIds : undefined,
    genres: conditions.genres.length > 0 ? conditions.genres.map((genre) => ({ genre })) : undefined,
    times: week !== 0 ? [{ week, start: startHour, range: rangeHours }] : undefined,
    isFree: conditions.isFree ? true : undefined,
    durationMin: durationMin !== undefined ? durationMin * 60 : undefined,
    durationMax: durationMax !== undefined ? durationMax * 60 : undefined,
    searchPeriods:
      periodStart !== undefined && periodEnd !== undefined ? [{ startAt: periodStart, endAt: periodEnd }] : undefined,
  };
}

const fieldClassName =
  "h-10 min-w-0 w-full max-w-full rounded-lg border border-input bg-background/75 px-3 text-sm shadow-xs";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "press-spring max-w-full rounded-full border px-3 py-1.5 text-xs font-medium [overflow-wrap:anywhere]",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

function TargetToggles({
  values,
  onToggle,
  ids,
}: {
  values: [boolean, boolean, boolean];
  onToggle: (index: 0 | 1 | 2) => void;
  ids: [string, string, string];
}) {
  const labels = ["番組名", "概要", "詳細"] as const;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {labels.map((label, index) => (
        <Chip key={ids[index]} active={values[index]} onClick={() => onToggle(index as 0 | 1 | 2)}>
          {label}
        </Chip>
      ))}
    </div>
  );
}

export function SearchConditionsForm({
  conditions,
  onChange,
  channels,
}: {
  conditions: SearchConditions;
  onChange: (next: SearchConditions) => void;
  channels: ChannelItem[];
}) {
  const patch = (part: Partial<SearchConditions>) => onChange({ ...conditions, ...part });

  const toggleChannel = (id: number) =>
    patch({
      channelIds: conditions.channelIds.includes(id)
        ? conditions.channelIds.filter((value) => value !== id)
        : [...conditions.channelIds, id],
    });
  const toggleGenre = (genre: number) =>
    patch({
      genres: conditions.genres.includes(genre)
        ? conditions.genres.filter((value) => value !== genre)
        : [...conditions.genres, genre],
    });

  const availableChannels = channels.filter(
    (channel) => conditions.broadcasts[channel.channelType],
  );

  return (
    <div className="space-y-6">
      {/* キーワードと対象 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="search-keyword" className="text-sm font-semibold">検索キーワード</label>
          <Input
            id="search-keyword"
            value={conditions.keyword}
            onChange={(event) => patch({ keyword: event.target.value })}
            placeholder="番組名や出演者"
            maxLength={512}
            className="mt-2"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip active={conditions.keyCS} onClick={() => patch({ keyCS: !conditions.keyCS })}>Aa 区別</Chip>
            <Chip active={conditions.keyRegExp} onClick={() => patch({ keyRegExp: !conditions.keyRegExp })}>正規表現</Chip>
          </div>
          <TargetToggles
            ids={["key-name", "key-desc", "key-ext"]}
            values={[conditions.name, conditions.description, conditions.extended]}
            onToggle={(index) =>
              patch(index === 0 ? { name: !conditions.name } : index === 1 ? { description: !conditions.description } : { extended: !conditions.extended })
            }
          />
        </div>
        <div>
          <label htmlFor="search-ignore" className="text-sm font-semibold">除外キーワード</label>
          <Input
            id="search-ignore"
            value={conditions.ignoreKeyword}
            onChange={(event) => patch({ ignoreKeyword: event.target.value })}
            placeholder="結果から除外する語句"
            maxLength={512}
            className="mt-2"
          />
          <TargetToggles
            ids={["ign-name", "ign-desc", "ign-ext"]}
            values={[conditions.ignoreName, conditions.ignoreDescription, conditions.ignoreExtended]}
            onToggle={(index) =>
              patch(index === 0 ? { ignoreName: !conditions.ignoreName } : index === 1 ? { ignoreDescription: !conditions.ignoreDescription } : { ignoreExtended: !conditions.ignoreExtended })
            }
          />
        </div>
      </div>

      {/* 放送波 */}
      <fieldset>
        <legend className="text-sm font-semibold">放送波</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {BROADCASTS.map((option) => (
            <Chip
              key={option.value}
              active={conditions.broadcasts[option.value]}
              onClick={() =>
                patch({ broadcasts: { ...conditions.broadcasts, [option.value]: !conditions.broadcasts[option.value] } })
              }
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      {/* チャンネル (任意)。選ばなければ放送波すべてが対象。 */}
      <fieldset>
        <legend className="text-sm font-semibold">チャンネル<span className="ml-2 text-xs font-normal text-muted-foreground">選ばなければ放送波すべて</span></legend>
        <div className="mt-2 max-h-40 overflow-auto rounded-lg border p-2">
          <div className="flex flex-wrap gap-1.5">
            {availableChannels.map((channel) => (
              <Chip key={channel.id} active={conditions.channelIds.includes(channel.id)} onClick={() => toggleChannel(channel.id)}>
                {channel.name}
              </Chip>
            ))}
          </div>
        </div>
      </fieldset>

      {/* ジャンル */}
      <fieldset>
        <legend className="text-sm font-semibold">ジャンル</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {GENRE_ENTRIES.map((genre) => (
            <Chip key={genre.value} active={conditions.genres.includes(genre.value)} onClick={() => toggleGenre(genre.value)}>
              {genre.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      {/* 時刻 (曜日 + 開始 + 範囲) */}
      <fieldset>
        <legend className="text-sm font-semibold">時刻<span className="ml-2 text-xs font-normal text-muted-foreground">曜日を選ぶと有効</span></legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WEEKDAYS.map((label, index) => (
            <Chip
              key={label}
              active={conditions.weekdays[index]}
              onClick={() =>
                patch({ weekdays: conditions.weekdays.map((on, position) => (position === index ? !on : on)) })
              }
            >
              {label}
            </Chip>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="w-16 text-muted-foreground">開始</span>
            <select className={fieldClassName} value={conditions.startHour} onChange={(event) => patch({ startHour: event.target.value })}>
              <option value="">指定なし</option>
              {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{hour} 時</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-16 text-muted-foreground">範囲</span>
            <select className={fieldClassName} value={conditions.rangeHours} onChange={(event) => patch({ rangeHours: event.target.value })}>
              <option value="">指定なし</option>
              {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour + 1}>{hour + 1} 時間</option>)}
            </select>
          </label>
        </div>
      </fieldset>

      {/* 長さ・期間・その他 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <span className="text-sm font-semibold">長さ (分)</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input type="number" min={0} inputMode="numeric" placeholder="最小" value={conditions.durationMin} onChange={(event) => patch({ durationMin: event.target.value })} />
            <Input type="number" min={0} inputMode="numeric" placeholder="最大" value={conditions.durationMax} onChange={(event) => patch({ durationMax: event.target.value })} />
          </div>
        </div>
        <div>
          <span className="text-sm font-semibold">放送期間</span>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input type="datetime-local" aria-label="放送期間の開始" value={conditions.periodStart} onChange={(event) => patch({ periodStart: event.target.value })} />
            <Input type="datetime-local" aria-label="放送期間の終了" value={conditions.periodEnd} min={conditions.periodStart || undefined} onChange={(event) => patch({ periodEnd: event.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex min-h-11 items-center justify-between gap-3 glass-field rounded-lg border px-3">
        <span id="free-only" className="text-sm font-medium">無料放送のみ</span>
        <Switch checked={conditions.isFree} aria-labelledby="free-only" onClick={() => patch({ isFree: !conditions.isFree })} />
      </div>

      {conditions.channelIds.length > 0 ? (
        <button type="button" onClick={() => patch({ channelIds: [] })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <X aria-hidden="true" className="size-3.5" />チャンネルの選択を解除
        </button>
      ) : null}
    </div>
  );
}
