"use client";

import {
  AlertTriangle,
  Database,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { useCallback } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import {
  CollectionViewToggle,
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
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import type { StorageFileUsage, StorageInfo, StorageItem } from "@/lib/api/types";
import { calculatePercentage, formatBytes } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";

interface SegmentPresentation {
  label: string;
  detail: string;
  color: string;
}

const storageTableColumns = [
  { key: "destination", label: "保存先" },
  { key: "distribution", label: "容量構成" },
  { key: "total", label: "総容量" },
  { key: "used", label: "使用済み" },
  { key: "available", label: "空き容量" },
  { key: "usage", label: "使用率" },
] as const;
type StorageTableColumn = (typeof storageTableColumns)[number]["key"];

const formatPresentation: Record<string, SegmentPresentation> = {
  "mpeg-ts": {
    label: "録画（MPEG-TS）",
    detail: "TNLAStationで録画した元データ",
    color: "#3b82f6",
  },
  mp4: {
    label: "エンコード（MP4）",
    detail: "エンコード済みの動画",
    color: "#8b5cf6",
  },
  matroska: {
    label: "エンコード（Matroska）",
    detail: "エンコード済みの動画",
    color: "#d946ef",
  },
  webm: {
    label: "エンコード（WebM）",
    detail: "エンコード済みの動画",
    color: "#06b6d4",
  },
  jpeg: {
    label: "サムネイル",
    detail: "TNLAStationが生成した画像",
    color: "#22c55e",
  },
  "drop-log": {
    label: "ドロップログ",
    detail: "録画時の受信状態ログ",
    color: "#f59e0b",
  },
  "encode-log": {
    label: "エンコードログ",
    detail: "エンコード処理のログ",
    color: "#f97316",
  },
};

const futureManagedColors = ["#0ea5e9", "#14b8a6", "#a855f7", "#eab308"] as const;

export interface StorageDistributionSegment {
  key: string;
  label: string;
  detail: string;
  color: string;
  size: number;
  count: number | null;
  kind: "managed" | "other" | "available";
  includesUntrackedUsage?: boolean;
}

function presentationFor(fileType: StorageFileUsage, index: number): SegmentPresentation {
  return formatPresentation[fileType.format] ?? {
    label: fileType.format,
    detail: "TNLAStationが管理するファイル",
    color: futureManagedColors[index % futureManagedColors.length],
  };
}

/**
 * The API includes filesystem space that cannot be attributed to a file in the configured
 * directory in `used`. Deriving "other" from the occupied total keeps the bar exhaustive even
 * when the recording directory shares a volume with the OS.
 */
export function createStorageDistribution(storage: StorageItem): StorageDistributionSegment[] {
  const managed = (storage.fileTypes ?? []).filter(
    (fileType) => fileType.category !== "other" && fileType.size > 0,
  );
  const explicitOther = (storage.fileTypes ?? []).filter(
    (fileType) => fileType.category === "other",
  );
  const managedSize = managed.reduce((total, fileType) => total + fileType.size, 0);
  const occupied = Math.max(storage.used, storage.total - storage.available, 0);
  const otherSize = Math.max(0, occupied - managedSize);
  const otherCount = explicitOther.reduce((total, fileType) => total + fileType.count, 0);

  const segments: StorageDistributionSegment[] = managed.map((fileType, index) => {
    const presentation = presentationFor(fileType, index);
    return {
      key: `${fileType.category}:${fileType.format}`,
      ...presentation,
      size: fileType.size,
      count: fileType.count,
      kind: "managed",
    };
  });

  if (otherSize > 0 || otherCount > 0) {
    segments.push({
      key: "other",
      label: "その他",
      detail: "TNLAStation管理外・システム使用分",
      color: "#94a3b8",
      size: otherSize,
      count: otherCount,
      kind: "other",
      includesUntrackedUsage: true,
    });
  }

  if (storage.available > 0) {
    segments.push({
      key: "available",
      label: "空き容量",
      detail: "録画に使用できる容量",
      color: "#e2e8f0",
      size: storage.available,
      count: null,
      kind: "available",
    });
  }

  return segments;
}

export function StorageDistribution({
  storage,
  compact = false,
}: {
  storage: StorageItem;
  compact?: boolean;
}) {
  const segments = createStorageDistribution(storage);
  const describedSegments = segments
    .filter((segment) => segment.size > 0)
    .map((segment) => `${segment.label} ${formatBytes(segment.size)}`)
    .join("、");

  return (
    <figure aria-label={`${storage.name} の容量構成`}>
      <div
        role="img"
        aria-label={describedSegments}
        className="flex h-5 w-full overflow-hidden rounded-md border bg-background shadow-inner"
      >
        {segments.map((segment) => (
          segment.size > 0 ? (
            <span
              key={segment.key}
              title={`${segment.label}: ${formatBytes(segment.size)}`}
              className="h-full min-w-[2px] border-r border-white/60 last:border-r-0 dark:border-black/25"
              style={{
                backgroundColor: segment.kind === "available" ? "var(--background)" : segment.color,
                flexBasis: 0,
                flexGrow: segment.size,
              }}
            />
          ) : null
        ))}
      </div>
      <figcaption>
        <ul className={`mt-3 grid gap-x-5 gap-y-2 ${compact ? "grid-cols-2" : "sm:grid-cols-2"}`}>
          {segments.map((segment) => (
            <li key={segment.key} title={segment.detail} className="flex min-w-0 items-start gap-2 text-xs">
              <span
                aria-hidden="true"
                className="mt-0.5 size-2.5 shrink-0 rounded-sm border border-black/5"
                style={{
                  backgroundColor: segment.kind === "available" ? "var(--background)" : segment.color,
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-4">{segment.label}</span>
                <span className="block leading-4 text-muted-foreground">
                  {formatBytes(segment.size)}
                  {segment.count === null
                    ? null
                    : segment.includesUntrackedUsage
                      ? segment.count > 0
                        ? `・管理外ファイル ${segment.count.toLocaleString("ja-JP")} 件を含む`
                        : null
                      : `・${segment.count.toLocaleString("ja-JP")} 件`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

function StorageCard({ storage }: { storage: StorageItem }) {
  const occupied = Math.max(storage.used, storage.total - storage.available, 0);
  const usage = calculatePercentage(occupied, storage.total);
  const isCritical = usage >= 90;
  const isWarning = usage >= 75;

  return (
    <Card className={isCritical ? "border-red-500/30 bg-red-500/[0.04]" : undefined}>
      <CardContent className="pt-5 sm:pt-6">
        <article aria-labelledby={`storage-${storage.name}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><HardDrive aria-hidden="true" className="size-5" /></span>
              <div className="min-w-0">
                <h2 id={`storage-${storage.name}`} className="truncate font-semibold">{storage.name}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">合計 {formatBytes(storage.total)}</p>
              </div>
            </div>
            <Badge variant={isCritical ? "destructive" : isWarning ? "warning" : "success"}>{Math.round(usage)}% 使用</Badge>
          </div>

          <div className="mt-6">
            <StorageDistribution storage={storage} />
            <dl className="mt-3 grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-muted-foreground">使用済み</dt>
                <dd className="mt-1 font-semibold tabular-nums">{formatBytes(occupied)}</dd>
              </div>
              <div className="text-right">
                <dt className="text-muted-foreground">空き</dt>
                <dd className="mt-1 font-semibold tabular-nums">{formatBytes(storage.available)}</dd>
              </div>
            </dl>
          </div>

          {isCritical ? (
            <p className="mt-5 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-700 dark:text-red-300">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              空き容量が少なくなっています。録画前に容量を確認してください。
            </p>
          ) : null}
        </article>
      </CardContent>
    </Card>
  );
}

const storageHeaderContent: Record<StorageTableColumn, { label: string; className: string }> = {
  destination: { label: "保存先", className: "px-4 py-3 font-medium" },
  distribution: { label: "容量構成", className: "w-[520px] px-4 py-3 font-medium" },
  total: { label: "総容量", className: "px-4 py-3 text-right font-medium" },
  used: { label: "使用済み", className: "px-4 py-3 text-right font-medium" },
  available: { label: "空き容量", className: "px-4 py-3 text-right font-medium" },
  usage: { label: "使用率", className: "px-4 py-3 text-right font-medium" },
};

export function StorageTable({
  items,
  columns,
}: {
  items: StorageItem[];
  columns?: TableColumnVisibilityState<StorageTableColumn>;
}) {
  const orderedColumns = columns?.columns ?? storageTableColumns;
  const visibleColumns = orderedColumns.filter((column) => columns?.isVisible(column.key) ?? true);

  const renderCell = (key: StorageTableColumn, storage: StorageItem) => {
    const occupied = Math.max(storage.used, storage.total - storage.available, 0);
    const usage = calculatePercentage(occupied, storage.total);
    const isCritical = usage >= 90;
    const isWarning = usage >= 75;
    switch (key) {
      case "destination":
        return (
          <span className="flex items-center gap-2">
            <HardDrive aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span className="max-w-44 truncate">{storage.name}</span>
          </span>
        );
      case "distribution":
        return <StorageDistribution storage={storage} compact />;
      case "total":
        return formatBytes(storage.total);
      case "used":
        return formatBytes(occupied);
      case "available":
        return formatBytes(storage.available);
      case "usage":
        return (
          <Badge variant={isCritical ? "destructive" : isWarning ? "warning" : "success"}>
            {Math.round(usage)}%
          </Badge>
        );
    }
  };

  const cellClassName: Record<StorageTableColumn, string> = {
    destination: "px-4 py-4 font-medium",
    distribution: "px-4 py-4",
    total: "whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums",
    used: "whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums",
    available: "whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums",
    usage: "whitespace-nowrap px-4 py-4 text-right",
  };

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-xl border bg-card">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <caption className="sr-only">録画保存先ごとの容量構成</caption>
        <thead className="border-b bg-muted/45 text-xs text-muted-foreground">
          <tr>
            {visibleColumns.map((column) => (
              <th key={column.key} scope="col" className={storageHeaderContent[column.key].className}>
                {storageHeaderContent[column.key].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((storage) => (
            <tr key={storage.name} className="align-top hover:bg-muted/20">
              {visibleColumns.map((column) => (
                column.key === "destination" ? (
                  <th key={column.key} scope="row" className={cellClassName[column.key]}>
                    {renderCell(column.key, storage)}
                  </th>
                ) : (
                  <td key={column.key} className={cellClassName[column.key]}>
                    {renderCell(column.key, storage)}
                  </td>
                )
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StoragesView() {
  const loadStorages = useCallback((signal: AbortSignal): Promise<StorageInfo> => apiClient.getStorages(signal), []);
  const resource = useApiResource(loadStorages);
  const [viewMode, setViewMode] = useCollectionViewMode("storages");
  const tableColumns = useTableColumnVisibility("storages", storageTableColumns);
  const totals = resource.data?.items.reduce(
    (result, item) => ({
      total: result.total + item.total,
      used: result.used + Math.max(item.used, item.total - item.available, 0),
      available: result.available + item.available,
    }),
    { total: 0, used: 0, available: 0 },
  );

  return (
    <>
      <PageHeader
        eyebrow="Capacity"
        title="ストレージ"
        description="録画保存先ごとの使用量と空き容量を確認できます。"
        actions={
          <Button type="button" variant="ghost" onClick={resource.revalidate} disabled={resource.isRefreshing}>
            <RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />更新
          </Button>
        }
      />

      {totals ? (
        <section aria-label="ストレージ合計" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "総容量", value: totals.total, icon: Database },
            { label: "使用済み", value: totals.used, icon: HardDrive },
            { label: "空き容量", value: totals.available, icon: HardDrive },
          ].map((item) => (
            <Card key={item.label} className="">
              <CardContent className="flex items-center gap-4 pt-5 sm:pt-6">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><item.icon aria-hidden="true" className="size-5" /></span>
                <div><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-xl font-bold tabular-nums">{formatBytes(item.value)}</p></div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {resource.isLoading ? <ContentSkeleton cards={4} /> : null}
      {resource.error ? <ErrorState title="ストレージ情報を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /> : null}
      {!resource.isLoading && resource.data?.items.length === 0 ? (
        <EmptyState title="ストレージ情報はありません" description="録画保存先が設定されると、容量情報がここに表示されます。" />
      ) : null}
      {!resource.isLoading && resource.data && resource.data.items.length > 0 ? (
        <>
          <div className="mb-4 flex justify-end gap-2">
            {viewMode === "list" ? <TableColumnVisibilityMenu state={tableColumns} label="ストレージ一覧の列" /> : null}
            <CollectionViewToggle value={viewMode} onChange={setViewMode} label="ストレージ一覧の表示形式" />
          </div>
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="ストレージ一覧">
              {resource.data.items.map((storage) => <StorageCard key={storage.name} storage={storage} />)}
            </div>
          ) : (
            <StorageTable items={resource.data.items} columns={tableColumns} />
          )}
        </>
      ) : null}
    </>
  );
}
