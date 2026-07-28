"use client";

import { CircleDot, CircleStop, Clock3, HardDrive, Radio, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import {
  collectionLayoutClass,
  CollectionViewToggle,
  type CollectionViewMode,
  useCollectionViewMode,
} from "@/components/collection-view";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import {
  TableColumnVisibilityMenu,
  type TableColumnVisibilityState,
  useTableColumnVisibility,
} from "@/components/table-column-visibility";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import type { RecordedItem, Records } from "@/lib/api/types";
import { calculateElapsedPercentage, formatBytes, formatDateTime, formatDuration, formatTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { useChannelNames } from "@/lib/hooks/use-channel-names";
import { useRevalidateOnFocus } from "@/lib/hooks/use-revalidate-on-focus";
import { usePreferences } from "@/lib/hooks/use-preferences";

const recordingTableColumns = [
  { key: "status", label: "状態" },
  { key: "program", label: "番組" },
  { key: "station", label: "放送局" },
  { key: "start", label: "開始" },
  { key: "end", label: "終了予定" },
  { key: "progress", label: "進捗" },
  { key: "size", label: "現在サイズ" },
  { key: "actions", label: "操作" },
] as const;
type RecordingTableColumn = (typeof recordingTableColumns)[number]["key"];

function RecordingCard({ item, currentTime, viewMode, busy, onStop }: { item: RecordedItem; currentTime: number; viewMode: CollectionViewMode; busy: boolean; onStop: (item: RecordedItem) => void }) {
  const channelName = useChannelNames();
  const progress = calculateElapsedPercentage(item.startAt, item.endAt, currentTime);
  const fileSize = item.videoFiles?.reduce((total, file) => total + file.size, 0) ?? 0;

  return (
    <Card className={viewMode === "list" ? "overflow-hidden rounded-lg border-red-500/20 shadow-none" : "overflow-hidden border-red-500/20"}>
      <CardContent className={viewMode === "list" ? "py-4 sm:py-4" : "pt-5 sm:pt-6"}>
        <article aria-labelledby={`recording-${item.id}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive"><CircleDot aria-hidden="true" className="animate-pulse" />録画中</Badge>
                {item.isEncoding ? <Badge variant="warning">エンコード中</Badge> : null}
              </div>
              <h2 id={`recording-${item.id}`} className="mt-3 text-lg font-semibold leading-7 text-balance">{item.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{channelName(item.channelId)} ・ {formatDuration(item.startAt, item.endAt)}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">#{item.id}</span>
          </div>

          {item.description ? <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description}</p> : null}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <span>{formatTime(item.startAt)} 開始</span>
              <span className="font-semibold tabular-nums text-foreground">{Math.round(progress)}%</span>
              <span>{formatTime(item.endAt)} 終了予定</span>
            </div>
            <progress className="h-2 w-full overflow-hidden rounded-full accent-red-500" max={100} value={progress} aria-label={`${item.name} の録画進捗`} />
          </div>

          <dl className="mt-5 grid gap-3 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4 text-primary" />
              <dt className="sr-only">開始日時</dt>
              <dd>{formatDateTime(item.startAt)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Radio aria-hidden="true" className="size-4 text-primary" />
              <dt className="sr-only">チャンネル</dt>
              <dd>{channelName(item.channelId)}</dd>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <HardDrive aria-hidden="true" className="size-4 text-primary" />
              <dt className="sr-only">現在のファイルサイズ</dt>
              <dd>{fileSize > 0 ? formatBytes(fileSize) : "計測中"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-end border-t pt-4">
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => onStop(item)}>
              <CircleStop aria-hidden="true" />
              {busy ? "停止中…" : "録画を停止"}
            </Button>
          </div>
        </article>
      </CardContent>
    </Card>
  );
}

const recordingHeaderClassName: Partial<Record<RecordingTableColumn, string>> = {
  actions: "text-right",
};

function RecordingTable({
  records,
  currentTime,
  busyId,
  onStop,
  columns,
}: {
  records: RecordedItem[];
  currentTime: number;
  busyId: number | null;
  onStop: (item: RecordedItem) => void;
  columns: TableColumnVisibilityState<RecordingTableColumn>;
}) {
  const channelName = useChannelNames();
  const visibleColumns = columns.columns.filter((column) => columns.isVisible(column.key));

  const renderCell = (key: RecordingTableColumn, item: RecordedItem) => {
    const progress = calculateElapsedPercentage(item.startAt, item.endAt, currentTime);
    const fileSize = item.videoFiles?.reduce((total, file) => total + file.size, 0) ?? 0;
    switch (key) {
      case "status":
        return <Badge variant="destructive"><CircleDot aria-hidden="true" className="animate-pulse" />録画中</Badge>;
      case "program":
        return <Link href={`/recorded/detail/${item.id}`} className="font-semibold leading-6 hover:text-primary hover:underline">{item.name}</Link>;
      case "station":
        return channelName(item.channelId);
      case "start":
        return <time dateTime={new Date(item.startAt).toISOString()}>{formatDateTime(item.startAt)}</time>;
      case "end":
        return <time dateTime={new Date(item.endAt).toISOString()}>{formatDateTime(item.endAt)}</time>;
      case "progress":
        return (
          <div className="flex items-center gap-3">
            <progress className="h-2 w-24 accent-red-500" max={100} value={progress} aria-label={`${item.name} の録画進捗`} />
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
        );
      case "size":
        return fileSize > 0 ? formatBytes(fileSize) : "計測中";
      case "actions":
        return (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            aria-label={`${item.name} の録画を停止`}
            disabled={busyId === item.id}
            onClick={() => onStop(item)}
          >
            <CircleStop aria-hidden="true" />{busyId === item.id ? "停止中…" : "停止"}
          </Button>
        );
    }
  };

  const cellClassName: Partial<Record<RecordingTableColumn, string>> = {
    program: "max-w-[30rem] whitespace-normal",
    progress: "min-w-36",
    actions: "text-right",
  };

  return (
    <Table className="min-w-[68rem]">
      <TableCaption>録画中の番組</TableCaption>
      <TableHeader>
        <TableRow>
          {visibleColumns.map((column) => (
            <TableHead key={column.key} className={recordingHeaderClassName[column.key]}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((item) => (
          <TableRow key={item.id}>
            {visibleColumns.map((column) => (
              <TableCell key={column.key} className={cellClassName[column.key]}>
                {renderCell(column.key, item)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function RecordingView() {
  const [page, setPage] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const { preferences } = usePreferences();
  const [viewMode, setViewMode] = useCollectionViewMode("recording");
  const tableColumns = useTableColumnVisibility("recording", recordingTableColumns);
  const [stopTarget, setStopTarget] = useState<RecordedItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const loadRecording = useCallback(
    (signal: AbortSignal): Promise<Records> =>
      apiClient.getRecording(
        {
          isHalfWidth: preferences.isHalfWidthDisplayed,
          offset: (page - 1) * preferences.recordedLength,
          limit: preferences.recordedLength,
        },
        signal,
      ),
    [page, preferences.isHalfWidthDisplayed, preferences.recordedLength],
  );
  const resource = useApiResource(loadRecording);

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

  const stopRecording = async () => {
    if (!stopTarget) return;
    const target = stopTarget;
    setBusyId(target.id);
    setActionMessage(null);
    setActionError(null);
    try {
      await apiClient.stopRecording(target.id);
      setStopTarget(null);
      setActionMessage(`「${target.name}」の録画を停止し、録画予約をキャンセルしました。途中までの録画は録画済みに残ります。`);
      resource.reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "録画を停止できませんでした。");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Now recording"
        title="録画中"
        description="現在録画している番組と進捗を表示します。"
        actions={
          <>
            <CollectionViewToggle value={viewMode} onChange={setViewMode} label="録画中一覧の表示形式" />
            <Button type="button" variant="ghost" onClick={resource.revalidate} disabled={resource.isRefreshing}>
              <RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />
              更新
            </Button>
          </>
        }
      />

      {actionMessage ? <Alert role="status" className="mb-5 border-emerald-500/35"><AlertDescription>{actionMessage}</AlertDescription></Alert> : null}
      {actionError ? <Alert role="alert" className="mb-5 border-destructive/40"><AlertDescription>{actionError}</AlertDescription></Alert> : null}

      {resource.isLoading ? <ContentSkeleton cards={4} /> : null}
      {resource.error ? <ErrorState title="録画状況を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /> : null}
      {!resource.isLoading && resource.data?.records.length === 0 ? (
        <EmptyState title="現在録画中の番組はありません" description="録画が始まると番組名と進捗がここに表示されます。" />
      ) : null}
      {!resource.isLoading && resource.data && resource.data.records.length > 0 ? (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <span className="size-2 rounded-full bg-red-500" aria-hidden="true" />
            {resource.data.total} 件を録画中
            {viewMode === "list" ? (
              <TableColumnVisibilityMenu state={tableColumns} label="録画中一覧の列" className="ml-auto" />
            ) : null}
          </div>
          {viewMode === "list" ? (
            <RecordingTable records={resource.data.records} currentTime={currentTime} busyId={busyId} onStop={setStopTarget} columns={tableColumns} />
          ) : (
            <div className={collectionLayoutClass(viewMode, "xl:grid-cols-2")} aria-label="録画中の番組">
              {resource.data.records.map((item) => (
                <RecordingCard
                  key={item.id}
                  item={item}
                  currentTime={currentTime}
                  viewMode={viewMode}
                  busy={busyId === item.id}
                  onStop={setStopTarget}
                />
              ))}
            </div>
          )}
          <Pagination page={page} pageSize={preferences.recordedLength} total={resource.data.total} onPageChange={setPage} />
        </>
      ) : null}

      <ConfirmDialog
        open={stopTarget !== null}
        title="録画を停止しますか？"
        description={`「${stopTarget?.name ?? ""}」の受信を停止し、この録画の予約もキャンセルします。途中まで録画できたファイルは録画済み番組として残します。`}
        confirmLabel="録画と予約を停止"
        busy={stopTarget !== null && busyId === stopTarget.id}
        onConfirm={() => void stopRecording()}
        onCancel={() => setStopTarget(null)}
      />
    </>
  );
}
