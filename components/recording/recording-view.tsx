"use client";

import { CircleDot, CircleStop, Clock3, Cpu, HardDrive, Radio, RefreshCw } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
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
import type { Config, RecordedItem, Records, ReserveItem } from "@/lib/api/types";
import { calculateElapsedPercentage, formatBytes, formatDateTime, formatDuration, formatTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { useChannelNames } from "@/lib/hooks/use-channel-names";
import { useRevalidateOnFocus } from "@/lib/hooks/use-revalidate-on-focus";
import { usePreferences } from "@/lib/hooks/use-preferences";
import {
  findReserveForRecording,
  reserveEncodeModes,
  resolveReserveEncodeUpdate,
} from "@/lib/recording-encode";

const recordingTableColumns = [
  { key: "status", label: "状態" },
  { key: "program", label: "番組" },
  { key: "station", label: "放送局" },
  { key: "start", label: "開始" },
  { key: "end", label: "終了予定" },
  { key: "progress", label: "進捗" },
  { key: "size", label: "現在サイズ" },
  { key: "encode", label: "エンコード設定" },
  { key: "actions", label: "操作" },
] as const;
type RecordingTableColumn = (typeof recordingTableColumns)[number]["key"];

/** 録画中の番組に紐づく予約。予約が引けないと設定は出せないので undefined を許す。 */
type EncodeSetting = { reserve: ReserveItem | undefined };

function EncodeSummary({ reserve }: EncodeSetting) {
  if (!reserve) return <span className="text-muted-foreground">予約を特定できません</span>;

  const modes = reserveEncodeModes(reserve);
  if (modes.length === 0) return <span className="text-muted-foreground">エンコードしない</span>;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {modes.map((mode) => <Badge key={mode} variant="outline">{mode}</Badge>)}
      {reserve.isDeleteOriginalAfterEncode ? <Badge variant="warning">元ファイル削除</Badge> : null}
    </span>
  );
}

function RecordingCard({ item, reserve, currentTime, viewMode, busy, onStop, onEditEncode }: { item: RecordedItem; reserve: ReserveItem | undefined; currentTime: number; viewMode: CollectionViewMode; busy: boolean; onStop: (item: RecordedItem) => void; onEditEncode: (item: RecordedItem) => void }) {
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <Cpu aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="sr-only">エンコード設定</span>
              <EncodeSummary reserve={reserve} />
            </div>
            <Button type="button" size="sm" variant="ghost" disabled={busy || !reserve} onClick={() => onEditEncode(item)}>
              設定を変更
            </Button>
          </div>
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
  reserveFor,
  currentTime,
  busyId,
  onStop,
  onEditEncode,
  columns,
}: {
  records: RecordedItem[];
  reserveFor: (item: RecordedItem) => ReserveItem | undefined;
  currentTime: number;
  busyId: number | null;
  onStop: (item: RecordedItem) => void;
  onEditEncode: (item: RecordedItem) => void;
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
      case "encode":
        return <EncodeSummary reserve={reserveFor(item)} />;
      case "actions":
        return (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`${item.name} のエンコード設定を変更`}
              disabled={busyId === item.id || !reserveFor(item)}
              onClick={() => onEditEncode(item)}
            >
              <Cpu aria-hidden="true" />設定
            </Button>
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
          </div>
        );
    }
  };

  const cellClassName: Partial<Record<RecordingTableColumn, string>> = {
    program: "max-w-[30rem] whitespace-normal",
    progress: "min-w-36",
    encode: "min-w-44 whitespace-normal",
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
  const [encodeTarget, setEncodeTarget] = useState<RecordedItem | null>(null);
  const [encodeMode, setEncodeMode] = useState("");
  const [encodeRemoveOriginal, setEncodeRemoveOriginal] = useState(false);
  const [savingEncode, setSavingEncode] = useState(false);
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

  // エンコード設定は予約が持つ。録画一覧は予約 id を返さないので、予約表を別に読んで結び付ける。
  const loadEncodeSettings = useCallback(
    async (signal: AbortSignal): Promise<{ reserves: ReserveItem[]; config: Config }> => {
      const [reserves, config] = await Promise.all([
        apiClient.getReserves(
          { isHalfWidth: preferences.isHalfWidthDisplayed, type: "normal", offset: 0, limit: 1_000 },
          signal,
        ),
        apiClient.getConfig(signal),
      ]);
      return { reserves: reserves.reserves, config };
    },
    [preferences.isHalfWidthDisplayed],
  );
  const encodeSettings = useApiResource(loadEncodeSettings);
  const encodeModes = encodeSettings.data?.config.encode ?? [];
  const reserveFor = useCallback(
    (item: RecordedItem) => findReserveForRecording(item, encodeSettings.data?.reserves ?? []),
    [encodeSettings.data],
  );
  const encodeTargetReserve = encodeTarget ? reserveFor(encodeTarget) : undefined;

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
  useRevalidateOnFocus(encodeSettings);

  const openEncodeDialog = (item: RecordedItem) => {
    const reserve = reserveFor(item);
    if (!reserve) return;

    setEncodeTarget(item);
    setEncodeMode(reserve.encodeMode1 ?? "");
    setEncodeRemoveOriginal(reserve.isDeleteOriginalAfterEncode);
  };

  /**
   * 予約を書き換えるだけなので受信は続く。積むのは録画が終わってからで、そのときに
   * 最新の予約を見るため、この変更が実際に走るエンコードへ効く。
   */
  const saveEncodeSetting = async () => {
    if (!encodeTarget) return;

    setSavingEncode(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const resolved = resolveReserveEncodeUpdate(
        encodeTarget,
        encodeSettings.data?.reserves ?? [],
        { mode: encodeMode, removeOriginal: encodeRemoveOriginal },
      );
      // 録画が止まった、スキップされたなど、予約そのものが消えている場合。
      if (!resolved) throw new Error("この録画の予約が見つかりませんでした。一覧を更新してからやり直してください。");

      await apiClient.updateReserve(resolved.reserveId, resolved.update);
      setEncodeTarget(null);
      setActionMessage(
        encodeMode
          ? `「${encodeTarget.name}」の録画後のエンコードを ${encodeMode} にしました。録画は続いています。`
          : `「${encodeTarget.name}」の録画後のエンコードを取り消しました。録画は続いています。`,
      );
      encodeSettings.reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "エンコード設定を変更できませんでした。");
    } finally {
      setSavingEncode(false);
    }
  };

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
            <RecordingTable
              records={resource.data.records}
              reserveFor={reserveFor}
              currentTime={currentTime}
              busyId={busyId}
              onStop={setStopTarget}
              onEditEncode={openEncodeDialog}
              columns={tableColumns}
            />
          ) : (
            <div className={collectionLayoutClass(viewMode, "xl:grid-cols-2")} aria-label="録画中の番組">
              {resource.data.records.map((item) => (
                <RecordingCard
                  key={item.id}
                  item={item}
                  reserve={reserveFor(item)}
                  currentTime={currentTime}
                  viewMode={viewMode}
                  busy={busyId === item.id}
                  onStop={setStopTarget}
                  onEditEncode={openEncodeDialog}
                />
              ))}
            </div>
          )}
          <Pagination page={page} pageSize={preferences.recordedLength} total={resource.data.total} onPageChange={setPage} />
        </>
      ) : null}

      <ConfirmDialog
        open={encodeTarget !== null}
        title="録画後のエンコード設定"
        description={`「${encodeTarget?.name ?? ""}」の予約を書き換えます。受信は止まらず、録画が終わった時点でこの設定が使われます。`}
        confirmLabel="設定を保存"
        busy={savingEncode}
        onConfirm={() => void saveEncodeSetting()}
        onCancel={() => setEncodeTarget(null)}
      >
        <div className="mt-4">
          <label htmlFor="recording-encode-mode" className="mb-2 block text-sm font-semibold">エンコード設定</label>
          <select
            id="recording-encode-mode"
            className="h-10 w-full rounded-lg border border-input bg-background/75 px-3 text-sm"
            value={encodeMode}
            onChange={(event) => setEncodeMode(event.target.value)}
            disabled={savingEncode}
          >
            <option value="">エンコードしない</option>
            {encodeModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 glass-field rounded-lg border p-3">
          <span id="recording-encode-remove-label" className="text-sm font-semibold">完了後に元ファイルを削除</span>
          <Switch
            checked={encodeRemoveOriginal}
            disabled={savingEncode || encodeMode === ""}
            aria-labelledby="recording-encode-remove-label"
            onClick={() => setEncodeRemoveOriginal((value) => !value)}
          />
        </div>
        {encodeTargetReserve?.encodeMode2 !== undefined ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            2 つめ以降のエンコード設定はそのまま残します。すべて変えるときは予約の編集画面を使ってください。
          </p>
        ) : null}
      </ConfirmDialog>
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
