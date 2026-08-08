"use client";

import { CalendarSearch, Info, ListPlus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import { CollapsibleSearchPanel } from "@/components/collapsible-search-panel";
import {
  collectionLayoutClass,
  CollectionViewToggle,
  type CollectionViewMode,
  useCollectionViewMode,
} from "@/components/collection-view";
import { PageHeader } from "@/components/page-header";
import { ProgramReserveDialog } from "@/components/guide/program-reserve-dialog";
import { createRuleDraftUrl } from "@/components/rules/rule-create-draft";
import { SortMenu, sortItems, useSortState, type SortAccessors, type SortColumnDefinition } from "@/components/sortable-columns";
import {
  DEFAULT_SEARCH_CONDITIONS,
  hasAnySearchCondition,
  SearchConditionsForm,
  searchConditionsToOption,
  validateSearchConditions,
  type SearchConditions,
} from "@/components/search/search-conditions";
import {
  TableColumnVisibilityMenu,
  type TableColumnVisibilityState,
  useTableColumnVisibility,
} from "@/components/table-column-visibility";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ValidationSummary } from "@/components/ui/validation-summary";
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
import type { ChannelItem, Config, ReserveItem, ScheduleProgramItem, ScheduleSearchOptions, BroadcastStatus } from "@/lib/api/types";
import { formatDateTime, formatDuration, genreName } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { useChannelNames } from "@/lib/hooks/use-channel-names";
import { usePreferences } from "@/lib/hooks/use-preferences";

interface SearchRequest {
  id: number;
  options: ScheduleSearchOptions;
}

const searchResultTableColumns = [
  { key: "program", label: "番組" },
  { key: "airtime", label: "放送日時" },
  { key: "duration", label: "長さ" },
  { key: "station", label: "放送局" },
  { key: "genre", label: "ジャンル" },
  { key: "access", label: "視聴条件" },
] as const;
type SearchResultTableColumn = (typeof searchResultTableColumns)[number]["key"];

const searchResultSortAccessors: SortAccessors<ScheduleProgramItem, SearchResultTableColumn> = {
  program: (program) => program.name,
  airtime: (program) => program.startAt,
  duration: (program) => program.endAt - program.startAt,
  station: (program) => program.channelId,
  genre: (program) => program.genre1 ?? -1,
  access: (program) => program.isFree,
};
const sortableSearchResultColumns = Object.keys(searchResultSortAccessors) as SearchResultTableColumn[];
const searchResultSortColumns: SortColumnDefinition<SearchResultTableColumn>[] = searchResultTableColumns.filter(
  (column) => searchResultSortAccessors[column.key],
);

function ProgramResult({
  program,
  viewMode,
  onOpen,
}: {
  program: ScheduleProgramItem;
  viewMode: CollectionViewMode;
  onOpen: (program: ScheduleProgramItem) => void;
}) {
  const channelName = useChannelNames();
  return (
    <Card className={viewMode === "list" ? "rounded-lg shadow-none transition-colors hover:bg-muted/35" : "transition-shadow hover:shadow-md"}>
      <CardContent className={viewMode === "list" ? "py-4 sm:py-4" : "pt-5 sm:pt-6"}>
        <article aria-labelledby={`search-result-${program.id}`}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="max-w-full"><span className="min-w-0 truncate">{channelName(program.channelId)}</span></Badge>
            <Badge variant="secondary">{genreName(program.genre1)}</Badge>
            <Badge variant={program.isFree ? "success" : "warning"}>{program.isFree ? "無料" : "有料"}</Badge>
          </div>
          <h2 id={`search-result-${program.id}`} className="mt-3 text-lg font-semibold leading-7 text-balance">
            {program.name}
          </h2>
          <p className="mt-1 text-sm font-medium">
            <time dateTime={new Date(program.startAt).toISOString()}>{formatDateTime(program.startAt)}</time>
            <span className="ml-2 text-muted-foreground">{formatDuration(program.startAt, program.endAt)}</span>
          </p>
          {program.description ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{program.description}</p> : null}
          <div className="mt-4 flex justify-end border-t pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpen(program)}>
              <Info aria-hidden="true" />詳細を見る
            </Button>
          </div>
        </article>
      </CardContent>
    </Card>
  );
}

function ProgramResultsTable({
  programs,
  columns,
  onOpen,
}: {
  programs: ScheduleProgramItem[];
  columns: TableColumnVisibilityState<SearchResultTableColumn>;
  onOpen: (program: ScheduleProgramItem) => void;
}) {
  const channelName = useChannelNames();
  const visibleColumns = columns.columns.filter((column) => columns.isVisible(column.key));

  const renderCell = (key: SearchResultTableColumn, program: ScheduleProgramItem) => {
    switch (key) {
      case "program":
        return (
          <>
            <p className="font-semibold leading-6">{program.name}</p>
            {program.description ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{program.description}</p> : null}
          </>
        );
      case "airtime":
        return <time dateTime={new Date(program.startAt).toISOString()}>{formatDateTime(program.startAt)}</time>;
      case "duration":
        return formatDuration(program.startAt, program.endAt);
      case "station":
        return channelName(program.channelId);
      case "genre":
        return genreName(program.genre1);
      case "access":
        return <Badge variant={program.isFree ? "success" : "warning"}>{program.isFree ? "無料" : "有料"}</Badge>;
    }
  };

  return (
    <Table className="min-w-[68rem]">
      <TableCaption>番組検索結果</TableCaption>
      <TableHeader>
        <TableRow>
          {visibleColumns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {programs.map((program) => (
          <TableRow key={program.id}>
            {visibleColumns.map((column) => (
              <TableCell key={column.key} className={column.key === "program" ? "max-w-[34rem] whitespace-normal" : undefined}>
                {renderCell(column.key, program)}
              </TableCell>
            ))}
            <TableCell className="text-right">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpen(program)}>
                <Info aria-hidden="true" />詳細を見る
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SearchView() {
  const router = useRouter();
  const { preferences } = usePreferences();
  // 番組表などから ?keyword= 付きで来たときは、その語を初期条件に入れておく。
  const [conditions, setConditions] = useState<SearchConditions>(() => {
    const keyword = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("keyword");
    return keyword ? { ...DEFAULT_SEARCH_CONDITIONS, keyword } : DEFAULT_SEARCH_CONDITIONS;
  });
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [reserves, setReserves] = useState<ReserveItem[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<ScheduleProgramItem | null>(null);
  const requestId = useRef(0);
  // 「この番組を検索」のようなリンクは、遷移した時点で結果が出ていることを期待している。
  // ?keyword= 由来の条件をフォームへ入れるだけでなく、ここで検索も実行しておく。
  const [request, setRequest] = useState<SearchRequest | null>(() => {
    if (!hasAnySearchCondition(conditions) || validateSearchConditions(conditions).length > 0) return null;
    // requestId.current はまだ 0 のまま (増分は submit だけが行う)。最初の1件はこれと同じ 0 を使う。
    return {
      id: 0,
      options: {
        option: searchConditionsToOption(conditions),
        isHalfWidth: preferences.isHalfWidthDisplayed,
        limit: 300,
      },
    };
  });
  const [viewMode, setViewMode] = useCollectionViewMode("search-results");
  const tableColumns = useTableColumnVisibility("search-results", searchResultTableColumns);
  const sort = useSortState("search-results", sortableSearchResultColumns);

  const [broadcast, setBroadcast] = useState<BroadcastStatus | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void apiClient.getChannels().then(
      (list) => {
        if (!cancelled) setChannels(list);
      },
      () => undefined,
    );
    // 受信できる放送波を知るためだけに読む。取れなければ全種別を出す。
    void apiClient.getConfig().then(
      (config) => {
        if (cancelled) return;
        setConfig(config);
        setBroadcast(config.broadcast);
      },
      () => undefined,
    );
    void apiClient.getReserves({ type: "normal", isHalfWidth: false, limit: 2000 }).then(
      (result) => {
        if (!cancelled) setReserves(result.reserves);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const loadResults = useCallback(
    (signal: AbortSignal): Promise<ScheduleProgramItem[]> =>
      request ? apiClient.searchSchedules(request.options, signal) : Promise.resolve([]),
    [request],
  );
  const resource = useApiResource(loadResults);
  const sortedResults = useMemo(
    () => sortItems(resource.data ?? [], sort, searchResultSortAccessors),
    [resource.data, sort],
  );

  const validationErrors = validateSearchConditions(conditions);
  const canSearch = hasAnySearchCondition(conditions) && validationErrors.length === 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSearch) return;
    requestId.current += 1;
    setRequest({
      id: requestId.current,
      options: {
        option: searchConditionsToOption(conditions),
        isHalfWidth: preferences.isHalfWidthDisplayed,
        limit: 300,
      },
    });
  };

  const openRuleCreatePage = () => {
    router.push(createRuleDraftUrl("", searchConditionsToOption(conditions)));
  };

  const reset = () => {
    setConditions(DEFAULT_SEARCH_CONDITIONS);
    setRequest(null);
  };

  const reloadReserves = useCallback(() => {
    void apiClient.getReserves({ type: "normal", isHalfWidth: false, limit: 2000 }).then(
      (result) => setReserves(result.reserves),
      () => undefined,
    );
  }, []);

  const selectedReserveId = selectedProgram
    ? reserves.find((reserve) => reserve.programId === selectedProgram.id)?.id
    : undefined;

  return (
    <>
      <PageHeader
        title="番組検索"
        description="番組名・概要・詳細やジャンル・時刻・長さなどで放送予定を検索し、その条件から録画ルールも作れます。"
        actions={
          <Button type="button" variant="ghost" onClick={resource.revalidate} disabled={!request || resource.isRefreshing}>
            <RefreshCw aria-hidden="true" className={resource.isLoading && request ? "animate-spin" : undefined} />
            結果を更新
          </Button>
        }
      />

      <form onSubmit={submit} role="search" className="mb-6">
        <CollapsibleSearchPanel>
        <SearchConditionsForm conditions={conditions} onChange={setConditions} channels={channels} broadcast={broadcast} />
        <div className="mt-5"><ValidationSummary errors={validationErrors} /></div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={reset}>
            <RotateCcw aria-hidden="true" />条件をクリア
          </Button>
          <Button type="button" variant="outline" disabled={!canSearch} onClick={openRuleCreatePage}>
            <ListPlus aria-hidden="true" />この条件を録画ルール作成へ
          </Button>
          <Button type="submit" disabled={!canSearch}>
            <Search aria-hidden="true" />検索する
          </Button>
        </div>
        </CollapsibleSearchPanel>
      </form>

      {!request ? (
        <EmptyState title="番組を検索できます" description="条件を入力して「検索する」を押してください。キーワードが無くてもジャンルや時刻だけで検索できます。" />
      ) : null}
      {request && resource.isLoading ? <ContentSkeleton cards={5} /> : null}
      {request && resource.error ? <ErrorState title="番組を検索できませんでした" description={resource.error.message} onRetry={resource.reload} /> : null}
      {request && !resource.isLoading && resource.data?.length === 0 ? (
        <EmptyState title="該当する番組はありません" description="条件を変更して、もう一度検索してください。" />
      ) : null}
      {request && !resource.isLoading && resource.data && resource.data.length > 0 ? (
        <section aria-labelledby="search-results-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 id="search-results-title" className="flex items-center gap-2 text-lg font-semibold">
              <CalendarSearch aria-hidden="true" className="size-5 text-primary" />検索結果
            </h2>
            <div className="flex items-center gap-3">
              <p aria-live="polite" className="text-sm text-muted-foreground">{resource.data.length} 件</p>
              {viewMode === "list" ? <TableColumnVisibilityMenu state={tableColumns} label="検索結果の列" /> : null}
              <SortMenu sort={sort} columns={searchResultSortColumns} label="検索結果の並び替え" />
              <CollectionViewToggle value={viewMode} onChange={setViewMode} label="検索結果の表示形式" />
            </div>
          </div>
          {viewMode === "list" ? (
            <ProgramResultsTable programs={sortedResults} columns={tableColumns} onOpen={setSelectedProgram} />
          ) : (
            <div className={collectionLayoutClass(viewMode, "xl:grid-cols-2")}>
              {sortedResults.map((program) => (
                <ProgramResult key={program.id} program={program} viewMode={viewMode} onOpen={setSelectedProgram} />
              ))}
            </div>
          )}
        </section>
      ) : null}
      {config ? (
        <ProgramReserveDialog
          program={selectedProgram}
          channelName={selectedProgram
            ? channels.find((channel) => channel.id === selectedProgram.channelId)?.name ??
              `チャンネル ${selectedProgram.channelId}`
            : ""}
          config={config}
          reserveId={selectedReserveId}
          onClose={() => setSelectedProgram(null)}
          onReserved={reloadReserves}
        />
      ) : null}
    </>
  );
}
