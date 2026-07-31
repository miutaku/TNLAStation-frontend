"use client";

import { Activity, Circle, Play, Radio, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import { ChannelLogo } from "@/components/channel-logo";
import {
  collectionLayoutClass,
  CollectionViewToggle,
  type CollectionViewMode,
  useCollectionViewMode,
} from "@/components/collection-view";
import { ProgramReserveDialog } from "@/components/guide/program-reserve-dialog";
import { WatchNowDialog } from "@/components/onair/watch-now-dialog";
import { PageHeader } from "@/components/page-header";
import {
  TableColumnVisibilityMenu,
  type TableColumnVisibilityState,
  useTableColumnVisibility,
} from "@/components/table-column-visibility";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api/client";
import type { ChannelItem, ChannelType, Config, LiveStreamInfoItem, Records, Schedule, ScheduleProgramItem, StreamInfo } from "@/lib/api/types";
import { calculateElapsedPercentage, formatDuration, formatTime } from "@/lib/format";
import { describeMissingProgram, findCurrentProgram, nextScheduleRefreshAt } from "@/lib/onair-schedule";
import { recordingProgramIds } from "@/lib/program-marks";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { useRevalidateOnFocus } from "@/lib/hooks/use-revalidate-on-focus";
import { usePreferences } from "@/lib/hooks/use-preferences";

type BroadcastFilter = "ALL" | ChannelType;

const onAirTableColumns = [
  { key: "logo", label: "局ロゴ" },
  { key: "station", label: "局名" },
  { key: "service", label: "サービス" },
  { key: "program", label: "放送中の番組" },
  { key: "airtime", label: "放送時間" },
  { key: "stream", label: "配信" },
  { key: "actions", label: "操作" },
] as const;
type OnAirTableColumn = (typeof onAirTableColumns)[number]["key"];

function isAudioVideoService(serviceType?: number): boolean {
  return serviceType === undefined || [0x01, 0x02, 0xa1, 0xa2, 0xa5, 0xa6, 0xad].includes(serviceType);
}

function isLiveStream(stream: LiveStreamInfoItem): boolean {
  return stream.type === "LiveStream" || stream.type === "LiveHLS";
}

export interface OnAirChannelGroup {
  key: string;
  channels: ChannelItem[];
}

/**
 * 同じ放送局のメイン／サブサービスをまとめるキー。
 *
 * リモコン番号だけでは地域違いの同番号局を混ぜるため、放送波と networkId も含める。
 * リモコン番号を持たない放送波は、物理チャンネルだけだと同じ多重に載る無関係なCS局まで
 * 混ざるため、サービス番号を除いた局名も加える。
 */
export function onAirChannelGroupKey(channel: ChannelItem): string {
  const normalizedName = channel.halfWidthName
    .normalize("NFKC")
    .replace(/\s+/gu, "")
    .replace(/[・._-]?\d{1,3}$/u, "")
    .toLocaleLowerCase("ja-JP");
  const station = channel.remoteControlKeyId === undefined
    ? `physical:${channel.channel}:station:${normalizedName}`
    : `remote:${channel.remoteControlKeyId}`;
  return `${channel.channelType}:network:${channel.networkId}:${station}`;
}

export function groupOnAirChannels(channels: readonly ChannelItem[]): OnAirChannelGroup[] {
  const groups = new Map<string, ChannelItem[]>();
  for (const channel of channels) {
    const key = onAirChannelGroupKey(channel);
    const group = groups.get(key);
    if (group) {
      group.push(channel);
    } else {
      groups.set(key, [channel]);
    }
  }
  return [...groups].map(([key, groupedChannels]) => ({
    key,
    channels: [...groupedChannels].sort((left, right) => left.serviceId - right.serviceId),
  }));
}

export function isOnAirChannelSelectable(
  group: OnAirChannelGroup,
  channelId: number,
  programsByChannel: ReadonlyMap<number, ScheduleProgramItem>,
): boolean {
  return group.channels[0]?.id === channelId || programsByChannel.has(channelId);
}

export function selectableOnAirChannels(
  group: OnAirChannelGroup,
  programsByChannel: ReadonlyMap<number, ScheduleProgramItem>,
): ChannelItem[] {
  return group.channels.filter((channel) => isOnAirChannelSelectable(group, channel.id, programsByChannel));
}

function channelDisplayName(channel: ChannelItem, halfWidth: boolean): string {
  return halfWidth ? channel.halfWidthName : channel.name;
}

function channelOptionLabel(channel: ChannelItem, channels: readonly ChannelItem[], halfWidth: boolean): string {
  const name = channelDisplayName(channel, halfWidth);
  const duplicatedName = channels.some(
    (candidate) => candidate.id !== channel.id && channelDisplayName(candidate, halfWidth) === name,
  );
  return duplicatedName ? `${name}（サービス ${channel.serviceId}）` : name;
}

/**
 * 物理局 1 局ぶんのカード。選択中のサービスから番組・ストリーム・操作対象をすべて導くので、
 * サブチャンネルを切り替えたあとに別サービスを予約／視聴することがない。
 */
export function OnAirChannelGroupCard({
  group,
  programsByChannel,
  schedulesByChannel,
  recordingIds,
  streamsByChannel,
  currentTime,
  halfWidth,
  viewMode,
  onReserve,
  onWatch,
}: {
  group: OnAirChannelGroup;
  programsByChannel: ReadonlyMap<number, ScheduleProgramItem>;
  schedulesByChannel: ReadonlyMap<number, Schedule>;
  recordingIds: ReadonlySet<number>;
  streamsByChannel: ReadonlyMap<number, LiveStreamInfoItem>;
  currentTime: number;
  halfWidth: boolean;
  viewMode: CollectionViewMode;
  onReserve: (program: ScheduleProgramItem, channelName: string) => void;
  onWatch: (channel: ChannelItem) => void;
}) {
  const [selectedChannelId, setSelectedChannelId] = useState(group.channels[0]?.id);
  const selectableChannels = selectableOnAirChannels(group, programsByChannel);
  const selectedChannel = selectableChannels.find((candidate) => candidate.id === selectedChannelId);
  const channel = selectedChannel ?? selectableChannels[0];
  if (!channel) return null;
  if (selectedChannel && selectedChannel.id !== channel.id) setSelectedChannelId(channel.id);

  const program = programsByChannel.get(channel.id);
  const stream = streamsByChannel.get(channel.id);
  const channelName = halfWidth ? channel.halfWidthName : channel.name;
  const progress = program ? calculateElapsedPercentage(program.startAt, program.endAt, currentTime) : 0;
  const titleId = `channel-${channel.id}`;
  const selectorId = `channel-selector-${group.channels[0].id}`;

  return (
    <Card className={viewMode === "list" ? "overflow-hidden rounded-lg shadow-none transition-colors hover:bg-muted/35" : "overflow-hidden transition-shadow hover:shadow-md"}>
      <CardContent className={viewMode === "list" ? "py-4 sm:py-4" : "pt-5 sm:pt-6"}>
        <article aria-labelledby={titleId}>
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
            {/* 局ロゴ・局名・番組をタップすると、放送中の番組の録画予約メニューを開く。 */}
            <button
              type="button"
              className="flex min-w-0 items-start gap-3 rounded-lg text-left transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
              disabled={!program}
              onClick={() => program && onReserve(program, channelName)}
            >
              <ChannelLogo channel={channel} />
              <div className="min-w-0">
                <h2 id={titleId} className="truncate font-semibold">{channelName}</h2>
                {/* リモコン番号を持たない BS・CS は物理チャンネルで示す。局 ID を出しても意味が伝わらない。 */}
                <p className="mt-0.5 text-xs text-muted-foreground">{channel.channelType} ・ {channel.remoteControlKeyId !== undefined ? `${channel.remoteControlKeyId}ch` : channel.channel}</p>
              </div>
            </button>
            <div className="flex flex-wrap justify-end gap-2">
              {selectableChannels.length > 1 ? <Badge variant="outline">{selectableChannels.length} 放送中サービス</Badge> : null}
              {program && recordingIds.has(program.id) ? <Badge variant="destructive"><Circle aria-hidden="true" className="fill-current" />録画中</Badge> : null}
              {stream ? <Badge variant="success"><Activity aria-hidden="true" />視聴中</Badge> : null}
            </div>
          </div>

          {selectableChannels.length > 1 ? (
            <div className="mt-4 min-w-0 rounded-lg bg-muted/60 p-2.5">
              <label htmlFor={selectorId} className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                サブチャンネル
              </label>
              <select
                id={selectorId}
                className="h-9 min-w-0 w-full max-w-full rounded-lg border border-input bg-background/90 px-2.5 text-sm shadow-xs"
                value={channel.id}
                onChange={(event) => setSelectedChannelId(Number(event.target.value))}
              >
                {selectableChannels.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {channelOptionLabel(candidate, selectableChannels, halfWidth)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {program ? (
            <button
              type="button"
              className="mt-5 block w-full text-left transition-opacity hover:opacity-80"
              onClick={() => onReserve(program, channelName)}
              aria-label={`${program.name} の録画予約メニュー`}
            >
              <h3 className="line-clamp-2 text-sm font-semibold leading-6">{program.name}</h3>
              {program.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{program.description}</p> : null}
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(program.startAt)}</span>
                  <span>{formatDuration(program.startAt, program.endAt)}</span>
                  <span>{formatTime(program.endAt)}</span>
                </div>
                <progress className="h-1.5 w-full overflow-hidden rounded-full accent-primary" max={100} value={progress} aria-label={`${program.name} の進行状況`} />
              </div>
            </button>
          ) : (
            // どちらの理由でも放送自体はしている。視聴の導線は残す。
            <p className="mt-5 rounded-lg border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
              {describeMissingProgram(schedulesByChannel.get(channel.id)) === "off-air"
                ? "現在放送中の番組はありません"
                : "番組情報を取得できませんでした"}
            </p>
          )}
          <div className="mt-4 flex justify-end border-t pt-4"><Button type="button" size="sm" onClick={() => onWatch(channel)}><Play aria-hidden="true" />今すぐ再生</Button></div>
        </article>
      </CardContent>
    </Card>
  );
}

export function OnAirChannelGroupRow({
  group,
  programsByChannel,
  schedulesByChannel,
  recordingIds,
  streamsByChannel,
  currentTime,
  halfWidth,
  onReserve,
  onWatch,
  columns,
}: {
  group: OnAirChannelGroup;
  programsByChannel: ReadonlyMap<number, ScheduleProgramItem>;
  schedulesByChannel: ReadonlyMap<number, Schedule>;
  recordingIds: ReadonlySet<number>;
  streamsByChannel: ReadonlyMap<number, LiveStreamInfoItem>;
  currentTime: number;
  halfWidth: boolean;
  onReserve: (program: ScheduleProgramItem, channelName: string) => void;
  onWatch: (channel: ChannelItem) => void;
  columns?: TableColumnVisibilityState<OnAirTableColumn>;
}) {
  const [selectedChannelId, setSelectedChannelId] = useState(group.channels[0]?.id);
  const selectableChannels = selectableOnAirChannels(group, programsByChannel);
  const selectedChannel = selectableChannels.find((candidate) => candidate.id === selectedChannelId);
  const channel = selectedChannel ?? selectableChannels[0];
  if (!channel) return null;
  if (selectedChannel && selectedChannel.id !== channel.id) setSelectedChannelId(channel.id);

  const program = programsByChannel.get(channel.id);
  const stream = streamsByChannel.get(channel.id);
  const channelName = channelDisplayName(channel, halfWidth);
  const progress = program ? calculateElapsedPercentage(program.startAt, program.endAt, currentTime) : 0;
  const selectorId = `channel-table-selector-${group.channels[0].id}`;
  const isVisible = (key: OnAirTableColumn) => columns?.isVisible(key) ?? true;
  const visibleColumns = (columns?.columns ?? onAirTableColumns).filter((column) => isVisible(column.key));

  const renderCell = (key: OnAirTableColumn) => {
    switch (key) {
      case "logo":
        return (
          <>
            <ChannelLogo channel={channel} />
            {!isVisible("station") ? <span className="sr-only">{channelName}</span> : null}
          </>
        );
      case "station":
        return (
          <div className="min-w-48">
            <p className="max-w-48 truncate font-semibold">{channelName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {channel.channelType} ・ {channel.remoteControlKeyId !== undefined ? `${channel.remoteControlKeyId}ch` : channel.channel}
            </p>
          </div>
        );
      case "service":
        return selectableChannels.length > 1 ? (
          <>
            <label htmlFor={selectorId} className="sr-only">サブチャンネル</label>
            <select
              id={selectorId}
              className="h-9 min-w-52 rounded-lg border border-input bg-background px-2.5 text-sm"
              value={channel.id}
              onChange={(event) => setSelectedChannelId(Number(event.target.value))}
            >
              {selectableChannels.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {channelOptionLabel(candidate, selectableChannels, halfWidth)}
                </option>
              ))}
            </select>
          </>
        ) : <span className="text-muted-foreground">メイン</span>;
      case "program":
        return program ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="text-left font-semibold leading-6 hover:text-primary hover:underline" onClick={() => onReserve(program, channelName)}>
              {program.name}
            </button>
            {recordingIds.has(program.id) ? <Badge variant="destructive"><Circle aria-hidden="true" className="fill-current" />録画中</Badge> : null}
          </div>
        ) : (
          <span className="text-muted-foreground">
            {describeMissingProgram(schedulesByChannel.get(channel.id)) === "off-air" ? "放送中の番組なし" : "番組情報を取得できませんでした"}
          </span>
        );
      case "airtime":
        return program ? (
          <>
            <p>{formatTime(program.startAt)}–{formatTime(program.endAt)}</p>
            <div className="mt-2 flex items-center gap-2">
              <progress className="h-1.5 w-28 accent-primary" max={100} value={progress} aria-label={`${program.name} の進行状況`} />
              <span className="text-xs tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          </>
        ) : "—";
      case "stream":
        return stream ? <Badge variant="success"><Activity aria-hidden="true" />視聴中</Badge> : <Badge variant="outline">待機</Badge>;
      case "actions":
        return (
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" aria-label={`${channelName} の放送中番組を予約`} disabled={!program} onClick={() => program && onReserve(program, channelName)}>予約</Button>
            <Button type="button" size="sm" aria-label={`${channelName} を再生`} onClick={() => onWatch(channel)}><Play aria-hidden="true" />再生</Button>
          </div>
        );
    }
  };

  const cellClassName: Partial<Record<OnAirTableColumn, string>> = {
    logo: "w-24",
    program: "max-w-[30rem] whitespace-normal",
    airtime: "min-w-52",
  };

  return (
    <TableRow>
      {visibleColumns.map((column) => (
        <TableCell key={column.key} className={cellClassName[column.key]}>
          {renderCell(column.key)}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function OnAirView() {
  const [broadcast, setBroadcast] = useState<BroadcastFilter>("ALL");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [reserveTarget, setReserveTarget] = useState<{ program: ScheduleProgramItem; channelName: string } | null>(null);
  const [watchChannel, setWatchChannel] = useState<{ id: number; name: string } | null>(null);
  const { preferences } = usePreferences();
  const [viewMode, setViewMode] = useCollectionViewMode("onair");
  const tableColumns = useTableColumnVisibility("onair", onAirTableColumns);
  const loadOnAir = useCallback(async (signal: AbortSignal): Promise<{ channels: ChannelItem[]; schedules: Schedule[]; streams: StreamInfo; config: Config; recording: Records }> => {
    const [channels, schedules, streams, config, recording] = await Promise.all([
      apiClient.getChannels(signal),
      apiClient.getBroadcastingSchedules(preferences.isHalfWidthDisplayed, signal),
      apiClient.getStreams(preferences.isHalfWidthDisplayed, signal),
      apiClient.getConfig(signal),
      apiClient.getRecording({ isHalfWidth: preferences.isHalfWidthDisplayed, limit: 100 }, signal),
    ]);
    return { channels: channels.filter((channel) => isAudioVideoService(channel.type)), schedules, streams, config, recording };
  }, [preferences.isHalfWidthDisplayed]);
  const resource = useApiResource(loadOnAir);

  const reserve = useCallback((program: ScheduleProgramItem, channelName: string) => setReserveTarget({ program, channelName }), []);
  const watch = useCallback((channel: ChannelItem) => setWatchChannel({ id: channel.id, name: preferences.isHalfWidthDisplayed ? channel.halfWidthName : channel.name }), [preferences.isHalfWidthDisplayed]);

  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now());
    const initialFrame = window.requestAnimationFrame(updateTime);
    const progressTimer = window.setInterval(updateTime, 10_000);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.clearInterval(progressTimer);
    };
  }, []);
  useRevalidateOnFocus(resource);

  // 番組が終わると手元の一式が古くなる。放送しているのに「番組情報が無い」に見えるので取り直す。
  const revalidate = resource.revalidate;
  const refreshAt = useMemo(
    () => nextScheduleRefreshAt(resource.data?.schedules ?? [], resource.loadedAt || currentTime),
    [currentTime, resource.data?.schedules, resource.loadedAt],
  );
  useEffect(() => {
    if (refreshAt === null || currentTime < refreshAt) return;
    revalidate();
  }, [currentTime, refreshAt, revalidate]);

  const liveStreams = useMemo(
    () => resource.data?.streams.items.filter(isLiveStream) ?? [],
    [resource.data?.streams.items],
  );
  const streamsByChannel = useMemo(() => new Map(liveStreams.map((stream) => [stream.channelId, stream])), [liveStreams]);
  const recordingIds = useMemo(
    () => recordingProgramIds(resource.data?.recording.records ?? []),
    [resource.data?.recording.records],
  );
  const schedulesByChannel = useMemo(
    () => new Map((resource.data?.schedules ?? []).map((schedule) => [schedule.channel.id, schedule])),
    [resource.data?.schedules],
  );
  const programsByChannel = useMemo(
    () => new Map((resource.data?.schedules ?? [])
      .map((schedule) => [schedule.channel.id, findCurrentProgram(schedule, currentTime)] as const)
      .filter((entry): entry is readonly [number, ScheduleProgramItem] => entry[1] !== undefined)),
    [currentTime, resource.data?.schedules],
  );
  const channels = useMemo(
    () => resource.data?.channels.filter((channel) => broadcast === "ALL" || channel.channelType === broadcast) ?? [],
    [broadcast, resource.data?.channels],
  );
  const channelGroups = useMemo(() => groupOnAirChannels(channels), [channels]);
  const recordedStreamCount = resource.data?.streams.items.filter((stream) => stream.type === "RecordedStream" || stream.type === "RecordedHLS").length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Live channels"
        title="放送中"
        description="視聴可能な放送局と、現在稼働しているライブストリームを確認できます。"
        actions={
          <Button type="button" variant="ghost" onClick={resource.revalidate} disabled={resource.isRefreshing}>
            <RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />更新
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 glass-panel rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <fieldset>
          <legend className="sr-only">放送波で絞り込む</legend>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1">
            {(["ALL", "GR", "BS", "CS", "SKY"] as const).map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={broadcast === type ? "default" : "ghost"}
                aria-pressed={broadcast === type}
                onClick={() => setBroadcast(type)}
              >
                {type === "ALL" ? "すべて" : type}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          {resource.data ? (
            <>
              <Badge variant="success"><Activity aria-hidden="true" />ライブ {liveStreams.length}</Badge>
              <Badge variant="outline">録画再生 {recordedStreamCount}</Badge>
            </>
          ) : null}
          {viewMode === "list" ? <TableColumnVisibilityMenu state={tableColumns} label="放送中一覧の列" /> : null}
          <CollectionViewToggle value={viewMode} onChange={setViewMode} label="放送中一覧の表示形式" />
        </div>
      </div>

      {resource.isLoading ? <ContentSkeleton cards={6} /> : null}
      {resource.error ? <ErrorState title="放送局情報を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /> : null}
      {!resource.isLoading && resource.data && channels.length === 0 ? (
        <EmptyState title="表示できる放送局はありません" description="放送波の条件を変更するか、チャンネル設定を確認してください。" />
      ) : null}
      {!resource.isLoading && resource.data && channels.length > 0 ? (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Radio aria-hidden="true" className="size-4 text-primary" />
            {channelGroups.length} 放送局
            {channelGroups.length !== channels.length ? <span>（{channels.length} サービス）</span> : null}
          </div>
          {viewMode === "list" ? (
            <Table className="min-w-[74rem]">
              <TableCaption>ライブチャンネル</TableCaption>
              <TableHeader>
                <TableRow>
                  {tableColumns.columns.filter((column) => tableColumns.isVisible(column.key)).map((column) => (
                    <TableHead key={column.key} className={column.key === "actions" ? "text-right" : undefined}>
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelGroups.map((group) => (
                  <OnAirChannelGroupRow
                    key={group.key}
                    group={group}
                    programsByChannel={programsByChannel}
                    schedulesByChannel={schedulesByChannel}
                    recordingIds={recordingIds}
                    streamsByChannel={streamsByChannel}
                    currentTime={currentTime}
                    halfWidth={preferences.isHalfWidthDisplayed}
                    onReserve={reserve}
                    onWatch={watch}
                    columns={tableColumns}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className={collectionLayoutClass(viewMode, "sm:grid-cols-2 2xl:grid-cols-3")} aria-label="ライブチャンネル">
              {channelGroups.map((group) => (
                <OnAirChannelGroupCard
                  key={group.key}
                  group={group}
                  programsByChannel={programsByChannel}
                  schedulesByChannel={schedulesByChannel}
                  recordingIds={recordingIds}
                  streamsByChannel={streamsByChannel}
                  currentTime={currentTime}
                  halfWidth={preferences.isHalfWidthDisplayed}
                  viewMode={viewMode}
                  onReserve={reserve}
                  onWatch={watch}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {resource.data ? (
        <ProgramReserveDialog
          program={reserveTarget?.program ?? null}
          channelName={reserveTarget?.channelName ?? ""}
          config={resource.data.config}
          onClose={() => setReserveTarget(null)}
        />
      ) : null}
      {resource.data ? (
        <WatchNowDialog channel={watchChannel} config={resource.data.config} onClose={() => setWatchChannel(null)} />
      ) : null}
    </>
  );
}
