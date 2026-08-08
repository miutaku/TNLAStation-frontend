"use client";

import { CalendarClock, Clock, Folder, Pencil, Plus, Radio, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, type FormEvent } from "react";

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
import type { ChannelItem, GetReserveType, ReserveItem, Reserves, Rule, Config } from "@/lib/api/types";
import { formatDateTime, formatDuration, genreName } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { useChannelNames } from "@/lib/hooks/use-channel-names";
import { usePreferences } from "@/lib/hooks/use-preferences";

const filters: { value: GetReserveType; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "normal", label: "予約" },
  { value: "conflict", label: "競合" },
  { value: "overlap", label: "重複" },
  { value: "skip", label: "除外" },
];

const reserveTableColumns = [
  { key: "status", label: "状態" },
  { key: "program", label: "番組" },
  { key: "airtime", label: "放送日時" },
  { key: "station", label: "放送局" },
  { key: "genre", label: "ジャンル" },
  { key: "method", label: "予約方法" },
  { key: "destination", label: "保存先" },
  { key: "id", label: "ID" },
  { key: "actions", label: "操作" },
] as const;
type ReserveTableColumn = (typeof reserveTableColumns)[number]["key"];

const reserveSortAccessors: SortAccessors<ReserveItem, ReserveTableColumn> = {
  status: (reserve) => (reserve.isSkip ? 3 : reserve.isOverlap ? 2 : reserve.isConflict ? 1 : 0),
  program: (reserve) => reserve.name,
  airtime: (reserve) => reserve.startAt,
  station: (reserve) => reserve.channelId,
  genre: (reserve) => reserve.genre1 ?? -1,
  method: (reserve) => reserve.ruleId ?? -1,
  destination: (reserve) => [reserve.parentDirectoryName, reserve.directory].filter(Boolean).join("/"),
  id: (reserve) => reserve.id,
};
const sortableReserveColumns = Object.keys(reserveSortAccessors) as ReserveTableColumn[];
const reserveSortColumns: SortColumnDefinition<ReserveTableColumn>[] = reserveTableColumns.filter(
  (column) => reserveSortAccessors[column.key],
);

export function reserveMethodLabel(reserve: Pick<ReserveItem, "ruleId" | "ruleName">): string {
  if (!reserve.ruleId) return "手動予約";
  if (reserve.ruleName) return reserve.ruleName;
  return `ルール #${reserve.ruleId}`;
}

function ReserveStatuses({ reserve }: { reserve: ReserveItem }) {
  if (!reserve.isConflict && !reserve.isOverlap && !reserve.isSkip) return <Badge variant="success">予約済み</Badge>;
  return (
    <>
      {reserve.isConflict ? <Badge variant="destructive">競合</Badge> : null}
      {reserve.isOverlap ? <Badge variant="warning">重複</Badge> : null}
      {reserve.isSkip ? <Badge variant="secondary">除外</Badge> : null}
    </>
  );
}

function ReserveActions({ reserve, onDelete }: { reserve: ReserveItem; onDelete: (reserve: ReserveItem) => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/reserves/${reserve.id}/edit`} aria-label={`${reserve.name}を編集`}>
          <Pencil aria-hidden="true" />編集
        </Link>
      </Button>
      <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(reserve)} aria-label={`${reserve.name}を削除`}>
        <Trash2 aria-hidden="true" />削除
      </Button>
    </div>
  );
}

function ReserveCard({
  reserve,
  viewMode,
  onDelete,
}: {
  reserve: ReserveItem;
  viewMode: CollectionViewMode;
  onDelete: (reserve: ReserveItem) => void;
}) {
  const channelName = useChannelNames();
  return (
    <Card className={viewMode === "list" ? "rounded-lg shadow-none transition-colors hover:bg-muted/35" : "transition-shadow hover:shadow-md"}>
      <CardContent className={viewMode === "list" ? "py-4 sm:py-4" : "pt-5 sm:pt-6"}>
        <article aria-labelledby={`reserve-${reserve.id}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <ReserveStatuses reserve={reserve} />
                {reserve.isTimeSpecified ? <Badge variant="outline">時刻指定</Badge> : null}
                {reserve.allowEndLack ? <Badge variant="outline">末尾切れ許可</Badge> : null}
              </div>
              <h2 id={`reserve-${reserve.id}`} className="mt-3 text-lg font-semibold leading-7 text-balance">
                {reserve.name}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm font-medium text-foreground">
                <time dateTime={new Date(reserve.startAt).toISOString()}>{formatDateTime(reserve.startAt)}</time>
                <span aria-hidden="true">–</span>
                <time dateTime={new Date(reserve.endAt).toISOString()}>{formatDateTime(reserve.endAt).split(" ")[1]}</time>
                <span className="text-muted-foreground">({formatDuration(reserve.startAt, reserve.endAt)})</span>
              </p>
              {reserve.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{reserve.description}</p> : null}
            </div>
            <span className="text-xs font-medium text-muted-foreground">予約 #{reserve.id}</span>
          </div>

          <dl className="mt-5 grid gap-3 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-2">
              <Radio aria-hidden="true" className="size-4 text-primary" />
              <dt className="sr-only">チャンネル</dt>
              <dd>{channelName(reserve.channelId)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Clock aria-hidden="true" className="size-4 text-primary" />
              <dt className="sr-only">ジャンル</dt>
              <dd>{genreName(reserve.genre1)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Folder aria-hidden="true" className="size-4 text-primary" />
              <dt className="sr-only">保存先</dt>
              <dd className="truncate">{[reserve.parentDirectoryName, reserve.directory].filter(Boolean).join("/") || "既定の保存先"}</dd>
            </div>
            <div className="flex items-center gap-2">
              <CalendarClock aria-hidden="true" className="size-4 text-primary" />
              <dt className="sr-only">予約方法</dt>
              <dd>{reserveMethodLabel(reserve)}</dd>
            </div>
          </dl>
          <div className="mt-4 border-t pt-4">
            <ReserveActions reserve={reserve} onDelete={onDelete} />
          </div>
        </article>
      </CardContent>
    </Card>
  );
}

const reserveHeaderClassName: Partial<Record<ReserveTableColumn, string>> = {
  id: "text-right",
};

function ReserveTable({
  reserves,
  columns,
  onDelete,
}: {
  reserves: ReserveItem[];
  columns: TableColumnVisibilityState<ReserveTableColumn>;
  onDelete: (reserve: ReserveItem) => void;
}) {
  const channelName = useChannelNames();
  const visibleColumns = columns.columns.filter((column) => columns.isVisible(column.key));

  const renderCell = (key: ReserveTableColumn, reserve: ReserveItem) => {
    switch (key) {
      case "status":
        return (
          <div className="flex max-w-48 flex-wrap gap-1.5">
            <ReserveStatuses reserve={reserve} />
            {reserve.isTimeSpecified ? <Badge variant="outline">時刻指定</Badge> : null}
          </div>
        );
      case "program":
        return (
          <>
            <p className="font-semibold leading-6">{reserve.name}</p>
            {reserve.description ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{reserve.description}</p> : null}
          </>
        );
      case "airtime":
        return (
          <>
            <time dateTime={new Date(reserve.startAt).toISOString()}>{formatDateTime(reserve.startAt)}</time>
            <p className="mt-1 text-xs text-muted-foreground">{formatDuration(reserve.startAt, reserve.endAt)}</p>
          </>
        );
      case "station":
        return channelName(reserve.channelId);
      case "genre":
        return genreName(reserve.genre1);
      case "method":
        return reserveMethodLabel(reserve);
      case "destination":
        return [reserve.parentDirectoryName, reserve.directory].filter(Boolean).join("/") || "既定の保存先";
      case "id":
        return `#${reserve.id}`;
      case "actions":
        return <ReserveActions reserve={reserve} onDelete={onDelete} />;
    }
  };

  const cellClassName: Partial<Record<ReserveTableColumn, string>> = {
    program: "max-w-[28rem] whitespace-normal",
    destination: "max-w-56 overflow-hidden text-ellipsis",
    id: "text-right text-muted-foreground",
    actions: "text-right",
  };

  return (
    <Table className="min-w-[72rem]">
      <TableCaption>予約番組</TableCaption>
      <TableHeader>
        <TableRow>
          {visibleColumns.map((column) => (
            <TableHead key={column.key} className={reserveHeaderClassName[column.key]}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {reserves.map((reserve) => (
          <TableRow key={reserve.id}>
            {visibleColumns.map((column) => (
              <TableCell key={column.key} className={cellClassName[column.key]}>
                {renderCell(column.key, reserve)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ReservesView() {
  const [filter, setFilter] = useState<GetReserveType>("all");
  const [page, setPage] = useState(1);
  const [draftSearch, setDraftSearch] = useState<ProgramCollectionSearchValue>(
    EMPTY_PROGRAM_COLLECTION_SEARCH,
  );
  const [search, setSearch] = useState<ProgramCollectionSearchValue>(EMPTY_PROGRAM_COLLECTION_SEARCH);
  const [deleteTarget, setDeleteTarget] = useState<ReserveItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { preferences } = usePreferences();
  const [viewMode, setViewMode] = useCollectionViewMode("reserves");
  const tableColumns = useTableColumnVisibility("reserves", reserveTableColumns);
  const sort = useSortState("reserves", sortableReserveColumns);
  const searchQuery = useMemo(() => toProgramCollectionQuery(search), [search]);
  const loadSearchOptions = useCallback(
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
  const searchOptions = useApiResource(loadSearchOptions);
  const loadReserves = useCallback(
    (signal: AbortSignal): Promise<Reserves> =>
      apiClient.getReserves(
        {
          type: filter,
          ...searchQuery,
          isHalfWidth: preferences.isHalfWidthDisplayed,
          offset: (page - 1) * preferences.reservesLength,
          limit: preferences.reservesLength,
        },
        signal,
      ),
    [filter, page, preferences.isHalfWidthDisplayed, preferences.reservesLength, searchQuery],
  );
  const resource = useApiResource(loadReserves);

  const changeFilter = (value: GetReserveType) => {
    setFilter(value);
    setPage(1);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch({ ...draftSearch, keyword: draftSearch.keyword.trim() });
    setPage(1);
  };

  const clearSearch = () => {
    setDraftSearch(EMPTY_PROGRAM_COLLECTION_SEARCH);
    setSearch(EMPTY_PROGRAM_COLLECTION_SEARCH);
    setPage(1);
  };

  const hasSearch = hasProgramCollectionQuery(search);
  const sortedReserves = useMemo(
    () => (resource.data ? sortItems(resource.data.reserves, sort, reserveSortAccessors) : []),
    [resource.data, sort],
  );

  const deleteReserve = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await apiClient.deleteReserve(deleteTarget.id);
      setDeleteTarget(null);
      resource.reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "予約を削除できませんでした。");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Reservations"
        title="予約一覧"
        description="予約、競合、重複、除外を状態別に確認し、録画スケジュールを把握できます。"
        actions={
          <><Button asChild><Link href="/reserves/manual"><Plus aria-hidden="true" />時刻指定予約</Link></Button><Button type="button" variant="ghost" onClick={resource.revalidate} disabled={resource.isRefreshing}>
            <RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />
            更新
          </Button></>
        }
      />

      <ProgramCollectionSearch
        idPrefix="reserve-search"
        value={draftSearch}
        channels={searchOptions.data?.channels ?? []}
        rules={searchOptions.data?.rules ?? []}
        broadcast={searchOptions.data?.config.broadcast}
        manualLabel="手動予約"
        onChange={setDraftSearch}
        onSubmit={submitSearch}
        onClear={clearSearch}
      />

      <div className="mb-5 flex flex-col gap-3 glass-panel rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <fieldset>
          <legend className="sr-only">予約状態で絞り込む</legend>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1">
            {filters.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={filter === item.value ? "default" : "ghost"}
                aria-pressed={filter === item.value}
                onClick={() => changeFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-3">
          {resource.data ? (
            <p aria-live="polite" className="text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{resource.data.total}</span> 件
            </p>
          ) : null}
          {viewMode === "list" ? <TableColumnVisibilityMenu state={tableColumns} label="予約一覧の列" /> : null}
          <SortMenu sort={sort} columns={reserveSortColumns} label="予約一覧の並び替え" />
          <CollectionViewToggle value={viewMode} onChange={setViewMode} label="予約一覧の表示形式" />
        </div>
      </div>

      {resource.isLoading ? <ContentSkeleton cards={5} /> : null}
      {resource.error ? <ErrorState description={resource.error.message} onRetry={resource.reload} /> : null}
      {actionError ? <ErrorState title="予約を削除できませんでした" description={actionError} /> : null}
      {!resource.isLoading && resource.data?.reserves.length === 0 ? (
        <EmptyState
          title={hasSearch ? "条件に合う予約はありません" : "該当する予約はありません"}
          description={
            hasSearch
              ? "キーワードや予約方法、放送局、ジャンルを変更してください。"
              : filter === "all"
                ? "現在登録されている予約はありません。"
                : "別の状態を選ぶと予約が見つかる場合があります。"
          }
          action={hasSearch ? <Button type="button" variant="outline" onClick={clearSearch}>条件をクリア</Button> : undefined}
        />
      ) : null}
      {!resource.isLoading && resource.data && resource.data.reserves.length > 0 ? (
        <>
          {filter === "conflict" ? (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm">
              <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
              <p>チューナー数や予約時刻が重なっています。録画前にバックエンド側の予約設定を確認してください。</p>
            </div>
          ) : null}
          {viewMode === "list" ? (
            <ReserveTable reserves={sortedReserves} columns={tableColumns} onDelete={setDeleteTarget} />
          ) : (
            <div className={collectionLayoutClass(viewMode, "xl:grid-cols-2")} aria-label="予約番組">
              {sortedReserves.map((reserve) => <ReserveCard key={reserve.id} reserve={reserve} viewMode={viewMode} onDelete={setDeleteTarget} />)}
            </div>
          )}
          <Pagination page={page} pageSize={preferences.reservesLength} total={resource.data.total} onPageChange={setPage} />
        </>
      ) : null}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="予約を削除しますか？"
        description={deleteTarget ? `「${deleteTarget.name}」を削除します。ルールから作られた予約は除外予約として残ります。` : ""}
        confirmLabel="予約を削除"
        busy={deleting}
        onConfirm={() => void deleteReserve()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
