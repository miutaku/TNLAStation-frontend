"use client";

import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiClient } from "@/lib/api/client";
import type { Config, ReserveId, ReserveItem } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";

const controlClassName = "h-10 min-w-0 w-full max-w-full rounded-lg border border-input bg-background/75 px-3 text-sm shadow-xs";

function BackToReservesButton() {
  return (
    <Button asChild variant="ghost">
      <Link href="/reserves"><ArrowLeft aria-hidden="true" />予約一覧へ戻る</Link>
    </Button>
  );
}

function LoadedReserveEditor({ reserve, config }: { reserve: ReserveItem; config: Config }) {
  const router = useRouter();
  const [allowEndLack, setAllowEndLack] = useState(reserve.allowEndLack);
  const [parentDirectoryName, setParentDirectoryName] = useState(reserve.parentDirectoryName ?? "");
  const [directory, setDirectory] = useState(reserve.directory ?? "");
  const [encodeMode, setEncodeMode] = useState(reserve.encodeMode1 ?? "");
  const [removeOriginal, setRemoveOriginal] = useState(reserve.isDeleteOriginalAfterEncode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient.updateReserve(reserve.id, {
        allowEndLack,
        ...(parentDirectoryName ? {
          saveOption: {
            parentDirectoryName,
            directory: directory.trim() || undefined,
            recordedFormat: reserve.recordedFormat,
          },
        } : {}),
        ...(encodeMode ? {
          encodeOption: {
            mode1: encodeMode,
            encodeParentDirectoryName1: (reserve.encodeParentDirectoryName1 ?? parentDirectoryName) || undefined,
            directory1: (reserve.encodeDirectory1 ?? directory.trim()) || undefined,
            mode2: reserve.encodeMode2,
            encodeParentDirectoryName2: reserve.encodeParentDirectoryName2,
            directory2: reserve.encodeDirectory2,
            mode3: reserve.encodeMode3,
            encodeParentDirectoryName3: reserve.encodeParentDirectoryName3,
            directory3: reserve.encodeDirectory3,
            isDeleteOriginalAfterEncode: removeOriginal,
          },
        } : {}),
        tags: reserve.tags,
      });
      router.push("/reserves");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "予約を更新できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="予約を編集"
        description={`「${reserve.name}」の録画設定を変更します。放送日時と番組は変更できません。`}
        actions={<BackToReservesButton />}
      />
      {error ? <Alert role="alert" className="mb-5 border-destructive/40"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
        <Card>
          <CardHeader className="border-b"><CardTitle>{reserve.name}</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-5 text-sm sm:pt-6">
            <p>{formatDateTime(reserve.startAt)} – {formatDateTime(reserve.endAt)}</p>
            <p className="text-muted-foreground">予約 #{reserve.id}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b"><CardTitle>録画設定</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 pt-5 sm:grid-cols-2 sm:pt-6">
            <div className="flex items-start justify-between gap-5 rounded-lg border bg-muted p-3 sm:col-span-2">
              <div><p id="edit-end-lack-label" className="text-sm font-semibold">末尾切れを許可</p><p className="mt-1 text-xs text-muted-foreground">チューナー競合時に録画終了が短くなることを許可します。</p></div>
              <Switch checked={allowEndLack} aria-labelledby="edit-end-lack-label" onClick={() => setAllowEndLack((value) => !value)} />
            </div>
            <div><label htmlFor="edit-parent" className="mb-2 block text-sm font-semibold">保存先</label><select id="edit-parent" className={controlClassName} value={parentDirectoryName} onChange={(event) => setParentDirectoryName(event.target.value)}><option value="">既定の保存先</option>{config.recorded.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
            <div><label htmlFor="edit-directory" className="mb-2 block text-sm font-semibold">サブディレクトリ</label><Input id="edit-directory" value={directory} onChange={(event) => setDirectory(event.target.value)} /></div>
            <div><label htmlFor="edit-encode" className="mb-2 block text-sm font-semibold">エンコード設定</label><select id="edit-encode" className={controlClassName} value={encodeMode} onChange={(event) => setEncodeMode(event.target.value)}><option value="">エンコードしない</option>{config.encode.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></div>
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted p-3"><span id="edit-remove-label" className="text-sm font-semibold">完了後に元ファイルを削除</span><Switch checked={removeOriginal} disabled={!encodeMode} aria-labelledby="edit-remove-label" onClick={() => setRemoveOriginal((value) => !value)} /></div>
          </CardContent>
        </Card>
        <div className="flex justify-end"><Button type="submit" size="lg" disabled={busy}><Save aria-hidden="true" />{busy ? "保存中…" : "変更を保存"}</Button></div>
      </form>
    </>
  );
}

export function ReserveEditView({ reserveId }: { reserveId: ReserveId }) {
  const loadEditor = useCallback(async (signal: AbortSignal) => {
    const [reserve, config] = await Promise.all([
      apiClient.getReserve(reserveId, false, signal),
      apiClient.getConfig(signal),
    ]);
    return { reserve, config };
  }, [reserveId]);
  const resource = useApiResource(loadEditor);
  const isNotFound = resource.error instanceof ApiError && resource.error.status === 404;

  if (resource.isLoading) return <><PageHeader title="予約を編集" description="予約を読み込んでいます。" actions={<BackToReservesButton />} /><ContentSkeleton cards={2} /></>;
  if (isNotFound) return <><PageHeader title="予約を編集" description="指定された予約を確認できませんでした。" actions={<BackToReservesButton />} /><EmptyState title="予約が見つかりません" description={`予約 #${reserveId} は削除されたか、存在しません。`} action={<BackToReservesButton />} /></>;
  if (resource.error) return <><PageHeader title="予約を編集" description="予約を読み込めませんでした。" actions={<BackToReservesButton />} /><ErrorState title="予約を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /></>;
  return resource.data ? <LoadedReserveEditor key={resource.data.reserve.id} reserve={resource.data.reserve} config={resource.data.config} /> : null;
}
