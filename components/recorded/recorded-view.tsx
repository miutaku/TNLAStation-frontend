"use client";

import { Cpu, Eraser, Film, HardDrive, ListChecks, LockKeyhole, RefreshCw, Sparkles, Trash2, TriangleAlert, Upload } from "lucide-react";
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
import { apiClient } from "@/lib/api/client";
import type { ChannelItem, RecordedItem, Records, Rule } from "@/lib/api/types";
import { formatBytes, formatDateTime, formatDuration, genreName } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { useChannelNames } from "@/lib/hooks/use-channel-names";
import { usePreferences } from "@/lib/hooks/use-preferences";

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

function RecordedCard({ item, showDropInfo, selectable, selected, onToggleSelect, viewMode }: { item: RecordedItem; showDropInfo: boolean; selectable: boolean; selected: boolean; onToggleSelect: (id: number) => void; viewMode: CollectionViewMode }) {
  const channelName = useChannelNames();
  const fileSize = item.videoFiles?.reduce((total, file) => total + file.size, 0) ?? 0;
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
          {item.thumbnails && item.thumbnails.length > 0 ? (
            // 画像が無い録画も並ぶので、枠の大きさは変えない。
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={apiClient.thumbnailUrl(item.thumbnails[0])}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <Film aria-hidden="true" className="size-12 text-primary/55 transition-transform group-hover:scale-105" strokeWidth={1.3} />
          )}
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
          <div className="mt-4 flex justify-end"><Button asChild size="sm"><Link href={`/recorded/detail/${item.id}`}>詳細を見る</Link></Button></div>
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
    const fileSize = item.videoFiles?.reduce((total, file) => total + file.size, 0) ?? 0;
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
          <Button asChild size="sm" variant="outline">
            <Link href={`/recorded/detail/${item.id}`} aria-label={`${item.name} の詳細を表示`}>詳細</Link>
          </Button>
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
  /** 「全ての番組を選択」で読み込んだ他ページの録画名も、削除確認の一覧に出せるよう覚えておく。 */
  const [knownItemNames, setKnownItemNames] = useState<Map<number, string>>(new Map());
  const [busy, setBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { preferences } = usePreferences();
  const [viewMode, setViewMode] = useCollectionViewMode("recorded");
  const availableTableColumns = useMemo(
    () => preferences.isShowDropInfo
      ? recordedTableColumns
      : recordedTableColumns.filter((column) => column.key !== "drop"),
    [preferences.isShowDropInfo],
  );
  const tableColumns = useTableColumnVisibility("recorded", availableTableColumns);
  const searchQuery = useMemo(() => toProgramCollectionQuery(search), [search]);
  const loadSearchOptions = useCallback(
    async (signal: AbortSignal): Promise<{ channels: ChannelItem[]; rules: Rule[] }> => {
      const [channels, rules] = await Promise.all([
        apiClient.getChannels(signal),
        apiClient.getRules({ offset: 0, limit: 1_000 }, signal),
      ]);
      return { channels, rules: rules.rules };
    },
    [],
  );
  const searchOptions = useApiResource(loadSearchOptions);

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
    setKnownItemNames((current) => {
      const next = new Map(current);
      for (const item of records) next.set(item.id, item.name);
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

  /** 今表示している1ページぶんだけを選択する。ページを切り替えながら選ぶときの下ごしらえ用。 */
  const selectCurrentPage = () => {
    const records = resource.data?.records;
    if (!records) return;
    setSelectedIds((current) => new Set([...current, ...records.map((item) => item.id)]));
  };

  /**
   * ページ内だけでなく、今の検索条件に一致する録画すべてをバックエンドから取得して選択する。
   * ページネーションはあくまで一覧表示の都合であり、「全ての番組を選択」は表示中の1ページに
   * 限定されるべきではないため。
   */
  const selectAllPrograms = async () => {
    if (!resource.data || resource.data.total === 0) return;
    setSelectingAll(true);
    setActionError(null);
    try {
      const all = await apiClient.getRecorded({
        ...searchQuery,
        isHalfWidth: preferences.isHalfWidthDisplayed,
        offset: 0,
        limit: resource.data.total,
        hasOriginalFile: originalOnly ? true : undefined,
      });
      setKnownItemNames((current) => {
        const next = new Map(current);
        for (const item of all.records) next.set(item.id, item.name);
        return next;
      });
      setSelectedIds(new Set(all.records.map((item) => item.id)));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "録画一覧を取得できませんでした。");
    } finally {
      setSelectingAll(false);
    }
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    let deleted = 0;
    const failed: number[] = [];
    for (const id of ids) {
      try {
        await apiClient.deleteRecorded(id);
        deleted += 1;
      } catch {
        failed.push(id);
      }
    }
    setBusy(false);
    setConfirmBulk(false);
    exitSelectMode();
    if (failed.length > 0) setActionError(`${deleted} 件を削除しました。${failed.length} 件は削除できませんでした (保護中や録画中の可能性があります)。`);
    else setActionMessage(`${deleted} 件の録画を削除しました。`);
    resource.reload();
  };

  const cleanup = async () => {
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const removed = await apiClient.cleanupRecorded();
      setActionMessage(removed > 0 ? `ファイルが見つからない録画 ${removed} 件を一覧から取り除きました。` : "取り除く録画はありませんでした。");
      resource.reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "録画の整理に失敗しました。");
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
          <><Button asChild><Link href="/recorded/upload"><Upload aria-hidden="true" />登録</Link></Button><Button asChild variant="ghost"><Link href="/encode"><Cpu aria-hidden="true" />エンコード</Link></Button><Button type="button" variant="ghost" onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}><ListChecks aria-hidden="true" />{selectMode ? "選択をやめる" : "選択"}</Button><Button type="button" variant="ghost" onClick={() => setConfirmCleanup(true)} disabled={busy}><Eraser aria-hidden="true" />整理</Button><Button type="button" variant="ghost" onClick={resource.revalidate} disabled={resource.isRefreshing}>
            <RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />
            更新
          </Button></>
        }
      />

      {actionMessage ? <Alert role="status" className="mb-5 border-emerald-500/35"><AlertDescription>{actionMessage}</AlertDescription></Alert> : null}
      {actionError ? <Alert role="alert" className="mb-5 border-destructive/40"><AlertDescription>{actionError}</AlertDescription></Alert> : null}

      {selectMode ? (
        <div className="mb-5 flex flex-col gap-3 glass-panel rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium"><span className="tabular-nums text-foreground">{selectedIds.size}</span> 件を選択中</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              title="このページに表示されている録画を選択します"
              onClick={selectCurrentPage}
              disabled={busy || (resource.data?.records.length ?? 0) === 0}
            >
              このページの全番組を選択
            </Button>
            <Button
              type="button"
              variant="ghost"
              title="今の検索条件に一致する録画をすべて選択します"
              onClick={() => void selectAllPrograms()}
              disabled={busy || selectingAll || !resource.data || resource.data.total === 0 || selectedIds.size === resource.data.total}
            >
              {selectingAll ? <RefreshCw aria-hidden="true" className="animate-spin" /> : null}
              {selectingAll ? "取得中…" : "全ての番組を選択"}
            </Button>
            <Button type="button" variant="ghost" onClick={exitSelectMode} disabled={busy}>選択解除</Button>
            <Button type="button" variant="destructive" disabled={busy || selectedIds.size === 0} onClick={() => setConfirmBulk(true)}><Trash2 aria-hidden="true" />まとめて削除</Button>
          </div>
        </div>
      ) : null}

      <ProgramCollectionSearch
        idPrefix="recorded-search"
        value={draftSearch}
        channels={searchOptions.data?.channels ?? []}
        rules={searchOptions.data?.rules ?? []}
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
              records={resource.data.records}
              selectable={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              columns={tableColumns}
            />
          ) : (
            <div className={collectionLayoutClass(viewMode, "sm:grid-cols-2 2xl:grid-cols-3")} aria-label="録画済み番組">
              {resource.data.records.map((item) => (
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
        title={`${selectedIds.size} 件の録画を削除しますか？`}
        description="次の録画を削除します。この操作は元に戻せません。保護中・録画中の録画は削除されません。"
        confirmLabel="まとめて削除"
        busy={busy}
        onConfirm={() => void deleteSelected()}
        onCancel={() => setConfirmBulk(false)}
      >
        <ul className="mt-4 max-h-56 space-y-1 overflow-y-auto rounded-lg border bg-muted/40 p-2 text-xs">
          {[...selectedIds].map((id) => (
            <li key={id} className="truncate" title={knownItemNames.get(id) ?? `録画 #${id}`}>
              {knownItemNames.get(id) ?? `録画 #${id}`}
            </li>
          ))}
        </ul>
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
