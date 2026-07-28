"use client";

import { AlertTriangle, CalendarClock, ChevronRight, HardDrive, Radio, RefreshCw, Tv } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import {
  collectionLayoutClass,
  CollectionViewToggle,
  type CollectionViewMode,
  useCollectionViewMode,
} from "@/components/collection-view";
import { PageHeader } from "@/components/page-header";
import {
  TableColumnVisibilityMenu,
  type TableColumnVisibilityState,
  useTableColumnVisibility,
} from "@/components/table-column-visibility";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { Config, RecordedItem, ReserveItem } from "@/lib/api/types";
import { formatBytes, formatDateTime, formatDuration } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { useChannelNames } from "@/lib/hooks/use-channel-names";
import { usePreferences } from "@/lib/hooks/use-preferences";

interface DashboardData {
  config: Config;
  reserves: ReserveItem[];
  reserveTotal: number;
  recorded: RecordedItem[];
  recordedTotal: number;
}

const dashboardSummaryColumns = [
  { key: "item", label: "項目" },
  { key: "value", label: "値" },
  { key: "description", label: "説明" },
] as const;
type DashboardSummaryColumn = (typeof dashboardSummaryColumns)[number]["key"];

const dashboardReserveColumns = [
  { key: "program", label: "番組" },
  { key: "start", label: "開始日時" },
  { key: "station", label: "放送局" },
  { key: "status", label: "状態" },
] as const;
type DashboardReserveColumn = (typeof dashboardReserveColumns)[number]["key"];

const dashboardRecordedColumns = [
  { key: "program", label: "番組" },
  { key: "recordedAt", label: "録画日時" },
  { key: "size", label: "サイズ" },
  { key: "actions", label: "操作" },
] as const;
type DashboardRecordedColumn = (typeof dashboardRecordedColumns)[number]["key"];

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  emphasis = false,
  viewMode,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof CalendarClock;
  emphasis?: boolean;
  viewMode: CollectionViewMode;
}) {
  return (
    <Card className={viewMode === "list" ? `rounded-lg shadow-none ${emphasis ? "border-amber-500/30 bg-amber-500/5" : ""}` : emphasis ? "border-amber-500/30 bg-amber-500/5" : ""}>
      <CardContent className={viewMode === "list" ? "py-4 sm:py-4" : "pt-5 sm:pt-6"}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon aria-hidden="true" className="size-5" />
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ReservePreview({ reserve }: { reserve: ReserveItem }) {
  const channelName = useChannelNames();
  return (
    <li className="border-b py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{reserve.name}</p>
            {reserve.isConflict ? <Badge variant="destructive">競合</Badge> : null}
            {reserve.isOverlap ? <Badge variant="warning">重複</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(reserve.startAt)} ・ {formatDuration(reserve.startAt, reserve.endAt)} ・ {channelName(reserve.channelId)}
          </p>
        </div>
      </div>
    </li>
  );
}

function RecordedPreview({ item }: { item: RecordedItem }) {
  const fileSize = item.videoFiles?.reduce((total, file) => total + file.size, 0) ?? 0;
  return (
    <li className="border-b py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Tv aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{item.name}</p>
            {item.isEncoding ? <Badge variant="warning">エンコード中</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(item.startAt)} ・ {fileSize > 0 ? formatBytes(fileSize) : "ファイル情報なし"}
          </p>
        </div>
      </div>
    </li>
  );
}

function DashboardSummaryTable({
  reserveTotal,
  conflictCount,
  recordedTotal,
  broadcasts,
  columns,
}: {
  reserveTotal: number;
  conflictCount: number;
  recordedTotal: number;
  broadcasts: string;
  columns: TableColumnVisibilityState<DashboardSummaryColumn>;
}) {
  const rows = [
    { label: "予約", value: reserveTotal, helper: "取得できる予約の総数" },
    { label: "競合", value: conflictCount, helper: "現在の取得範囲内で競合している予約" },
    { label: "録画済み", value: recordedTotal, helper: "録画ライブラリの総番組数" },
    { label: "放送波", value: broadcasts || "—", helper: "受信できる放送波" },
  ];
  const visibleColumns = columns.columns.filter((column) => columns.isVisible(column.key));
  const cellClassName: Record<DashboardSummaryColumn, string> = {
    item: "font-semibold",
    value: "text-lg font-bold tabular-nums",
    description: "whitespace-normal text-muted-foreground",
  };

  const renderCell = (key: DashboardSummaryColumn, row: (typeof rows)[number]) => {
    switch (key) {
      case "item":
        return row.label;
      case "value":
        return row.value;
      case "description":
        return row.helper;
    }
  };

  return (
    <Table>
      <TableCaption>システム概要</TableCaption>
      <TableHeader><TableRow>
        {visibleColumns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            {visibleColumns.map((column) => (
              <TableCell key={column.key} className={cellClassName[column.key]}>{renderCell(column.key, row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DashboardReserveTable({
  reserves,
  columns,
}: {
  reserves: ReserveItem[];
  columns: TableColumnVisibilityState<DashboardReserveColumn>;
}) {
  const channelName = useChannelNames();
  const visibleColumns = columns.columns.filter((column) => columns.isVisible(column.key));

  const renderCell = (key: DashboardReserveColumn, reserve: ReserveItem) => {
    switch (key) {
      case "program":
        return reserve.name;
      case "start":
        return formatDateTime(reserve.startAt);
      case "station":
        return channelName(reserve.channelId);
      case "status":
        return reserve.isConflict ? <Badge variant="destructive">競合</Badge> : reserve.isOverlap ? <Badge variant="warning">重複</Badge> : <Badge variant="success">予約済み</Badge>;
    }
  };

  return (
    <Table className="min-w-[48rem]">
      <TableCaption>開始時刻が近い予約</TableCaption>
      <TableHeader><TableRow>
        {visibleColumns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}
      </TableRow></TableHeader>
      <TableBody>
        {reserves.slice(0, 6).map((reserve) => (
          <TableRow key={reserve.id}>
            {visibleColumns.map((column) => (
              <TableCell key={column.key} className={column.key === "program" ? "max-w-[24rem] whitespace-normal font-semibold" : undefined}>
                {renderCell(column.key, reserve)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DashboardRecordedTable({
  records,
  columns,
}: {
  records: RecordedItem[];
  columns: TableColumnVisibilityState<DashboardRecordedColumn>;
}) {
  const visibleColumns = columns.columns.filter((column) => columns.isVisible(column.key));

  const renderCell = (key: DashboardRecordedColumn, item: RecordedItem) => {
    const fileSize = item.videoFiles?.reduce((total, file) => total + file.size, 0) ?? 0;
    switch (key) {
      case "program":
        return item.name;
      case "recordedAt":
        return formatDateTime(item.startAt);
      case "size":
        return fileSize > 0 ? formatBytes(fileSize) : "情報なし";
      case "actions":
        return <Button asChild size="sm" variant="outline"><Link href={`/recorded/detail/${item.id}`} aria-label={`${item.name} の詳細を表示`}>詳細</Link></Button>;
    }
  };

  const cellClassName: Partial<Record<DashboardRecordedColumn, string>> = {
    program: "max-w-[24rem] whitespace-normal font-semibold",
    actions: "text-right",
  };

  return (
    <Table className="min-w-[42rem]">
      <TableCaption>最近の録画</TableCaption>
      <TableHeader><TableRow>
        {visibleColumns.map((column) => (
          <TableHead key={column.key} className={column.key === "actions" ? "text-right" : undefined}>{column.label}</TableHead>
        ))}
      </TableRow></TableHeader>
      <TableBody>
        {records.slice(0, 6).map((item) => (
          <TableRow key={item.id}>
            {visibleColumns.map((column) => (
              <TableCell key={column.key} className={cellClassName[column.key]}>{renderCell(column.key, item)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DashboardView() {
  const { preferences } = usePreferences();
  const [viewMode, setViewMode] = useCollectionViewMode("dashboard");
  const summaryTableColumns = useTableColumnVisibility("dashboard-summary", dashboardSummaryColumns);
  const reserveTableColumns = useTableColumnVisibility("dashboard-reserves", dashboardReserveColumns);
  const recordedTableColumns = useTableColumnVisibility("dashboard-recorded", dashboardRecordedColumns);
  const loadDashboard = useCallback(async (signal: AbortSignal): Promise<DashboardData> => {
    const [config, reserves, recorded] = await Promise.all([
      apiClient.getConfig(signal),
      apiClient.getReserves({ type: "all", isHalfWidth: preferences.isHalfWidthDisplayed, offset: 0, limit: 24 }, signal),
      apiClient.getRecorded({ isHalfWidth: preferences.isHalfWidthDisplayed, offset: 0, limit: 12 }, signal),
    ]);
    return {
      config,
      reserves: reserves.reserves,
      reserveTotal: reserves.total,
      recorded: recorded.records,
      recordedTotal: recorded.total,
    };
  }, [preferences.isHalfWidthDisplayed]);
  const resource = useApiResource(loadDashboard);

  const conflictCount = resource.data?.reserves.filter((reserve) => reserve.isConflict).length ?? 0;
  const enabledBroadcasts = resource.data
    ? Object.entries(resource.data.config.broadcast)
        .filter(([, enabled]) => enabled)
        .map(([type]) => type)
        .join(" / ")
    : "";

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="ダッシュボード"
        description="次の予約と最近の録画をひと目で確認できます。表示内容は TNLAStation のサーバーから取得しています。"
        actions={
          <>
            <CollectionViewToggle value={viewMode} onChange={setViewMode} label="ダッシュボードの表示形式" />
            <Button type="button" variant="ghost" onClick={resource.revalidate} disabled={resource.isRefreshing}>
              <RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />
              更新
            </Button>
          </>
        }
      />

      {resource.isLoading ? <ContentSkeleton cards={5} /> : null}
      {resource.error ? <ErrorState description={resource.error.message} onRetry={resource.reload} /> : null}

      {resource.data ? (
        <div className="space-y-6">
          {viewMode === "list" ? (
            <>
              <div className="mb-3 flex justify-end">
                <TableColumnVisibilityMenu state={summaryTableColumns} label="システム概要の列" />
              </div>
              <DashboardSummaryTable
                reserveTotal={resource.data.reserveTotal}
                conflictCount={conflictCount}
                recordedTotal={resource.data.recordedTotal}
                broadcasts={enabledBroadcasts}
                columns={summaryTableColumns}
              />
              <section aria-labelledby="dashboard-reserves-title">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div><h2 id="dashboard-reserves-title" className="text-lg font-bold">予約スケジュール</h2><p className="text-xs text-muted-foreground">開始時刻が近い予約を表示</p></div>
                  <div className="flex items-center gap-2">
                    <TableColumnVisibilityMenu state={reserveTableColumns} label="予約スケジュールの列" />
                    <Button asChild variant="ghost" size="sm"><Link href="/reserves">一覧へ <ChevronRight aria-hidden="true" /></Link></Button>
                  </div>
                </div>
                {resource.data.reserves.length > 0 ? <DashboardReserveTable reserves={resource.data.reserves} columns={reserveTableColumns} /> : <EmptyState title="予約はありません" description="番組表またはルールから予約すると、ここに表示されます。" />}
              </section>
              <section aria-labelledby="dashboard-recorded-title">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div><h2 id="dashboard-recorded-title" className="text-lg font-bold">最近の録画</h2><p className="text-xs text-muted-foreground">直近に追加された録画番組</p></div>
                  <div className="flex items-center gap-2">
                    <TableColumnVisibilityMenu state={recordedTableColumns} label="最近の録画の列" />
                    <Button asChild variant="ghost" size="sm"><Link href="/recorded">一覧へ <ChevronRight aria-hidden="true" /></Link></Button>
                  </div>
                </div>
                {resource.data.recorded.length > 0 ? <DashboardRecordedTable records={resource.data.recorded} columns={recordedTableColumns} /> : <EmptyState title="録画済み番組はありません" description="録画が完了すると、ここに最近の番組が表示されます。" />}
              </section>
            </>
          ) : (
            <>
              <section aria-label="システム概要" className={collectionLayoutClass(viewMode, "sm:grid-cols-2 xl:grid-cols-4")}>
                <MetricCard label="予約" value={resource.data.reserveTotal} helper="取得できる予約の総数" icon={CalendarClock} viewMode={viewMode} />
                <MetricCard
                  label="競合"
                  value={conflictCount}
                  helper="現在の取得範囲内で競合している予約"
                  icon={AlertTriangle}
                  emphasis={conflictCount > 0}
                  viewMode={viewMode}
                />
                <MetricCard label="録画済み" value={resource.data.recordedTotal} helper="録画ライブラリの総番組数" icon={HardDrive} viewMode={viewMode} />
                <MetricCard label="放送波" value={enabledBroadcasts || "—"} helper="受信できる放送波" icon={Radio} viewMode={viewMode} />
              </section>

              <section className={collectionLayoutClass(viewMode, "xl:grid-cols-2")} aria-label="最近の状況">
                <Card className="overflow-hidden">
                  <CardHeader className="flex-row items-start justify-between gap-4 border-b">
                    <div><CardTitle>予約スケジュール</CardTitle><CardDescription>開始時刻が近い予約を表示</CardDescription></div>
                    <Button asChild variant="ghost" size="sm"><Link href="/reserves">一覧へ <ChevronRight aria-hidden="true" /></Link></Button>
                  </CardHeader>
                  <CardContent>
                    {resource.data.reserves.length > 0 ? <ul aria-label="予約スケジュール">{resource.data.reserves.slice(0, 6).map((item) => <ReservePreview key={item.id} reserve={item} />)}</ul> : <EmptyState title="予約はありません" description="番組表またはルールから予約すると、ここに表示されます。" />}
                  </CardContent>
                </Card>
                <Card className="overflow-hidden">
                  <CardHeader className="flex-row items-start justify-between gap-4 border-b">
                    <div><CardTitle>最近の録画</CardTitle><CardDescription>直近に追加された録画番組</CardDescription></div>
                    <Button asChild variant="ghost" size="sm"><Link href="/recorded">一覧へ <ChevronRight aria-hidden="true" /></Link></Button>
                  </CardHeader>
                  <CardContent>
                    {resource.data.recorded.length > 0 ? <ul aria-label="最近の録画">{resource.data.recorded.slice(0, 6).map((item) => <RecordedPreview key={item.id} item={item} />)}</ul> : <EmptyState title="録画済み番組はありません" description="録画が完了すると、ここに最近の番組が表示されます。" />}
                  </CardContent>
                </Card>
              </section>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
