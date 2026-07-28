"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import { PageHeader } from "@/components/page-header";
import {
  buildRuleUpdateOptions,
  RuleForm,
  ruleSearchOptionToConditions,
} from "@/components/rules/rule-form";
import type { RuleCreateDraft } from "@/components/rules/rule-create-draft";
import {
  DEFAULT_SEARCH_CONDITIONS,
  hasAnySearchCondition,
  searchConditionsToOption,
  type SearchConditions,
} from "@/components/search/search-conditions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, apiClient } from "@/lib/api/client";
import type { ChannelItem, Rule, RuleId } from "@/lib/api/types";
import { useApiResource } from "@/lib/hooks/use-api-resource";

function BackToRulesButton() {
  return (
    <Button asChild variant="ghost">
      <Link href="/rule">
        <ArrowLeft aria-hidden="true" />
        録画ルール一覧へ
      </Link>
    </Button>
  );
}

export function RuleCreateView({ initialDraft }: { initialDraft?: RuleCreateDraft | null }) {
  const router = useRouter();
  const [name, setName] = useState(initialDraft?.name ?? "");
  const [avoidDuplicate, setAvoidDuplicate] = useState(false);
  const [conditions, setConditions] = useState<SearchConditions>(
    initialDraft
      ? ruleSearchOptionToConditions(initialDraft.searchOption)
      : DEFAULT_SEARCH_CONDITIONS,
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const loadChannels = useCallback(
    (signal: AbortSignal) => apiClient.getChannels(signal),
    [],
  );
  const channels = useApiResource(loadChannels);

  const reset = () => {
    setName(initialDraft?.name ?? "");
    setAvoidDuplicate(false);
    setConditions(
      initialDraft
        ? ruleSearchOptionToConditions(initialDraft.searchOption)
        : DEFAULT_SEARCH_CONDITIONS,
    );
    setActionError(null);
  };

  const createRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasAnySearchCondition(conditions)) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiClient.addRule({
        name: name.trim() || undefined,
        isTimeSpecification: false,
        searchOption: searchConditionsToOption(conditions),
        reserveOption: {
          enable: true,
          allowEndLack: true,
          avoidDuplicate,
        },
      });
      router.push("/rule");
      router.refresh();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "ルールを作成できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="録画ルールを作成"
        description="番組名やチャンネル、ジャンル、放送時間などの条件を指定して、自動録画のルールを作成します。"
        actions={<BackToRulesButton />}
      />

      {channels.isLoading ? <ContentSkeleton cards={2} /> : null}
      {channels.error ? (
        <ErrorState
          title="作成画面を読み込めませんでした"
          description={channels.error.message}
          onRetry={channels.reload}
        />
      ) : null}
      {actionError ? (
        <Alert role="alert" className="mb-5 border-destructive/40">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      {channels.data ? (
        <section className="glass-panel min-w-0 rounded-2xl p-4 sm:p-6" aria-label="録画ルール作成フォーム">
          <RuleForm
            mode="create"
            name={name}
            avoidDuplicate={avoidDuplicate}
            conditions={conditions}
            channels={channels.data}
            busy={busy}
            onNameChange={setName}
            onAvoidDuplicateChange={setAvoidDuplicate}
            onConditionsChange={setConditions}
            onReset={reset}
            onCancel={() => router.push("/rule")}
            onSubmit={createRule}
          />
        </section>
      ) : null}
    </>
  );
}

function LoadedRuleEditor({
  rule,
  channels,
}: {
  rule: Rule;
  channels: ChannelItem[];
}) {
  const router = useRouter();
  const initialConditions = ruleSearchOptionToConditions(rule.searchOption);
  const [conditions, setConditions] = useState(initialConditions);
  const [name, setName] = useState(rule.name ?? "");
  const [avoidDuplicate, setAvoidDuplicate] = useState(rule.reserveOption.avoidDuplicate);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const reset = () => {
    setConditions(initialConditions);
    setName(rule.name ?? "");
    setAvoidDuplicate(rule.reserveOption.avoidDuplicate);
    setActionError(null);
  };

  const updateRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasAnySearchCondition(conditions)) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiClient.updateRule(
        rule.id,
        buildRuleUpdateOptions(
          rule,
          initialConditions,
          conditions,
          name,
          avoidDuplicate,
        ),
      );
      router.push("/rule");
      router.refresh();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "ルールを更新できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="録画ルールを編集"
        description={`「${rule.name?.trim() || "無題のルール"}」の検索条件と録画設定を変更します。`}
        titleActions={
          <Badge variant={rule.reserveOption.enable ? "success" : "secondary"}>
            現在{rule.reserveOption.enable ? "有効" : "無効"}
          </Badge>
        }
        actions={<BackToRulesButton />}
      />

      {actionError ? (
        <Alert role="alert" className="mb-5 border-destructive/40">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="glass-panel min-w-0 rounded-2xl p-4 sm:p-6" aria-label="録画ルール編集フォーム">
        <p className="mb-5 text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
          有効状態は一覧で変更できます。タグ・保存先・エンコード設定と、フォームに表示しきれない複数時間帯やサブジャンルは、その項目を変更しない限り保持されます。
        </p>
        <RuleForm
          mode="edit"
          name={name}
          avoidDuplicate={avoidDuplicate}
          conditions={conditions}
          channels={channels}
          busy={busy}
          onNameChange={setName}
          onAvoidDuplicateChange={setAvoidDuplicate}
          onConditionsChange={setConditions}
          onReset={reset}
          onCancel={() => router.push("/rule")}
          onSubmit={updateRule}
        />
      </section>
    </>
  );
}

export function RuleEditView({ ruleId }: { ruleId: RuleId }) {
  const loadEditor = useCallback(
    async (signal: AbortSignal) => {
      const [rule, channels] = await Promise.all([
        apiClient.getRule(ruleId, signal),
        apiClient.getChannels(signal),
      ]);
      return { rule, channels };
    },
    [ruleId],
  );
  const resource = useApiResource(loadEditor);
  const isNotFound = resource.error instanceof ApiError && resource.error.status === 404;

  if (resource.isLoading) {
    return (
      <>
        <PageHeader
          title="録画ルールを編集"
          description="録画ルールを読み込んでいます。"
          actions={<BackToRulesButton />}
        />
        <ContentSkeleton cards={2} />
      </>
    );
  }

  if (isNotFound) {
    return (
      <>
        <PageHeader
          title="録画ルールを編集"
          description="指定された録画ルールを確認できませんでした。"
          actions={<BackToRulesButton />}
        />
        <EmptyState
          title="録画ルールが見つかりません"
          description={`録画ルール #${ruleId} は削除されたか、存在しません。`}
          action={<BackToRulesButton />}
        />
      </>
    );
  }

  if (resource.error) {
    return (
      <>
        <PageHeader
          title="録画ルールを編集"
          description="録画ルールを読み込めませんでした。"
          actions={<BackToRulesButton />}
        />
        <ErrorState
          title="録画ルールを取得できませんでした"
          description={resource.error.message}
          onRetry={resource.reload}
        />
      </>
    );
  }

  return resource.data ? (
    <LoadedRuleEditor
      key={resource.data.rule.id}
      rule={resource.data.rule}
      channels={resource.data.channels}
    />
  ) : null;
}
