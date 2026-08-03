"use client";

import { Cpu, Eraser, HardDrive, Image as ImageIcon, ListChecks, LockKeyhole, RefreshCw, Sparkles, Square, Trash2, TriangleAlert, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import {
  collectionLayoutClass,
  CollectionViewToggle,
  type CollectionViewMode,
  useCollectionViewMode,
} from "@/components/collection-view";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SortMenu, sortItems, useSortState, type SortAccessors, type SortColumnDefinition } from "@/components/sortable-columns";
import {
  EMPTY_PROGRAM_COLLECTION_SEARCH,
  ProgramCollectionSearch,
  hasProgramCollectionQuery,
  toProgramCollectionQuery,
  type ProgramCollectionSearchValue,
} from "@/components/program-collection-search";
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
import { RecordedPlayButton } from "@/components/recorded/recorded-play-button";
import { RecordedThumbnail } from "@/components/recorded/recorded-thumbnail";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/client";
import type { ChannelItem, Config, RecordedItem, Records, Rule } from "@/lib/api/types";
import { formatBytes, formatDateTime, formatDuration, genreName } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { createThumbnailPlan } from "@/lib/recorded-thumbnail";
import { useChannelNames } from "@/lib/hooks/use-channel-names";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { createRecordedDeletePlan, type FileDeleteOption } from "@/lib/recorded-deletion";
import {
  createRecordedEncodePlan,
  recordedEncodeSkipLabel,
  type RecordedEncodePlan,
} from "@/lib/recorded-encode";

const recordedTableColumns = [
  { key: "status", label: "状態" },
  { key: "program", label: "番組" },
  { key: "recordedAt", label: "録画日時" },
  { key: "station", label: "放送局" },
  { key: "genre", label: "ジャンル" },
  { key: "duration", label: "長さ" },
  { key: "size", label: "サイズ" },
  { key: "drop", label: "ドロップ" },
  { key: "actions", label: "操作" },
] as const;
type RecordedTableColumn = (typeof recordedTableColumns)[number]["key"];
type BulkDeleteOption = FileDeleteOption;

function totalFileSize(item: RecordedItem): number {
  return item.videoFiles?.reduce((total, file) => total + file.size, 0) ?? 0;
}

function recordedStatusRank(item: RecordedItem): number {
  if (item.isRecording) return 0;
  if (item.isEncoding) return 1;
  if (item.isProtected) return 2;
  return 3;
}

const recordedSortAccessors: SortAccessors<RecordedItem, RecordedTableColumn> = {
  status: (item) => recordedStatusRank(item),
  program: (item) => item.name,
  recordedAt: (item) => item.startAt,
  station: (item) => item.channelId,
  genre: (item) => item.genre1 ?? -1,
  duration: (item) => item.endAt - item.startAt,
  size: (item) => totalFileSize(item),
  drop: (item) => item.dropLogFile?.dropCnt ?? 0,
};
const sortableRecordedColumns = Object.keys(recordedSortAccessors) as RecordedTableColumn[];

function RecordedCard({ item, showDropInfo, selectable, selected, onToggleSelect, viewMode }: { item: RecordedItem; showDropInfo: boolean; selectable: boolean; selected: boolean; onToggleSelect: (id: number) => void; viewMode: CollectionViewMode }) {
  const channelName = useChannelNames();
  const fileSize = totalFileSize(item);
  return (
    <Card className={`group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg ${selected ? "ring-2 ring-primary" : ""}`}>
      <article
        aria-labelledby={`recorded-${item.id}`}
        className={viewMode === "list" ? "grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] sm:grid-cols-[12rem_minmax(0,1fr)]" : undefined}
      >
        <div className={viewMode === "list" ? "relative grid min-h-44 place-items-center overflow-hidden border-r bg-secondary" : "relative grid aspect-[16/7] place-items-center overflow-hidden border-b bg-secondary"}>
          {selectable ? (
            <label className="absolute top-3 right-3 z-10 flex size-8 cursor-pointer items-center justify-center rounded-lg bg-background/90 backdrop-blur">
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={selected}
                onChange={() => onToggleSelect(item.id)}
                aria-label={`${item.name} を選択`}
              />
            </label>
          ) : null}
          <RecordedThumbnail
            item={item}
            className="transition-transform group-hover:scale-105"
            iconClassName="transition-transform group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {item.isRecording ? <Badge variant="destructive">録画中</Badge> : null}
            {item.isEncoding ? <Badge variant="warning">エンコード中</Badge> : null}
            {item.isProtected ? (
              <Badge variant="secondary">
                <LockKeyhole aria-hidden="true" /> 保護
              </Badge>
            ) : null}
          </div>
          <Badge variant="outline" className="absolute right-3 bottom-3 bg-background/90 backdrop-blur">
            {formatDuration(item.startAt, item.endAt)}
          </Badge>
        </div>

        <CardContent className="pt-5 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-primary">{genreName(item.genre1)} ・ {channelName(item.channelId)}</p>
              <h2 id={`recorded-${item.id}`} className="mt-1 line-clamp-2 text-lg font-semibold leading-7"><Link href={`/recorded/detail/${item.id}`} className="rounded-sm hover:text-primary hover:underline">{item.name}</Link></h2>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">#{item.id}</span>
          </div>
          <time dateTime={new Date(item.startAt).toISOString()} className="mt-2 block text-xs text-muted-foreground">
            {formatDateTime(item.startAt)}
          </time>
          {item.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description}</p> : null}

          {item.tags && item.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5" aria-label="タグ">
              {item.tags.map((tag) => <Badge key={tag.id} variant="outline" className="max-w-full"><span className="min-w-0 truncate" title={tag.name}>{tag.name}</span></Badge>)}
            </div>
          ) : null}

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <HardDrive aria-hidden="true" className="size-4 text-primary" />
              <dt className="sr-only">ファイルサイズ</dt>
              <dd>{fileSize > 0 ? formatBytes(fileSize) : "情報なし"}</dd>
            </div>
            {showDropInfo ? <div className="flex items-center justify-end gap-2">
              {item.dropLogFile && (item.dropLogFile.dropCnt > 0 || item.dropLogFile.errorCnt > 0) ? (
                <TriangleAlert aria-hidden="true" className="size-4 text-amber-600 dark:text-amber-300" />
              ) : (
                <Sparkles aria-hidden="true" className="size-4 text-emerald-600 dark:text-emerald-300" />
              )}
              <dt className="sr-only">ドロップ数</dt>
              <dd>Drop {item.dropLogFile?.dropCnt ?? 0}</dd>
            </div> : <div />}
          </dl>
          <div className="mt-4 flex justify-end gap-2">
            <RecordedPlayButton item={item} />
            <Button asChild size="sm"><Link href={`/recorded/detail/${item.id}`}>詳細を見る</Link></Button>
          </div>
        </CardContent>
      </article>
    </Card>
  );
}

const recordedHeaderClassName: Partial<Record<RecordedTableColumn, string>> = {
  actions: "text-right",
};

function RecordedTable({
  records,
  selectable,
  selectedIds,
  onToggleSelect,
  columns,
}: {
  records: RecordedItem[];
  selectable: boolean;
  selectedIds: ReadonlySet<number>;
  onToggleSelect: (id: number) => void;
  columns: TableColumnVisibilityState<RecordedTableColumn>;
}) {
  const channelName = useChannelNames();
  const visibleColumns = columns.columns.filter((column) => columns.isVisible(column.key));

  const renderCell = (key: RecordedTableColumn, item: RecordedItem) => {
    const fileSize = totalFileSize(item);
    const hasDrop = (item.dropLogFile?.dropCnt ?? 0) > 0 || (item.dropLogFile?.errorCnt ?? 0) > 0;
    switch (key) {
      case "status":
        return (
          <div className="flex max-w-44 flex-wrap gap-1.5">
            {item.isRecording ? <Badge variant="destructive">録画中</Badge> : null}
            {item.isEncoding ? <Badge variant="warning">エンコード中</Badge> : null}
            {item.isProtected ? <Badge variant="secondary"><LockKeyhole aria-hidden="true" />保護</Badge> : null}
            {!item.isRecording && !item.isEncoding && !item.isProtected ? <Badge variant="success">完了</Badge> : null}
          </div>
        );
      case "program":
        return (
          <>
            <Link href={`/recorded/detail/${item.id}`} className="font-semibold leading-6 hover:text-primary hover:underline">
              {item.name}
            </Link>
            {item.description ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.description}</p> : null}
          </>
        );
      case "recordedAt":
        return <time dateTime={new Date(item.startAt).toISOString()}>{formatDateTime(item.startAt)}</time>;
      case "station":
        return channelName(item.channelId);
      case "genre":
        return genreName(item.genre1);
      case "duration":
        return formatDuration(item.startAt, item.endAt);
      case "size":
        return fileSize > 0 ? formatBytes(fileSize) : "情報なし";
      case "drop":
        return (
          <span className={hasDrop ? "font-semibold text-amber-700 dark:text-amber-300" : "text-muted-foreground"}>
            Drop {item.dropLogFile?.dropCnt ?? 0}
          </span>
        );
      case "actions":
        return (
          <span className="flex items-center justify-end gap-2">
            <RecordedPlayButton item={item} />
            <Button asChild size="sm" variant="outline">
              <Link href={`/recorded/detail/${item.id}`} aria-label={`${item.name} の詳細を表示`}>詳細</Link>
            </Button>
          </span>
        );
    }
  };

  const cellClassName: Partial<Record<RecordedTableColumn, string>> = {
    program: "max-w-[30rem] whitespace-normal",
    actions: "text-right",
  };

  return (
    <Table className="min-w-[76rem]">
      <TableCaption>録画済み番組</TableCaption>
      <TableHeader>
        <TableRow>
          {selectable ? <TableHead className="w-12"><span className="sr-only">選択</span></TableHead> : null}
          {visibleColumns.map((column) => (
            <TableHead key={column.key} className={recordedHeaderClassName[column.key]}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((item) => (
          <TableRow key={item.id} className={selectedIds.has(item.id) ? "bg-primary/5" : undefined}>
            {selectable ? (
              <TableCell>
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                  aria-label={`${item.name} を選択`}
                />
              </TableCell>
            ) : null}
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

export function RecordedView() {
  const { notify } = useToast();
  const notifySuccess = useCallback((text: string) => notify("success", text), [notify]);
  const notifyError = useCallback((text: string) => notify("error", text), [notify]);
  const [draftSearch, setDraftSearch] = useState<ProgramCollectionSearchValue>(
    EMPTY_PROGRAM_COLLECTION_SEARCH,
  );
  const [search, setSearch] = useState<ProgramCollectionSearchValue>(EMPTY_PROGRAM_COLLECTION_SEARCH);
  const [draftOriginalOnly, setDraftOriginalOnly] = useState(false);
  const [originalOnly, setOriginalOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  /** 他ページで選択した録画も、削除対象のファイルを判定できるよう覚えておく。 */
  const [knownItems, setKnownItems] = useState<Map<number, RecordedItem>>(new Map());
  const [busy, setBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkCandidateIds, setBulkCandidateIds] = useState<number[]>([]);
  const [bulkTargetIds, setBulkTargetIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOption, setBulkDeleteOption] = useState<BulkDeleteOption>("all");
  const [thumbnailProgress, setThumbnailProgress] = useState<{ done: number; total: number } | null>(null);
  const [confirmEncode, setConfirmEncode] = useState(false);
  const [encodePlan, setEncodePlan] = useState<RecordedEncodePlan>({ targets: [], skipped: [] });
  const [encodeTargetIds, setEncodeTargetIds] = useState<Set<number>>(new Set());
  const [encodeMode, setEncodeMode] = useState("");
  const [encodeRemoveOriginal, setEncodeRemoveOriginal] = useState(false);
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  const { preferences } = usePreferences();
  const [viewMode, setViewMode] = useCollectionViewMode("recorded");
  const availableTableColumns = useMemo(
    () => preferences.isShowDropInfo
      ? recordedTableColumns
      : recordedTableColumns.filter((column) => column.key !== "drop"),
    [preferences.isShowDropInfo],
  );
  const tableColumns = useTableColumnVisibility("recorded", availableTableColumns);
  const sort = useSortState("recorded", sortableRecordedColumns);
  const recordedSortColumns: SortColumnDefinition<RecordedTableColumn>[] = useMemo(
    () => availableTableColumns.filter((column) => recordedSortAccessors[column.key]),
    [availableTableColumns],
  );
  const searchQuery = useMemo(() => toProgramCollectionQuery(search), [search]);
  const loadPageOptions = useCallback(
    async (signal: AbortSignal): Promise<{ channels: ChannelItem[]; rules: Rule[]; config: Config }> => {
      const [channels, rules, config] = await Promise.all([
        apiClient.getChannels(signal),
        apiClient.getRules({ offset: 0, limit: 1_000 }, signal),
        apiClient.getConfig(signal),
      ]);
      return { channels, rules: rules.rules, config };
    },
    [],
  );
  const pageOptions = useApiResource(loadPageOptions);
  const encodeModes = pageOptions.data?.config.encode ?? [];

  const loadRecorded = useCallback(
    (signal: AbortSignal): Promise<Records> =>
      apiClient.getRecorded(
        {
          ...searchQuery,
          isHalfWidth: preferences.isHalfWidthDisplayed,
          offset: (page - 1) * preferences.recordedLength,
          limit: preferences.recordedLength,
          hasOriginalFile: originalOnly ? true : undefined,
        },
        signal,
      ),
    [originalOnly, page, preferences.isHalfWidthDisplayed, preferences.recordedLength, searchQuery],
  );
  const resource = useApiResource(loadRecorded);

  // 「全ての番組を選択」で読み込んだ他ページの録画名も、削除確認の一覧に出せるよう覚えておく。
  // このキャッシュは表示中のページが変わるたびに外部 (API) から届く結果を取り込むだけで、
  // レンダーから導出できる値ではないため、effect 内での setState が適切なケース。
  useEffect(() => {
    const records = resource.data?.records;
    if (!records) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKnownItems((current) => {
      const next = new Map(current);
      for (const item of records) next.set(item.id, item);
      return next;
    });
  }, [resource.data]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch({ ...draftSearch, keyword: draftSearch.keyword.trim() });
    setOriginalOnly(draftOriginalOnly);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftSearch(EMPTY_PROGRAM_COLLECTION_SEARCH);
    setSearch(EMPTY_PROGRAM_COLLECTION_SEARCH);
    setDraftOriginalOnly(false);
    setOriginalOnly(false);
    setPage(1);
  };
  const hasSearch = hasProgramCollectionQuery(search) || originalOnly;
  const sortedRecords = useMemo(
    () => (resource.data ? sortItems(resource.data.records, sort, recordedSortAccessors) : []),
    [resource.data, sort],
  );

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  /**
   * ページ内だけでなく、今の検索条件に一致する録画すべてをバックエンドから取得して選択する。
   * ページネーションはあくまで一覧表示の都合であり、「全ての番組を選択」は表示中の1ページに
   * 限定されるべきではないため。
   */
  const selectAllPrograms = async () => {
    if (!resource.data || resource.data.total === 0) return;
    setSelectingAll(true);
    
    try {
      const all = await apiClient.getRecorded({
        ...searchQuery,
        isHalfWidth: preferences.isHalfWidthDisplayed,
        offset: 0,
        limit: resource.data.total,
        hasOriginalFile: originalOnly ? true : undefined,
      });
      setKnownItems((current) => {
        const next = new Map(current);
        for (const item of all.records) next.set(item.id, item);
        return next;
      });
      setSelectedIds(new Set(all.records.map((item) => item.id)));
    } catch (reason) {
      notifyError(reason instanceof Error ? reason.message : "録画一覧を取得できませんでした。");
    } finally {
      setSelectingAll(false);
    }
  };

  /** 表示中のページだけを足す。すでに選んだ他ページの分は残す。 */
  const selectCurrentPage = () => {
    const records = resource.data?.records ?? [];
    setSelectedIds((current) => new Set([...current, ...records.map((item) => item.id)]));
  };

  const deleteSelected = async () => {
    const ids = [...bulkTargetIds];
    setBusy(true);
    
    
    let deleted = 0;
    let deletedFiles = 0;
    const failed: number[] = [];
    for (const id of ids) {
      try {
        if (bulkDeleteOption === "all") {
          await apiClient.deleteRecorded(id);
        } else {
          const item = knownItems.get(id);
          if (!item) throw new Error(`録画 #${id} の情報を取得できませんでした。`);
          const plan = createRecordedDeletePlan(item, bulkDeleteOption);
          if (plan.kind === "recorded") {
            await apiClient.deleteRecorded(id);
            deletedFiles += plan.videoFileCount;
          } else {
            for (const videoFileId of plan.videoFileIds) {
              await apiClient.deleteVideo(videoFileId);
              deletedFiles += 1;
            }
          }
        }
        deleted += 1;
      } catch {
        failed.push(id);
      }
    }
    setBusy(false);
    setConfirmBulk(false);
    exitSelectMode();
    const deletedLabel = bulkDeleteOption === "all" ? `${deleted} 件の録画` : `${deletedFiles} 件の録画ファイル`;
    if (failed.length > 0) notifyError(`${deletedLabel}を削除しました。${failed.length} 件は削除できませんでした。`);
    else notifySuccess(`${deletedLabel}を削除しました。`);
    resource.reload();
  };

  const openBulkDeleteDialog = () => {
    const ids = [...selectedIds];
    setBulkCandidateIds(ids);
    setBulkTargetIds(new Set(ids));
    setConfirmBulk(true);
  };

  const toggleBulkTarget = (id: number) => {
    setBulkTargetIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openBulkEncodeDialog = () => {
    const plan = createRecordedEncodePlan([...selectedIds], knownItems);
    setEncodePlan(plan);
    setEncodeTargetIds(new Set(plan.targets.map((target) => target.recordedId)));
    setEncodeMode((current) => (encodeModes.includes(current) ? current : encodeModes[0] ?? ""));
    setConfirmEncode(true);
  };

  const toggleEncodeTarget = (id: number) => {
    setEncodeTargetIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const encodeSelected = async () => {
    const targets = encodePlan.targets.filter((target) => encodeTargetIds.has(target.recordedId));
    setBusy(true);
    
    
    let queued = 0;
    const failed: string[] = [];
    for (const target of targets) {
      try {
        await apiClient.addEncode({
          recordedId: target.recordedId,
          sourceVideoFileId: target.sourceVideoFileId,
          isSaveSameDirectory: true,
          mode: encodeMode,
          removeOriginal: encodeRemoveOriginal,
        });
        queued += 1;
      } catch {
        failed.push(target.name);
      }
    }
    setBusy(false);
    setConfirmEncode(false);
    exitSelectMode();
    if (failed.length > 0) {
      notifyError(`${queued} 件のエンコードを追加しました。${failed.length} 件は追加できませんでした。`);
    } else {
      notifySuccess(`${queued} 件のエンコードを追加しました。`);
    }
    resource.reload();
  };

  const regenerateThumbnails = async () => {
    const plan = createThumbnailPlan([...selectedIds], [...knownItems.values()]);
    setBusy(true);
    
    
    // 1 件ずつ ffmpeg が走るので、まとめて実行すると数分かかる。どこまで進んだかを出す。
    setThumbnailProgress({ done: 0, total: plan.targets.length });
    let done = 0;
    const failed: number[] = [];
    for (const target of plan.targets) {
      try {
        await apiClient.regenerateThumbnail(target);
        done += 1;
      } catch {
        failed.push(target.recordedId);
      }
      setThumbnailProgress({ done: done + failed.length, total: plan.targets.length });
    }
    setThumbnailProgress(null);
    setBusy(false);
    exitSelectMode();
    const skipped = plan.skipped.length + failed.length;
    if (skipped > 0) {
      notifyError(`${done} 件のサムネイルを作り直しました。${skipped} 件は作り直せませんでした。`);
    } else {
      notifySuccess(`${done} 件のサムネイルを作り直しました。`);
    }
    resource.reload();
  };

  const cleanup = async () => {
    setBusy(true);
    
    
    try {
      const removed = await apiClient.cleanupRecorded();
      notifySuccess(removed > 0 ? `ファイルが見つからない録画 ${removed} 件を一覧から取り除きました。` : "取り除く録画はありませんでした。");
      resource.reload();
    } catch (reason) {
      notifyError(reason instanceof Error ? reason.message : "録画の整理に失敗しました。");
    } finally {
      setBusy(false);
      setConfirmCleanup(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="録画済み"
        description="録画ライブラリを検索し、ファイル状態、エンコード、保護、ドロップ情報を確認できます。"
        actions={
          <><Button asChild><Link href="/recorded/upload"><Upload aria-hidden="true" />登録</Link></Button><Button asChild variant="ghost"><Link href="/encode"><Cpu aria-hidden="true" />エンコード</Link></Button><Button type="button" variant="ghost" onClick={() => (selectMode ? exitSelectMode() : enterSelectMode())}><ListChecks aria-hidden="true" />{selectMode ? "選択をやめる" : "選択"}</Button><Button type="button" variant="ghost" onClick={() => setConfirmCleanup(true)} disabled={busy}><Eraser aria-hidden="true" />整理</Button><Button type="button" variant="ghost" onClick={resource.revalidate} disabled={resource.isRefreshing}>
            <RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />
            更新
          </Button></>
        }
      />

      {thumbnailProgress ? (
        <Alert role="status" className="mb-5">
          <AlertDescription>
            <span className="flex items-center justify-between gap-3">
              <span>サムネイルを作り直しています…</span>
              <span className="tabular-nums text-muted-foreground">{thumbnailProgress.done} / {thumbnailProgress.total}</span>
            </span>
            <progress
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full accent-primary"
              max={thumbnailProgress.total}
              value={thumbnailProgress.done}
              aria-label="サムネイル再生成の進行状況"
            />
          </AlertDescription>
        </Alert>
      ) : null}

      {selectMode ? (
        <div className="mb-5 glass-panel flex flex-col gap-3 rounded-2xl p-4">
          {/* 選ぶ操作と、選んだものへの操作を分ける。並べると押し間違える。 */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 text-sm font-medium"><span className="tabular-nums text-foreground">{selectedIds.size}</span> 件を選択中</p>
            <Button type="button" size="sm" variant="outline" disabled={busy || selectingAll} onClick={selectCurrentPage}>
              <ListChecks aria-hidden="true" />このページを選択
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy || selectingAll} onClick={() => void selectAllPrograms()}>
              <ListChecks aria-hidden="true" />{selectingAll ? "全番組を取得中…" : "すべて選択"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy || selectedIds.size === 0} onClick={() => setSelectedIds(new Set())}>
              <Square aria-hidden="true" />選択を解除
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={exitSelectMode} disabled={busy}>選択をやめる</Button>
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button type="button" variant="outline" disabled={busy || selectedIds.size === 0 || encodeModes.length === 0} onClick={openBulkEncodeDialog}><Cpu aria-hidden="true" />まとめてエンコード</Button>
            <Button type="button" variant="outline" disabled={busy || selectedIds.size === 0} onClick={() => void regenerateThumbnails()}><ImageIcon aria-hidden="true" />サムネイル再生成</Button>
            <Button type="button" variant="destructive" disabled={busy || selectedIds.size === 0} onClick={openBulkDeleteDialog}><Trash2 aria-hidden="true" />まとめて削除</Button>
          </div>
        </div>
      ) : null}

      <ProgramCollectionSearch
        idPrefix="recorded-search"
        value={draftSearch}
        channels={pageOptions.data?.channels ?? []}
        rules={pageOptions.data?.rules ?? []}
        broadcast={pageOptions.data?.config.broadcast}
        methodLabel="録画方法"
        manualLabel="手動録画"
        onChange={setDraftSearch}
        onSubmit={submitSearch}
        onClear={clearFilters}
      >
          <div className="flex min-h-10 min-w-0 items-center justify-between gap-4 self-end glass-field rounded-lg border px-3">
            <span id="recorded-original-only-label" className="text-sm font-medium">元 TS がある番組のみ</span>
            <Switch
              checked={draftOriginalOnly}
              aria-labelledby="recorded-original-only-label"
              onClick={() => setDraftOriginalOnly((value) => !value)}
            />
          </div>
      </ProgramCollectionSearch>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        {resource.data ? (
          <p aria-live="polite" className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{resource.data.total}</span> 件
          </p>
        ) : null}
        {viewMode === "list" ? <TableColumnVisibilityMenu state={tableColumns} label="録画済み一覧の列" /> : null}
        <SortMenu sort={sort} columns={recordedSortColumns} label="録画済み一覧の並び替え" />
        <CollectionViewToggle value={viewMode} onChange={setViewMode} label="録画済み番組の表示形式" />
      </div>

      {resource.isLoading ? <ContentSkeleton cards={6} /> : null}
      {resource.error ? <ErrorState description={resource.error.message} onRetry={resource.reload} /> : null}
      {!resource.isLoading && resource.data?.records.length === 0 ? (
        <EmptyState
          title={hasSearch ? "条件に合う録画はありません" : "録画済み番組はありません"}
          description={hasSearch ? "検索語または絞り込み条件を変更してください。" : "録画が完了すると、ここに番組が追加されます。"}
          action={hasSearch ? <Button type="button" variant="outline" onClick={clearFilters}>条件をクリア</Button> : undefined}
        />
      ) : null}
      {!resource.isLoading && resource.data && resource.data.records.length > 0 ? (
        <>
          {viewMode === "list" ? (
            <RecordedTable
              records={sortedRecords}
              selectable={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              columns={tableColumns}
            />
          ) : (
            <div className={collectionLayoutClass(viewMode, "sm:grid-cols-2 2xl:grid-cols-3")} aria-label="録画済み番組">
              {sortedRecords.map((item) => (
                <RecordedCard
                  key={item.id}
                  item={item}
                  showDropInfo={preferences.isShowDropInfo}
                  selectable={selectMode}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={toggleSelect}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
          <Pagination page={page} pageSize={preferences.recordedLength} total={resource.data.total} onPageChange={setPage} />
        </>
      ) : null}

      <ConfirmDialog
        open={confirmBulk}
        title={`${bulkTargetIds.size} 件の録画を削除しますか？`}
        description="削除する番組とファイルを選択してください。この操作は元に戻せません。保護中・録画中の録画は削除されません。"
        confirmLabel="まとめて削除"
        busy={busy}
        confirmDisabled={bulkTargetIds.size === 0}
        onConfirm={() => void deleteSelected()}
        onCancel={() => setConfirmBulk(false)}
      >
        <div className="mt-4">
          <label htmlFor="bulk-delete-option" className="mb-2 block text-sm font-semibold">削除対象</label>
          <select
            id="bulk-delete-option"
            className="h-10 w-full rounded-lg border border-input bg-background/75 px-3 text-sm"
            value={bulkDeleteOption}
            onChange={(event) => setBulkDeleteOption(event.target.value as BulkDeleteOption)}
            disabled={busy}
          >
            <option value="all">すべて（番組情報を含む）</option>
            <option value="ts">元 TS ファイルだけ</option>
            <option value="encoded">エンコードファイルだけ</option>
          </select>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p id="bulk-delete-programs-label" className="text-sm font-semibold">対象番組</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy || bulkCandidateIds.length === 0}
            onClick={() => setBulkTargetIds(bulkTargetIds.size === bulkCandidateIds.length ? new Set() : new Set(bulkCandidateIds))}
          >
            {bulkTargetIds.size === bulkCandidateIds.length ? "すべて外す" : "すべて選ぶ"}
          </Button>
        </div>
        <ul aria-labelledby="bulk-delete-programs-label" className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border bg-muted/40 p-2 text-xs">
          {bulkCandidateIds.map((id) => (
            <li key={id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                  checked={bulkTargetIds.has(id)}
                  disabled={busy}
                  onChange={() => toggleBulkTarget(id)}
                  aria-label={`${knownItems.get(id)?.name ?? `録画 #${id}`} を削除対象にする`}
                />
                <span className="min-w-0 truncate" title={knownItems.get(id)?.name ?? `録画 #${id}`}>
                  {knownItems.get(id)?.name ?? `録画 #${id}`}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmEncode}
        title={`${encodeTargetIds.size} 件のエンコードを追加しますか？`}
        description="選択した番組の元 TS を変換元にして、待ち行列へ追加します。進み具合はエンコード画面で確認できます。"
        confirmLabel="まとめてエンコード"
        busy={busy}
        confirmDisabled={encodeTargetIds.size === 0 || encodeMode === ""}
        onConfirm={() => void encodeSelected()}
        onCancel={() => setConfirmEncode(false)}
      >
        <div className="mt-4">
          <label htmlFor="bulk-encode-mode" className="mb-2 block text-sm font-semibold">エンコード設定</label>
          <select
            id="bulk-encode-mode"
            className="h-10 w-full rounded-lg border border-input bg-background/75 px-3 text-sm"
            value={encodeMode}
            onChange={(event) => setEncodeMode(event.target.value)}
            disabled={busy}
          >
            {encodeModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 glass-field rounded-lg border p-3">
          <span id="bulk-encode-remove-label" className="text-sm font-semibold">完了後に元ファイルを削除</span>
          <Switch
            checked={encodeRemoveOriginal}
            disabled={busy}
            aria-labelledby="bulk-encode-remove-label"
            onClick={() => setEncodeRemoveOriginal((value) => !value)}
          />
        </div>
        {encodeRemoveOriginal ? (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            エンコード成功後に元 TS を削除します。出力を確認するまで残す場合は切ってください。
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p id="bulk-encode-programs-label" className="text-sm font-semibold">対象番組</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy || encodePlan.targets.length === 0}
            onClick={() => setEncodeTargetIds(
              encodeTargetIds.size === encodePlan.targets.length
                ? new Set()
                : new Set(encodePlan.targets.map((target) => target.recordedId)),
            )}
          >
            {encodeTargetIds.size === encodePlan.targets.length ? "すべて外す" : "すべて選ぶ"}
          </Button>
        </div>
        {encodePlan.targets.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">エンコードできる番組がありません。</p>
        ) : (
          <ul aria-labelledby="bulk-encode-programs-label" className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border bg-muted/40 p-2 text-xs">
            {encodePlan.targets.map((target) => (
              <li key={target.recordedId}>
                <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                    checked={encodeTargetIds.has(target.recordedId)}
                    disabled={busy}
                    onChange={() => toggleEncodeTarget(target.recordedId)}
                    aria-label={`${target.name} をエンコード対象にする`}
                  />
                  <span className="min-w-0 truncate" title={target.name}>{target.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {encodePlan.skipped.length > 0 ? (
          <>
            <p id="bulk-encode-skipped-label" className="mt-4 text-sm font-semibold">
              エンコードできない番組 ({encodePlan.skipped.length} 件)
            </p>
            <ul aria-labelledby="bulk-encode-skipped-label" className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border bg-muted/40 p-2 text-xs text-muted-foreground">
              {encodePlan.skipped.map((skip) => (
                <li key={skip.recordedId} className="flex min-w-0 items-baseline gap-2 p-2">
                  <span className="min-w-0 truncate" title={skip.name}>{skip.name}</span>
                  <span className="shrink-0">— {recordedEncodeSkipLabel[skip.reason]}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmCleanup}
        title="録画を整理しますか？"
        description="ファイルが見つからない録画を一覧 (データベース) から取り除きます。ディスク上のファイルは変更しません。"
        confirmLabel="整理する"
        busy={busy}
        onConfirm={() => void cleanup()}
        onCancel={() => setConfirmCleanup(false)}
      />
    </>
  );
}
