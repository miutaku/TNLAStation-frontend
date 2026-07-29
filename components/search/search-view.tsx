"use client";

import { CalendarSearch, ListPlus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import { CollapsibleSearchPanel } from "@/components/collapsible-search-panel";
import {
  collectionLayoutClass,
  CollectionViewToggle,
  type CollectionViewMode,
  useCollectionViewMode,
} from "@/components/collection-view";
import { PageHeader } from "@/components/page-header";
import { createRuleDraftUrl } from "@/components/rules/rule-create-draft";
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
import type { ChannelItem, ScheduleProgramItem, ScheduleSearchOptions } from "@/lib/api/types";
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

function ProgramResult({ program, viewMode }: { program: ScheduleProgramItem; viewMode: CollectionViewMode }) {
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
        </article>
      </CardContent>
    </Card>
  );
}

function ProgramResultsTable({
  programs,
  columns,
}: {
  programs: ScheduleProgramItem[];
  columns: TableColumnVisibilityState<SearchResultTableColumn>;
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SearchView() {
  const router = useRouter();
  // 番組表などから ?keyword= 付きで来たときは、その語を初期条件に入れておく。
  const [conditions, setConditions] = useState<SearchConditions>(() => {
    const keyword = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("keyword");
    return keyword ? { ...DEFAULT_SEARCH_CONDITIONS, keyword } : DEFAULT_SEARCH_CONDITIONS;
  });
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [request, setRequest] = useState<SearchRequest | null>(null);
  const requestId = useRef(0);
  const { preferences } = usePreferences();
  const [viewMode, setViewMode] = useCollectionViewMode("search-results");
  const tableColumns = useTableColumnVisibility("search-results", searchResultTableColumns);

  useEffect(() => {
    let cancelled = false;
    void apiClient.getChannels().then(
      (list) => {
        if (!cancelled) setChannels(list);
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
        <SearchConditionsForm conditions={conditions} onChange={setConditions} channels={channels} />
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
              <CollectionViewToggle value={viewMode} onChange={setViewMode} label="検索結果の表示形式" />
            </div>
          </div>
          {viewMode === "list" ? (
            <ProgramResultsTable programs={resource.data} columns={tableColumns} />
          ) : (
            <div className={collectionLayoutClass(viewMode, "xl:grid-cols-2")}>
              {resource.data.map((program) => <ProgramResult key={program.id} program={program} viewMode={viewMode} />)}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
