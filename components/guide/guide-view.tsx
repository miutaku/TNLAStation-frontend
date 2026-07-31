"use client";

import { CalendarDays, Clock3, Radio, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import { ChannelLogo } from "@/components/channel-logo";
import { ProgramReserveDialog } from "@/components/guide/program-reserve-dialog";
import { WatchNowDialog } from "@/components/onair/watch-now-dialog";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import type { ChannelType, Config, Reserves, Schedule, ScheduleProgramItem } from "@/lib/api/types";
import { formatDuration, formatTime, genreName, programTone } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { hasFinished, reservedProgramIds } from "@/lib/program-marks";
import { usePreferences } from "@/lib/hooks/use-preferences";
import type { GuideDrawMode } from "@/lib/preferences";
import { cn } from "@/lib/utils";

type BroadcastFilter = "ALL" | ChannelType;

const BROADCAST_TYPE_LABELS: Record<ChannelType, string> = { GR: "地デジ", BS: "BS", CS: "CS", SKY: "SKY" };
const BROADCAST_TYPE_ORDER: readonly ChannelType[] = ["GR", "BS", "CS", "SKY"];

const HEADER_HEIGHT = 56;

/** 窓は常にその日の 0 時から。過ぎた時間帯も上へスクロールすれば見られる。 */
function windowStartFor(date: string): number {
  return jstStartOfDate(date);
}

/**
 * 開いたときに見せたい位置 (窓の先頭からの分)。今日なら現在時刻の 1 時間前。
 * 時に丸めるので毎分は動かず、番組表を 1 分ごとに取り直さずに済む。
 */
function leadMinutesFor(date: string, now: number): number {
  if (now <= 0 || date !== todayInJst()) return 0;
  const hourBefore = Math.floor((now - 3_600_000) / 3_600_000) * 3_600_000;
  return Math.max(0, (hourBefore - jstStartOfDate(date)) / 60_000);
}

function todayInJst(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function jstStartOfDate(value: string): number {
  return Date.parse(`${value}T00:00:00+09:00`);
}

/**
 * 1 局分の列。番組は時刻に比例した位置と高さで置き、左の時間軸と現在時刻の線に揃える。
 * 積み上げ表示では隣の局と時刻が揃わず、番組表として読めない。
 */
// 列を数フレームに分けて足すとき、既に置いた列まで描き直すと O(n^2) になって重くなる。
// memo で、番組表 (schedule) と座標系が同じ列は再描画を省く。
const ProgramColumn = memo(function ProgramColumn({ schedule, windowStart, windowMinutes, pixelsPerMinute, highlightGenres, showChannelLogo, reservedIds, now, onSelectProgram, onSelectChannel }: {
  schedule: Schedule;
  windowStart: number;
  windowMinutes: number;
  pixelsPerMinute: number;
  /** 目立たせる大分類ジャンル。空なら全番組を通常表示。 */
  highlightGenres: readonly number[];
  showChannelLogo: boolean;
  reservedIds: ReadonlySet<number>;
  now: number;
  onSelectProgram: (program: ScheduleProgramItem, channelName: string) => void;
  onSelectChannel: (channel: Schedule["channel"]) => void;
}) {
  return (
    <section aria-labelledby={`channel-${schedule.channel.id}`} className="min-w-0 border-r last:border-r-0">
      <header className="glass-header sticky top-0 z-20 rounded-none border-x-0 border-t-0">
        {/* 局名をタップすると「今すぐ再生」。番組表では放送中の局をすぐ見られるようにする。 */}
        <button
          type="button"
          className={cn(
            "flex h-14 w-full items-center justify-center text-left transition-colors hover:bg-muted/60",
            showChannelLogo
              ? "flex-col gap-0.5 px-1 min-[600px]:flex-row min-[600px]:gap-2 min-[600px]:px-2"
              : "px-2",
          )}
          onClick={() => onSelectChannel(schedule.channel)}
        >
          {showChannelLogo ? (
            <ChannelLogo channel={schedule.channel} className="w-9 min-[600px]:w-12" />
          ) : null}
          <div
            className={cn(
              "min-w-0",
              showChannelLogo
                ? "w-full text-center min-[600px]:w-auto min-[600px]:text-left"
                : "w-full text-center",
            )}
          >
            <h2
              id={`channel-${schedule.channel.id}`}
              className={cn(
                "line-clamp-2 font-semibold [overflow-wrap:anywhere]",
                showChannelLogo ? "text-xs leading-4 min-[600px]:text-sm min-[600px]:leading-4" : "text-sm leading-4",
              )}
            >
              {schedule.channel.name}
            </h2>
            <p className={cn("truncate text-xs leading-4 text-muted-foreground", showChannelLogo && "hidden min-[600px]:block")}>
              {schedule.channel.channelType}
              {schedule.channel.remoteControlKeyId ? ` ・ ${schedule.channel.remoteControlKeyId}ch` : ""}
            </p>
          </div>
        </button>
      </header>
      <div className="relative" style={{ height: `${windowMinutes * pixelsPerMinute}px` }}>
        <HourLines windowMinutes={windowMinutes} pixelsPerMinute={pixelsPerMinute} />
        {schedule.programs
          .filter((program) => program.endAt > windowStart && program.startAt < windowStart + windowMinutes * 60_000)
          .map((program) => {
            const offsetMinutes = (program.startAt - windowStart) / 60_000;
            const lengthMinutes = (program.endAt - program.startAt) / 60_000;
            const height = lengthMinutes * pixelsPerMinute;
            const reserved = reservedIds.has(program.id);
            const finished = hasFinished(program, now);
            const dimmed =
              highlightGenres.length > 0 &&
              ![program.genre1, program.genre2, program.genre3].some(
                (genre) => genre !== undefined && highlightGenres.includes(genre),
              );
            return (
              <button
                type="button"
                key={program.id}
                disabled={finished}
                className={cn(
                  "absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-1.5 text-left transition-shadow",
                  programTone(program.genre1),
                  dimmed && "opacity-35 saturate-50",
                  reserved && "border-2 border-destructive",
                  finished
                    ? "cursor-not-allowed opacity-45 grayscale"
                    : "hover:shadow-md hover:brightness-105",
                )}
                style={{ top: `${offsetMinutes * pixelsPerMinute}px`, height: `${height}px` }}
                aria-label={`${formatTime(program.startAt)} ${program.name}${finished ? " (放送終了)" : " の録画予約メニュー"}`}
                onClick={() => onSelectProgram(program, schedule.channel.name)}
              >
                <div className="flex items-center gap-1.5 text-[0.7rem] leading-4 font-medium text-muted-foreground">
                  <time dateTime={new Date(program.startAt).toISOString()}>{formatTime(program.startAt)}</time>
                  <span>({formatDuration(program.startAt, program.endAt)})</span>
                  {!program.isFree ? <Badge variant="outline">有料</Badge> : null}
                  {reserved ? <Badge variant="destructive">予約</Badge> : null}
                </div>
                <h3 className="mt-0.5 text-sm leading-5 font-semibold">{program.name}</h3>
                {/* 短い番組に説明を入れると番組名が隠れるため、入る高さのときだけ出す。 */}
                {program.description && height >= 108 ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{program.description}</p>
                ) : null}
                {height >= 150 ? (
                  <p className="mt-2 text-[0.7rem] font-medium text-muted-foreground">{genreName(program.genre1)}</p>
                ) : null}
              </button>
            );
          })}
      </div>
    </section>
  );
});

function HourLines({ windowMinutes, pixelsPerMinute }: { windowMinutes: number; pixelsPerMinute: number }) {
  return (
    <>
      {Array.from({ length: Math.ceil(windowMinutes / 60) }, (_, hour) => (
        <span
          key={hour}
          aria-hidden="true"
          className="absolute inset-x-0 border-t border-border/60"
          style={{ top: `${hour * 60 * pixelsPerMinute}px` }}
        />
      ))}
    </>
  );
}

function TimeAxis({ windowStart, windowMinutes, pixelsPerMinute }: { windowStart: number; windowMinutes: number; pixelsPerMinute: number }) {
  return (
    <div className="sticky left-0 z-30 w-14 shrink-0 border-r bg-background/95 backdrop-blur">
      <div className="glass-header sticky top-0 z-10 h-14 rounded-none border-x-0 border-t-0" />
      <div className="relative" style={{ height: `${windowMinutes * pixelsPerMinute}px` }}>
        {Array.from({ length: Math.ceil(windowMinutes / 60) }, (_, hour) => (
          <div
            key={hour}
            className="absolute inset-x-0 border-t border-border/60 pt-1 text-center text-xs font-medium text-muted-foreground"
            style={{ top: `${hour * 60 * pixelsPerMinute}px` }}
          >
            {formatTime(windowStart + hour * 3_600_000)}
          </div>
        ))}
      </div>
    </div>
  );
}

function NowLine({ now, windowStart, windowMinutes, pixelsPerMinute }: { now: number; windowStart: number; windowMinutes: number; pixelsPerMinute: number }) {
  const offsetMinutes = (now - windowStart) / 60_000;
  if (offsetMinutes < 0 || offsetMinutes > windowMinutes) return null;

  return (
    // 線は枠線ではなく塗りで引く。枠線は既定色の指定と競合しやすく、色が落ちても気づけない。
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-red-500"
      style={{ top: `${HEADER_HEIGHT + offsetMinutes * pixelsPerMinute}px` }}
    >
      <span className="absolute -top-2 left-0 rounded-r bg-red-500 px-1.5 py-0.5 text-[0.65rem] leading-3 font-bold text-white">
        {formatTime(now)}
      </span>
    </div>
  );
}

export const GUIDE_COLUMN_WIDTH_MOBILE = 100;
export const GUIDE_COLUMN_WIDTH_DESKTOP = 140;
const TIME_AXIS_WIDTH = 56;
const SEQUENTIAL_BATCH = 6;

/**
 * 番組表の本体。描画のしかたを設定に合わせて変える。
 * all: 全列を一度に。sequential: 手前から数フレームで。minimal: 見えている列だけ。
 */
function GuideGrid({
  schedules,
  windowStart,
  windowMinutes,
  now,
  drawMode,
  highlightGenres,
  showChannelLogo,
  columnScale,
  pixelsPerMinute,
  reservedIds,
  leadMinutes,
  onSelectProgram,
  onSelectChannel,
}: {
  schedules: Schedule[];
  windowStart: number;
  windowMinutes: number;
  now: number;
  drawMode: GuideDrawMode;
  highlightGenres: readonly number[];
  showChannelLogo: boolean;
  columnScale: number;
  pixelsPerMinute: number;
  reservedIds: ReadonlySet<number>;
  /** 窓の先頭から現在時刻の 1 時間前まで。開いたときここへ送る。 */
  leadMinutes: number;
  onSelectProgram: (program: ScheduleProgramItem, channelName: string) => void;
  onSelectChannel: (channel: Schedule["channel"]) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sequentialCount, setSequentialCount] = useState(SEQUENTIAL_BATCH);
  const [visibleRange, setVisibleRange] = useState({
    start: 0,
    end: schedules.length,
    columnWidth: GUIDE_COLUMN_WIDTH_MOBILE,
  });

  // 番組表が入れ替わったら手前へ戻す。描画中に前回分と比べて戻すのが React の作法。
  const [rendered, setRendered] = useState(schedules);
  if (rendered !== schedules) {
    setRendered(schedules);
    setSequentialCount(SEQUENTIAL_BATCH);
    setVisibleRange((range) => ({ start: 0, end: schedules.length, columnWidth: range.columnWidth }));
  }

  // 窓は 0 時から始まるので、開いたときは現在時刻の手前へ送る。過ぎた時間帯は上に残す。
  // 読み込み直後の 1 回だけ。以降に動かすと、見ている位置が勝手に戻る。
  const scrolledFor = useRef<Schedule[] | null>(null);
  useEffect(() => {
    const element = scrollRef.current;
    if (element === null || schedules.length === 0 || scrolledFor.current === schedules) return;
    scrolledFor.current = schedules;
    element.scrollTop = leadMinutes * pixelsPerMinute;
  }, [leadMinutes, pixelsPerMinute, schedules]);

  useEffect(() => {
    if (drawMode !== "sequential" || sequentialCount >= schedules.length) return;
    const frame = requestAnimationFrame(() => setSequentialCount((count) => count + SEQUENTIAL_BATCH));
    return () => cancelAnimationFrame(frame);
  }, [drawMode, sequentialCount, schedules.length]);

  useEffect(() => {
    if (drawMode !== "minimal") return;
    const element = scrollRef.current;
    if (element === null) return;
    const recompute = () => {
      const buffer = 2;
      // CSS のレスポンシブ幅を真値にする。表示と別の定数で計算すると、600px 境界をまたいだ
      // ときに仮想列のスペーサーがずれて空白や重なりが生じる。
      const computedWidth = Number.parseFloat(
        window.getComputedStyle(element).getPropertyValue("--guide-column-width"),
      );
      const columnWidth = Number.isFinite(computedWidth) ? computedWidth : GUIDE_COLUMN_WIDTH_DESKTOP;
      const first = Math.max(0, Math.floor((element.scrollLeft - TIME_AXIS_WIDTH) / columnWidth) - buffer);
      const last = Math.min(
        schedules.length,
        Math.ceil((element.scrollLeft + element.clientWidth - TIME_AXIS_WIDTH) / columnWidth) + buffer,
      );
      setVisibleRange((range) =>
        range.start === first && range.end === last && range.columnWidth === columnWidth
          ? range
          : { start: first, end: last, columnWidth },
      );
    };
    recompute();
    element.addEventListener("scroll", recompute, { passive: true });
    const observer = new ResizeObserver(recompute);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", recompute);
      observer.disconnect();
    };
  }, [drawMode, schedules.length]);

  const first = drawMode === "minimal" ? visibleRange.start : 0;
  const last =
    drawMode === "all"
      ? schedules.length
      : drawMode === "sequential"
        ? Math.min(sequentialCount, schedules.length)
        : visibleRange.end;
  const columns = schedules.slice(first, last);
  const leftSpacer = drawMode === "minimal" ? first * visibleRange.columnWidth : 0;
  const rightSpacer = drawMode === "minimal" ? (schedules.length - last) * visibleRange.columnWidth : 0;
  const scale = columnScale / 100;
  const gridStyle = {
    "--guide-column-width": `clamp(${GUIDE_COLUMN_WIDTH_MOBILE * scale}px, ${14 * scale}cqw, ${GUIDE_COLUMN_WIDTH_DESKTOP * scale}px)`,
  } as CSSProperties;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b bg-muted/55 px-4 py-2 text-xs text-muted-foreground">
        <Clock3 aria-hidden="true" className="size-4" />
        横にスクロールしてチャンネルを移動できます
      </div>
      <div
        ref={scrollRef}
        className="@container min-h-0 flex-1 overflow-auto overscroll-contain"
        style={gridStyle}
        role="region"
        aria-label="番組表"
      >
        {/* 時間軸・列・現在時刻の線を同じ座標系に置くため、内容全体を 1 つの relative でまとめる。 */}
        <div className="relative flex w-max min-w-full">
          <TimeAxis windowStart={windowStart} windowMinutes={windowMinutes} pixelsPerMinute={pixelsPerMinute} />
          {leftSpacer > 0 ? <div aria-hidden="true" style={{ width: leftSpacer }} className="shrink-0" /> : null}
          {columns.map((schedule) => (
            <div
              key={schedule.channel.id}
              className="shrink-0"
              style={{ width: "var(--guide-column-width)" }}
            >
              <ProgramColumn
                schedule={schedule}
                windowStart={windowStart}
                windowMinutes={windowMinutes}
                pixelsPerMinute={pixelsPerMinute}
                highlightGenres={highlightGenres}
                showChannelLogo={showChannelLogo}
                reservedIds={reservedIds}
                now={now}
                onSelectProgram={onSelectProgram}
                onSelectChannel={onSelectChannel}
              />
            </div>
          ))}
          {rightSpacer > 0 ? <div aria-hidden="true" style={{ width: rightSpacer }} className="shrink-0" /> : null}
          <NowLine now={now} windowStart={windowStart} windowMinutes={windowMinutes} pixelsPerMinute={pixelsPerMinute} />
        </div>
      </div>
    </>
  );
}

export function GuideView() {
  const [date, setDate] = useState(todayInJst);
  // 既定は地デジ。ふだん見るのは地上波が多く、全波 (100 局超) をいきなり描くより、開いた
  // ときの表示も速い。「すべて」も選べる。
  const [broadcast, setBroadcast] = useState<BroadcastFilter>("GR");
  const [now, setNow] = useState(0);
  const [selectedProgram, setSelectedProgram] = useState<{ program: ScheduleProgramItem; channelName: string } | null>(null);
  const [watchChannel, setWatchChannel] = useState<{ id: number; name: string } | null>(null);
  const { preferences } = usePreferences();

  const selectProgram = useCallback((program: ScheduleProgramItem, channelName: string) => {
    setSelectedProgram({ program, channelName });
  }, []);
  const selectChannel = useCallback((channel: Schedule["channel"]) => {
    setWatchChannel({ id: channel.id, name: channel.name });
  }, []);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const initialFrame = window.requestAnimationFrame(updateNow);
    const timer = window.setInterval(updateNow, 60_000);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.clearInterval(timer);
    };
  }, []);

  // 開始位置は時計から導くが、時に丸めてあるので毎分は動かない。時が変わったときだけ
  // 取り直し、番組表が 1 分ごとに再取得されるのを避ける。
  const windowStart = useMemo(() => windowStartFor(date), [date]);
  // 前に遡れるぶんだけ窓を広げる。見える先の長さ (guideLength) は変えない。
  const leadMinutes = useMemo(() => leadMinutesFor(date, now), [date, now]);

  const loadGuide = useCallback(
    async (signal: AbortSignal): Promise<{ config: Config; schedules: Schedule[]; reserves: Reserves }> => {
      const startAt = windowStart;
      const [config, schedules, reserves] = await Promise.all([
        apiClient.getConfig(signal),
        apiClient.getSchedules(
          {
            startAt,
            endAt: startAt + (leadMinutes + preferences.guideLength * 60) * 60_000,
            isHalfWidth: preferences.isHalfWidthDisplayed,
            isFree: preferences.isShowOnlyFreePrograms ? true : undefined,
            GR: broadcast === "ALL" || broadcast === "GR",
            BS: broadcast === "ALL" || broadcast === "BS",
            CS: broadcast === "ALL" || broadcast === "CS",
            SKY: broadcast === "ALL" || broadcast === "SKY",
          },
          signal,
        ),
        apiClient.getReserves({ type: "normal", isHalfWidth: preferences.isHalfWidthDisplayed, limit: 2000 }, signal),
      ]);
      return { config, schedules, reserves };
    },
    [broadcast, leadMinutes, preferences.guideLength, preferences.isHalfWidthDisplayed, preferences.isShowOnlyFreePrograms, windowStart],
  );
  const resource = useApiResource(loadGuide);
  const windowMinutes = leadMinutes + preferences.guideLength * 60;
  const hasPrograms = resource.data?.schedules.some((schedule) => schedule.programs.length > 0) ?? false;
  const schedules = useMemo(() => resource.data?.schedules ?? [], [resource.data?.schedules]);
  const reservedIds = useMemo(
    () => reservedProgramIds(resource.data?.reserves.reserves ?? []),
    [resource.data?.reserves.reserves],
  );

  // config.broadcast は実際に受信できる放送波。読み込み前は全種別を出し、届き次第絞り込む。
  const availableBroadcastTypes = useMemo(
    () => (resource.data ? BROADCAST_TYPE_ORDER.filter((type) => resource.data!.config.broadcast[type]) : BROADCAST_TYPE_ORDER),
    [resource.data],
  );
  const filters: { value: BroadcastFilter; label: string }[] = [
    ...(availableBroadcastTypes.length > 1 ? [{ value: "ALL" as const, label: "すべて" }] : []),
    ...availableBroadcastTypes.map((type) => ({ value: type as BroadcastFilter, label: BROADCAST_TYPE_LABELS[type] })),
  ];

  // Note: レンダー中に state を調整する React 推奨パターン (effect だと cascading
  // render を招く)。選択中の放送波が使えなくなったら、使える放送波へ寄せる。
  const [lastCheckedConfig, setLastCheckedConfig] = useState<Config | null>(null);
  if (resource.data && resource.data.config !== lastCheckedConfig) {
    setLastCheckedConfig(resource.data.config);
    if (broadcast !== "ALL" && !availableBroadcastTypes.includes(broadcast as ChannelType)) {
      setBroadcast(availableBroadcastTypes[0] ?? "ALL");
    }
  }

  const resourceState = (
    <>
      {resource.isLoading ? <ContentSkeleton cards={4} /> : null}
      {resource.error ? <ErrorState description={resource.error.message} onRetry={resource.reload} /> : null}
      {resource.data && !hasPrograms ? (
        <EmptyState
          title="番組情報がありません"
          description="選択した日付と放送波には表示できる番組がありません。条件を変更するか、EPG 更新後に再試行してください。"
        />
      ) : null}
      {resource.data && hasPrograms ? (
        <div className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
          <GuideGrid
            schedules={schedules}
            windowStart={windowStart}
            windowMinutes={windowMinutes}
            now={now}
            drawMode={preferences.guideDrawMode}
            highlightGenres={preferences.guideGenres}
            showChannelLogo={preferences.isShowGuideChannelLogos}
            columnScale={preferences.guideColumnScale}
            pixelsPerMinute={preferences.guidePixelsPerMinute}
            reservedIds={reservedIds}
            leadMinutes={leadMinutes}
            onSelectProgram={selectProgram}
            onSelectChannel={selectChannel}
          />
        </div>
      ) : null}
    </>
  );

  // Note: このページは AppShell 側で main を viewport 固定の flex 列にしているため、
  // h-full ではなく flex-1 だけで高さをつなぐ (h-full は親の高さ確定に依存し崩れやすい)。
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* モバイル・タブレットでは番組表ページの主役は表そのものなので、タイトル・日付・
          放送波・設定・更新を 1 行に収める最小限のツールバーにして、残りの縦幅をできるだけ
          番組表に譲る。PC (lg 以上) は幅にも高さにも余裕があるので、元の見出し・独立した
          フィルターカードの形に戻す。 */}
      <div className="shrink-0 overflow-x-hidden overflow-y-auto px-3 pt-3 sm:px-4 lg:px-6 lg:pt-8">
        <div className="mb-2 flex flex-wrap items-center gap-2 lg:hidden">
          <h1 className="mr-auto text-lg font-bold tracking-tight">番組表</h1>
          <Input
            id="guide-date"
            type="date"
            aria-label="放送日"
            value={date}
            onChange={(event) => event.target.value && setDate(event.target.value)}
            className="h-9 w-auto"
          />
          <div role="group" aria-label="放送波" className="flex gap-1 rounded-lg bg-muted p-1">
            {filters.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                size="sm"
                variant={broadcast === filter.value ? "default" : "ghost"}
                aria-pressed={broadcast === filter.value}
                onClick={() => setBroadcast(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <Button asChild variant="ghost" size="icon">
            <Link href="/guide/setting" aria-label="番組表設定">
              <Settings aria-hidden="true" />
            </Link>
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="更新" onClick={resource.revalidate} disabled={resource.isRefreshing}>
            <RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />
          </Button>
        </div>

        <div className="hidden lg:block">
          <PageHeader
            eyebrow="Program guide"
            title="番組表"
            description="チャンネルを横に、放送予定を時刻順に表示します。日付と放送波を選んで絞り込めます。"
            actions={
              <>
                <Button asChild variant="ghost"><Link href="/guide/setting"><Settings aria-hidden="true" />番組表設定</Link></Button>
                <Button type="button" variant="ghost" onClick={resource.revalidate} disabled={resource.isRefreshing}>
                  <RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />
                  更新
                </Button>
              </>
            }
          />

          <div className="mb-5 flex flex-col gap-4 glass-panel rounded-2xl p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-52">
              <label htmlFor="guide-date-desktop" className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <CalendarDays aria-hidden="true" className="size-4 text-primary" />
                放送日
              </label>
              <Input
                id="guide-date-desktop"
                type="date"
                value={date}
                onChange={(event) => event.target.value && setDate(event.target.value)}
              />
            </div>
            <fieldset className="min-w-0">
              <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Radio aria-hidden="true" className="size-4 text-primary" />
                放送波
              </legend>
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1">
                {filters.map((filter) => (
                  <Button
                    key={`desktop-${filter.value}`}
                    type="button"
                    size="sm"
                    variant={broadcast === filter.value ? "default" : "ghost"}
                    aria-pressed={broadcast === filter.value}
                    onClick={() => setBroadcast(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      </div>

      {/* BottomNav (h-[4.5rem] + bottom-[safe-area+0.75rem]、lg 以上では非表示) の下に
          番組表が潜り込まないよう、その実寸ぶんを正確に下 padding として確保する。 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+5.25rem)] sm:px-6 lg:px-10 lg:pb-8">
        {resourceState}
      </div>

      {resource.data ? (
        <ProgramReserveDialog
          program={selectedProgram?.program ?? null}
          channelName={selectedProgram?.channelName ?? ""}
          config={resource.data.config}
          onClose={() => setSelectedProgram(null)}
        />
      ) : null}
      {resource.data ? (
        <WatchNowDialog channel={watchChannel} config={resource.data.config} onClose={() => setWatchChannel(null)} />
      ) : null}
    </div>
  );
}
