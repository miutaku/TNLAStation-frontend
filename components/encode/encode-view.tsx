"use client";

import { CircleStop, Clock3, RefreshCw, ScrollText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
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
import type { EncodeInfo, EncodeProgramItem } from "@/lib/api/types";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { usePreferences } from "@/lib/hooks/use-preferences";

const LIVE_REFRESH_MS = 2000;

const encodeTableColumns = [
  { key: "status", label: "状態" },
  { key: "program", label: "番組" },
  { key: "mode", label: "モード" },
  { key: "progress", label: "進捗" },
  { key: "job", label: "ジョブ" },
  { key: "actions", label: "操作" },
] as const;
type EncodeTableColumn = (typeof encodeTableColumns)[number]["key"];

function EncodeLogView({ log }: { log?: string }) {
  const bodyRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const node = bodyRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [log]);
  if (!log) {
    return <p className="text-sm text-muted-foreground">まだログはありません。エンコードが始まると ffmpeg の出力がここに表示されます。</p>;
  }
  return (
    <pre ref={bodyRef} className="max-h-[60vh] overflow-auto rounded-lg bg-muted/60 p-3 text-[0.72rem] leading-5 whitespace-pre-wrap tabular-nums text-muted-foreground">{log}</pre>
  );
}

function EncodeCard({ item, running, onCancel, busy, onShowLog, viewMode }: { item: EncodeProgramItem; running: boolean; onCancel: () => void; busy: boolean; onShowLog: (id: number) => void; viewMode: CollectionViewMode }) {
  const percent = Math.min(100, Math.max(0, item.percent ?? 0));
  return (
    <Card className={viewMode === "list" ? "rounded-lg shadow-none" : ""}>
      <CardContent className={viewMode === "list" ? "py-4 sm:py-4" : "pt-5 sm:pt-6"}>
        <article aria-labelledby={`encode-${item.id}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2"><Badge variant={running ? "warning" : "secondary"}>{running ? "実行中" : "待機中"}</Badge><Badge variant="outline" className="max-w-full"><span className="min-w-0 truncate" title={item.mode}>{item.mode}</span></Badge></div>
              <h2 id={`encode-${item.id}`} className="mt-3 font-semibold"><Link href={`/recorded/detail/${item.recorded.id}`} className="rounded-sm hover:text-primary hover:underline">{item.recorded.name}</Link></h2>
              <p className="mt-1 text-xs text-muted-foreground">Encode #{item.id} ・ 録画 #{item.recorded.id}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => onShowLog(item.id)}><ScrollText aria-hidden="true" />ログを表示</Button>
              <Button type="button" size="sm" variant="destructive" onClick={onCancel} disabled={busy}><CircleStop aria-hidden="true" />キャンセル</Button>
            </div>
          </div>
          {running ? <div className="mt-5"><div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>進行状況</span><span className="tabular-nums">{percent.toFixed(1)}%</span></div><progress className="h-2 w-full overflow-hidden rounded-full accent-primary" value={percent} max={100} aria-label={`${item.recorded.name} のエンコード進行状況`} /></div> : <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 aria-hidden="true" className="size-4" />実行開始を待っています</p>}
        </article>
      </CardContent>
    </Card>
  );
}

function EncodeTable({
  items,
  running,
  busyId,
  onCancel,
  onShowLog,
  columns,
}: {
  items: EncodeProgramItem[];
  running: boolean;
  busyId: number | null;
  onCancel: (item: EncodeProgramItem) => void;
  onShowLog: (id: number) => void;
  columns: TableColumnVisibilityState<EncodeTableColumn>;
}) {
  const visibleColumns = columns.columns.filter((column) => columns.isVisible(column.key));

  const renderCell = (key: EncodeTableColumn, item: EncodeProgramItem) => {
    const percent = Math.min(100, Math.max(0, item.percent ?? 0));
    switch (key) {
      case "status":
        return <Badge variant={running ? "warning" : "secondary"}>{running ? "実行中" : "待機中"}</Badge>;
      case "program":
        return <Link href={`/recorded/detail/${item.recorded.id}`} className="font-semibold leading-6 hover:text-primary hover:underline">{item.recorded.name}</Link>;
      case "mode":
        return item.mode;
      case "progress":
        return running ? (
          <div className="flex items-center gap-3">
            <progress className="h-2 w-24 accent-primary" value={percent} max={100} aria-label={`${item.recorded.name} のエンコード進行状況`} />
            <span className="tabular-nums">{percent.toFixed(1)}%</span>
          </div>
        ) : "開始待ち";
      case "job":
        return <span className="text-muted-foreground">#{item.id}</span>;
      case "actions":
        return (
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" aria-label={`${item.recorded.name} のエンコードログを表示`} onClick={() => onShowLog(item.id)}><ScrollText aria-hidden="true" />ログ</Button>
            <Button type="button" size="sm" variant="destructive" aria-label={`${item.recorded.name} のエンコードを停止`} onClick={() => onCancel(item)} disabled={busyId === item.id}><CircleStop aria-hidden="true" />停止</Button>
          </div>
        );
    }
  };

  const cellClassName: Partial<Record<EncodeTableColumn, string>> = {
    program: "max-w-[30rem] whitespace-normal",
    progress: "min-w-40",
  };

  return (
    <Table className="min-w-[58rem]">
      <TableCaption>{running ? "実行中" : "待機中"}のエンコード</TableCaption>
      <TableHeader>
        <TableRow>
          {visibleColumns.map((column) => (
            <TableHead key={column.key} className={column.key === "actions" ? "text-right" : undefined}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
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

export function EncodeView() {
  const { preferences } = usePreferences();
  const [cancelTarget, setCancelTarget] = useState<EncodeProgramItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [logTargetId, setLogTargetId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useCollectionViewMode("encode");
  const runningTableColumns = useTableColumnVisibility("encode-running", encodeTableColumns);
  const waitingTableColumns = useTableColumnVisibility("encode-waiting", encodeTableColumns);
  const loadQueue = useCallback((signal: AbortSignal): Promise<EncodeInfo> => apiClient.getEncode(preferences.isHalfWidthDisplayed, signal), [preferences.isHalfWidthDisplayed]);
  const resource = useApiResource(loadQueue);
  const runningCount = resource.data?.runningItems.length ?? 0;
  const total = runningCount + (resource.data?.waitItems.length ?? 0);

  const revalidate = resource.revalidate;
  useEffect(() => {
    if (runningCount === 0) return;
    const timer = window.setInterval(() => revalidate(), LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [runningCount, revalidate]);

  const allItems = [...(resource.data?.runningItems ?? []), ...(resource.data?.waitItems ?? [])];
  const logTarget = logTargetId === null ? null : allItems.find((item) => item.id === logTargetId) ?? null;

  const cancel = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    setActionError(null);
    try {
      await apiClient.cancelEncode(cancelTarget.id);
      setCancelTarget(null);
      resource.reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "エンコードをキャンセルできませんでした。");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Encode queue" title="エンコード" description="実行中と待機中のエンコードを確認し、不要なジョブをキャンセルできます。" actions={<Button type="button" variant="ghost" onClick={resource.revalidate} disabled={resource.isRefreshing}><RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />更新</Button>} />
      {actionError ? <Alert role="alert" className="mb-5 border-destructive/40"><AlertDescription>{actionError}</AlertDescription></Alert> : null}
      {resource.isLoading ? <ContentSkeleton cards={4} /> : null}
      {resource.error ? <ErrorState title="エンコード待ち行列を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /> : null}
      {!resource.isLoading && resource.data && total === 0 ? <EmptyState title="エンコードはありません" description="録画詳細からエンコードを追加すると、ここに進行状況が表示されます。" /> : null}
      {resource.data && total > 0 ? (
        <div className="space-y-7">
          <div className="flex justify-end">
            <CollectionViewToggle value={viewMode} onChange={setViewMode} label="エンコード一覧の表示形式" />
          </div>
          <section aria-labelledby="running-encode">
            <div className="mb-3 flex items-center justify-between gap-3"><h2 id="running-encode" className="text-lg font-bold">実行中</h2><div className="flex items-center gap-2">{viewMode === "list" ? <TableColumnVisibilityMenu state={runningTableColumns} label="実行中エンコードの列" /> : null}<Badge variant="warning">{resource.data.runningItems.length} 件</Badge></div></div>
            {resource.data.runningItems.length ? (
              viewMode === "list"
                ? <EncodeTable items={resource.data.runningItems} running busyId={busyId} onCancel={setCancelTarget} onShowLog={setLogTargetId} columns={runningTableColumns} />
                : <div className={collectionLayoutClass(viewMode, "xl:grid-cols-2")}>{resource.data.runningItems.map((item) => <EncodeCard key={item.id} item={item} running onCancel={() => setCancelTarget(item)} busy={busyId === item.id} onShowLog={setLogTargetId} viewMode={viewMode} />)}</div>
            ) : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">実行中のジョブはありません。</p>}
          </section>
          <section aria-labelledby="waiting-encode">
            <div className="mb-3 flex items-center justify-between gap-3"><h2 id="waiting-encode" className="text-lg font-bold">待機中</h2><div className="flex items-center gap-2">{viewMode === "list" ? <TableColumnVisibilityMenu state={waitingTableColumns} label="待機中エンコードの列" /> : null}<Badge variant="secondary">{resource.data.waitItems.length} 件</Badge></div></div>
            {resource.data.waitItems.length ? (
              viewMode === "list"
                ? <EncodeTable items={resource.data.waitItems} running={false} busyId={busyId} onCancel={setCancelTarget} onShowLog={setLogTargetId} columns={waitingTableColumns} />
                : <div className={collectionLayoutClass(viewMode, "xl:grid-cols-2")}>{resource.data.waitItems.map((item) => <EncodeCard key={item.id} item={item} running={false} onCancel={() => setCancelTarget(item)} busy={busyId === item.id} onShowLog={setLogTargetId} viewMode={viewMode} />)}</div>
            ) : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">待機中のジョブはありません。</p>}
          </section>
        </div>
      ) : null}
      <ConfirmDialog open={cancelTarget !== null} title="エンコードをキャンセルしますか？" description={`「${cancelTarget?.recorded.name ?? ""}」のエンコード処理を停止します。途中の出力は利用できない場合があります。`} confirmLabel="エンコードを停止" busy={cancelTarget !== null && busyId === cancelTarget.id} onConfirm={() => void cancel()} onCancel={() => setCancelTarget(null)} />
      <Dialog
        open={logTarget !== null}
        title={<span className="flex items-center gap-2"><ScrollText aria-hidden="true" className="size-5 text-primary" />エンコードログ</span>}
        onClose={() => setLogTargetId(null)}
      >
        {logTarget ? (
          <>
            <p className="mb-3 text-sm font-medium break-words">{logTarget.recorded.name}<span className="ml-2 text-xs text-muted-foreground">Encode #{logTarget.id} ・ {logTarget.mode}{logTarget.percent !== undefined ? ` ・ ${logTarget.percent}%` : ""}</span></p>
            <EncodeLogView log={logTarget.log} />
          </>
        ) : null}
      </Dialog>
    </>
  );
}
