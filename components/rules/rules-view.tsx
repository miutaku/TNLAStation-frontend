"use client";

import {
  CalendarCheck,
  Folder,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Radio,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import { CollapsibleSearchPanel } from "@/components/collapsible-search-panel";
import {
  CollectionViewToggle,
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
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import type { Rule, RuleId, Rules } from "@/lib/api/types";
import { genreName } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";

const PAGE_SIZE = 24;

const ruleTableColumns = [
  { key: "status", label: "状態" },
  { key: "rule", label: "ルール名・キーワード" },
  { key: "conditions", label: "放送波・ジャンル" },
  { key: "destination", label: "保存先" },
  { key: "reserves", label: "予約数" },
  { key: "actions", label: "操作" },
] as const;
type RuleTableColumn = (typeof ruleTableColumns)[number]["key"];

export function ruleTitle(rule: Rule): string {
  return rule.name?.trim() || "無題のルール";
}

function ruleBroadcasts(rule: Rule): string {
  const enabled = (["GR", "BS", "CS", "SKY"] as const).filter(
    (type) => rule.searchOption[type] === true,
  );
  if (enabled.length > 0) return enabled.join(" / ");
  if (rule.searchOption.channelIds?.length) {
    return `チャンネル指定 ${rule.searchOption.channelIds.length} 局`;
  }
  return "すべての放送波";
}

function ruleGenres(rule: Rule): string {
  return rule.searchOption.genres
    ?.map((genre) => genreName(genre.genre))
    .join(" / ") || "すべてのジャンル";
}

function ruleDestination(rule: Rule): string {
  return [
    rule.saveOption?.parentDirectoryName,
    rule.saveOption?.directory,
  ].filter(Boolean).join("/") || "既定の保存先";
}

function RuleStatus({ rule }: { rule: Rule }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={rule.reserveOption.enable ? "success" : "secondary"}>
        {rule.reserveOption.enable ? "有効" : "無効"}
      </Badge>
      {rule.isTimeSpecification ? <Badge variant="outline">時刻指定</Badge> : null}
      {rule.reserveOption.avoidDuplicate ? <Badge variant="outline">重複回避</Badge> : null}
    </div>
  );
}

function RuleActions({
  rule,
  busy,
  compact = false,
  onToggle,
  onDelete,
}: {
  rule: Rule;
  busy: boolean;
  compact?: boolean;
  onToggle: (rule: Rule) => void;
  onDelete: (rule: Rule) => void;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "justify-end" : ""}`}>
      <Button asChild size="sm" variant="outline">
        <Link href={`/rule/${rule.id}/edit`} aria-label={`${ruleTitle(rule)}を編集`}>
          <Pencil aria-hidden="true" />
          編集
        </Link>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={`${ruleTitle(rule)}を${rule.reserveOption.enable ? "無効" : "有効"}にする`}
        disabled={busy}
        onClick={() => onToggle(rule)}
      >
        {rule.reserveOption.enable ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
        {rule.reserveOption.enable ? "無効にする" : "有効にする"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        aria-label={`${ruleTitle(rule)}を削除`}
        disabled={busy}
        onClick={() => onDelete(rule)}
      >
        <Trash2 aria-hidden="true" />
        削除
      </Button>
    </div>
  );
}

function RuleCard({
  rule,
  busy,
  onToggle,
  onDelete,
}: {
  rule: Rule;
  busy: boolean;
  onToggle: (rule: Rule) => void;
  onDelete: (rule: Rule) => void;
}) {
  const keyword = rule.searchOption.keyword?.trim();

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-5 sm:pt-6">
        <article aria-labelledby={`rule-${rule.id}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <RuleStatus rule={rule} />
              <h2 id={`rule-${rule.id}`} className="mt-3 break-words text-lg font-semibold leading-7">
                {ruleTitle(rule)}
              </h2>
              {keyword ? (
                <p className="mt-1 break-words text-sm text-muted-foreground">キーワード: {keyword}</p>
              ) : null}
              {rule.searchOption.ignoreKeyword ? (
                <p className="mt-0.5 break-words text-sm text-muted-foreground">
                  除外: {rule.searchOption.ignoreKeyword}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold tabular-nums">{rule.reservesCnt ?? 0}</p>
              <p className="text-xs text-muted-foreground">予約</p>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
            <RuleDetail icon={<Radio aria-hidden="true" />} label="放送波">
              {ruleBroadcasts(rule)}
            </RuleDetail>
            <RuleDetail icon={<CalendarCheck aria-hidden="true" />} label="ジャンル">
              {ruleGenres(rule)}
            </RuleDetail>
            <RuleDetail icon={<Folder aria-hidden="true" />} label="保存先">
              {ruleDestination(rule)}
            </RuleDetail>
          </dl>

          <div className="mt-4 border-t pt-4">
            <RuleActions
              rule={rule}
              busy={busy}
              compact
              onToggle={onToggle}
              onDelete={onDelete}
            />
          </div>
        </article>
      </CardContent>
    </Card>
  );
}

function RuleDetail({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="size-4 shrink-0 text-primary [&>svg]:size-4">{icon}</span>
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  );
}

const ruleHeaderContent: Record<RuleTableColumn, { label: string; className: string }> = {
  status: { label: "状態", className: "px-4 py-3 font-semibold" },
  rule: { label: "ルール名・キーワード", className: "px-4 py-3 font-semibold" },
  conditions: { label: "放送波・ジャンル", className: "px-4 py-3 font-semibold" },
  destination: { label: "保存先", className: "px-4 py-3 font-semibold" },
  reserves: { label: "予約数", className: "px-4 py-3 text-right font-semibold" },
  actions: { label: "操作", className: "px-4 py-3 text-right font-semibold" },
};

const ruleCellClassName: Record<RuleTableColumn, string> = {
  status: "px-4 py-4",
  rule: "max-w-[260px] px-4 py-4",
  conditions: "max-w-[220px] px-4 py-4 text-xs",
  destination: "max-w-[190px] px-4 py-4 text-xs text-muted-foreground",
  reserves: "px-4 py-4 text-right font-semibold tabular-nums",
  actions: "px-4 py-4",
};

function RuleTable({
  rules,
  busyRuleId,
  onToggle,
  onDelete,
  columns,
}: {
  rules: Rule[];
  busyRuleId: RuleId | null;
  onToggle: (rule: Rule) => void;
  onDelete: (rule: Rule) => void;
  columns: TableColumnVisibilityState<RuleTableColumn>;
}) {
  const visibleColumns = columns.columns.filter((column) => columns.isVisible(column.key));

  const renderCell = (key: RuleTableColumn, rule: Rule) => {
    const keyword = rule.searchOption.keyword?.trim();
    switch (key) {
      case "status":
        return <RuleStatus rule={rule} />;
      case "rule":
        return (
          <>
            <p className="font-semibold [overflow-wrap:anywhere]">{ruleTitle(rule)}</p>
            <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {keyword ? `キーワード: ${keyword}` : "キーワード指定なし"}
            </p>
            {rule.searchOption.ignoreKeyword ? (
              <p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                除外: {rule.searchOption.ignoreKeyword}
              </p>
            ) : null}
          </>
        );
      case "conditions":
        return (
          <>
            <p className="font-medium">{ruleBroadcasts(rule)}</p>
            <p className="mt-1 text-muted-foreground [overflow-wrap:anywhere]">{ruleGenres(rule)}</p>
          </>
        );
      case "destination":
        return (
          <span className="block truncate" title={ruleDestination(rule)}>
            {ruleDestination(rule)}
          </span>
        );
      case "reserves":
        return rule.reservesCnt ?? 0;
      case "actions":
        return (
          <RuleActions
            rule={rule}
            busy={busyRuleId === rule.id}
            compact
            onToggle={onToggle}
            onDelete={onDelete}
          />
        );
    }
  };

  return (
    <div className="glass-panel overflow-x-auto overscroll-x-contain rounded-2xl">
      <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
        <caption className="sr-only">録画ルール一覧</caption>
        <thead>
          <tr className="border-b bg-muted/45 text-xs text-muted-foreground">
            {visibleColumns.map((column) => (
              <th key={column.key} scope="col" className={ruleHeaderContent[column.key].className}>
                {ruleHeaderContent[column.key].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rules.map((rule) => (
            <tr key={rule.id} className="align-top transition-colors hover:bg-muted/25">
              {visibleColumns.map((column) => (
                <td key={column.key} className={ruleCellClassName[column.key]}>
                  {renderCell(column.key, rule)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RulesView() {
  const [draftKeyword, setDraftKeyword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [busyRuleId, setBusyRuleId] = useState<RuleId | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);
  const [disableTarget, setDisableTarget] = useState<Rule | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useCollectionViewMode("rules");
  const tableColumns = useTableColumnVisibility("rules", ruleTableColumns);

  const loadRules = useCallback(
    (signal: AbortSignal): Promise<Rules> => apiClient.getRules(
      {
        offset: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        type: "normal",
        keyword: keyword || undefined,
      },
      signal,
    ),
    [keyword, page],
  );
  const resource = useApiResource(loadRules);

  const searchRules = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setKeyword(draftKeyword.trim());
    setPage(1);
  };

  const clearKeyword = () => {
    setDraftKeyword("");
    setKeyword("");
    setPage(1);
  };

  const toggleRule = async (rule: Rule, confirmed = false) => {
    if (rule.reserveOption.enable && !confirmed) {
      setDisableTarget(rule);
      return;
    }
    setBusyRuleId(rule.id);
    setActionError(null);
    setActionMessage(null);
    try {
      if (rule.reserveOption.enable) await apiClient.disableRule(rule.id);
      else await apiClient.enableRule(rule.id);
      setDisableTarget(null);
      setActionMessage(
        `「${ruleTitle(rule)}」を${rule.reserveOption.enable ? "無効" : "有効"}にしました。`,
      );
      resource.reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "ルールの状態を変更できませんでした。");
    } finally {
      setBusyRuleId(null);
    }
  };

  const deleteRule = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyRuleId(target.id);
    setActionError(null);
    try {
      await apiClient.deleteRule(target.id);
      setDeleteTarget(null);
      setActionMessage(`「${ruleTitle(target)}」を削除しました。`);
      resource.reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "ルールを削除できませんでした。");
    } finally {
      setBusyRuleId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="録画ルール"
        description="自動予約ルールの検索、有効状態、保存先を管理します。作成と編集はそれぞれの専用画面で行えます。"
        actions={(
          <>
            <Button asChild variant="ghost">
              <Link href="/search"><Search aria-hidden="true" />番組を検索</Link>
            </Button>
            <Button type="button" variant="ghost" onClick={resource.revalidate} disabled={resource.isRefreshing}>
              <RefreshCw aria-hidden="true" className={resource.isRefreshing ? "animate-spin" : undefined} />
              更新
            </Button>
            <Button asChild>
              <Link href="/rule/new"><Plus aria-hidden="true" />新しいルール</Link>
            </Button>
          </>
        )}
      />

      {actionMessage ? (
        <Alert role="status" className="mb-5 border-emerald-500/35">
          <AlertDescription>{actionMessage}</AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert role="alert" className="mb-5 border-destructive/40">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={searchRules} role="search" className="mb-5">
        <CollapsibleSearchPanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="rule-keyword" className="mb-2 block text-sm font-semibold">ルールを検索</label>
              <Input
                id="rule-keyword"
                type="search"
                value={draftKeyword}
                onChange={(event) => setDraftKeyword(event.target.value)}
                placeholder="ルール名やキーワードを入力"
                maxLength={255}
              />
            </div>
            <Button type="submit"><Search aria-hidden="true" />検索</Button>
            {keyword ? <Button type="button" variant="ghost" onClick={clearKeyword}>クリア</Button> : null}
            {resource.data ? (
              <p aria-live="polite" className="self-center text-sm text-muted-foreground">
                {resource.data.total} 件
              </p>
            ) : null}
          </div>
        </CollapsibleSearchPanel>
      </form>

      <div className="mb-4 flex justify-end gap-2">
        {viewMode === "list" ? <TableColumnVisibilityMenu state={tableColumns} label="録画ルール一覧の列" /> : null}
        <CollectionViewToggle
          value={viewMode}
          onChange={setViewMode}
          label="録画ルール一覧の表示形式"
        />
      </div>

      {resource.isLoading ? <ContentSkeleton cards={5} /> : null}
      {resource.error ? (
        <ErrorState
          title="録画ルールを取得できませんでした"
          description={resource.error.message}
          onRetry={resource.reload}
        />
      ) : null}
      {!resource.isLoading && resource.data?.rules.length === 0 ? (
        <EmptyState
          title={keyword ? "該当するルールはありません" : "録画ルールはありません"}
          description={keyword ? "検索語を変更してください。" : "作成画面から最初のルールを作成できます。"}
          action={keyword ? (
            <Button type="button" variant="outline" onClick={clearKeyword}>検索をクリア</Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/rule/new"><Plus aria-hidden="true" />ルールを作成</Link>
            </Button>
          )}
        />
      ) : null}
      {!resource.isLoading && resource.data && resource.data.rules.length > 0 ? (
        <>
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="録画ルール">
              {resource.data.rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  busy={busyRuleId === rule.id}
                  onToggle={toggleRule}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          ) : (
            <RuleTable
              rules={resource.data.rules}
              busyRuleId={busyRuleId}
              onToggle={toggleRule}
              onDelete={setDeleteTarget}
              columns={tableColumns}
            />
          )}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={resource.data.total}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="録画ルールを削除しますか？"
        description={`「${deleteTarget ? ruleTitle(deleteTarget) : ""}」を削除します。この操作は元に戻せません。既存の録画ファイルは削除されません。`}
        confirmLabel="ルールを削除"
        busy={deleteTarget !== null && busyRuleId === deleteTarget.id}
        onConfirm={() => void deleteRule()}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={disableTarget !== null}
        title="録画ルールを無効にしますか？"
        description={`「${disableTarget ? ruleTitle(disableTarget) : ""}」を無効にすると、このルールによる今後の自動予約に影響します。`}
        confirmLabel="ルールを無効化"
        busy={disableTarget !== null && busyRuleId === disableTarget.id}
        onConfirm={() => disableTarget && void toggleRule(disableTarget, true)}
        onCancel={() => setDisableTarget(null)}
      />
    </>
  );
}
