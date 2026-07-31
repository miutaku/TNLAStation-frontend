"use client";

import { ArrowLeft, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";

import { ErrorState } from "@/components/async-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ValidationSummary } from "@/components/ui/validation-summary";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/client";
import type { ChannelItem, Config } from "@/lib/api/types";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { validateDateRange, validateRelativePath, validateRequiredText } from "@/lib/form-validation";

const controlClassName = "h-10 min-w-0 w-full max-w-full rounded-lg border border-input bg-background/75 px-3 text-sm shadow-xs";

function localDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const local = new Date(timestamp - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function initialStart(): string {
  return localDateTime(Math.ceil(Date.now() / 30 / 60_000) * 30 * 60_000);
}

export function ManualReserveView() {
  const { notify } = useToast();
  const notifySuccess = useCallback((text: string) => notify("success", text), [notify]);
  const notifyError = useCallback((text: string) => notify("error", text), [notify]);
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [startAt, setStartAt] = useState(initialStart);
  const [endAt, setEndAt] = useState(() => localDateTime(new Date(initialStart()).getTime() + 60 * 60_000));
  const [allowEndLack, setAllowEndLack] = useState(true);
  const [parentDirectoryName, setParentDirectoryName] = useState("");
  const [directory, setDirectory] = useState("");
  const [encodeMode, setEncodeMode] = useState("");
  const [removeOriginal, setRemoveOriginal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemoveOriginal, setConfirmRemoveOriginal] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const loadOptions = useCallback(async (signal: AbortSignal): Promise<{ channels: ChannelItem[]; config: Config }> => {
    const [channels, config] = await Promise.all([apiClient.getChannels(signal), apiClient.getConfig(signal)]);
    return { channels, config };
  }, []);
  const resource = useApiResource(loadOptions);
  const validationErrors = [
    ...validateRequiredText(name, "番組名", 255),
    ...(channelId ? [] : ["チャンネルを選択してください。"]),
    ...validateDateRange(startAt, endAt),
    ...validateRelativePath(directory, "サブディレクトリ"),
  ];

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setValidationAttempted(true);
    if (validationErrors.length > 0) {
      notifyError(validationErrors[0]);
      return;
    }
    const startTimestamp = new Date(startAt).getTime();
    const endTimestamp = new Date(endAt).getTime();
    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) || endTimestamp <= startTimestamp) {
      notifyError("終了日時は開始日時より後にしてください。");
      return;
    }
    if (encodeMode && removeOriginal && !confirmRemoveOriginal) {
      setConfirmRemoveOriginal(true);
      return;
    }
    setConfirmRemoveOriginal(false);
    setSubmitting(true);
    
    
    try {
      const reserveId = await apiClient.addManualReserve({
        allowEndLack,
        timeSpecifiedOption: { name: name.trim(), channelId: Number(channelId), startAt: startTimestamp, endAt: endTimestamp },
        ...(parentDirectoryName ? { saveOption: { parentDirectoryName, directory: directory.trim() || undefined } } : {}),
        ...(encodeMode ? {
          encodeOption: {
            mode1: encodeMode,
            encodeParentDirectoryName1: parentDirectoryName || undefined,
            directory1: directory.trim() || undefined,
            isDeleteOriginalAfterEncode: removeOriginal,
          },
        } : {}),
      });
      notifySuccess(`予約 #${reserveId} を追加しました。`);
      setName("");
    } catch (reason) {
      notifyError(reason instanceof Error ? reason.message : "予約を追加できませんでした。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Manual reservation"
        title="時刻指定予約"
        description="番組 ID を使わず、チャンネルと開始・終了日時を指定して録画を予約します。"
        actions={<Button asChild variant="ghost"><Link href="/reserves"><ArrowLeft aria-hidden="true" />予約一覧へ戻る</Link></Button>}
      />

      {resource.isLoading ? <div className="mx-auto max-w-3xl space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-96 w-full" /></div> : null}
      {resource.error ? <ErrorState title="予約の選択肢を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /> : null}
      {!resource.isLoading && resource.data?.channels.length === 0 ? <ErrorState title="予約できるチャンネルがありません" description="チャンネル設定を確認してください。" onRetry={resource.reload} /> : null}
      {resource.data && resource.data.channels.length > 0 ? (
        <form onSubmit={submit} noValidate className="mx-auto max-w-3xl space-y-5">
          <ValidationSummary errors={validationAttempted ? validationErrors : []} />
          <Card className="">
            <CardHeader className="border-b"><CardTitle>録画する時間</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 pt-5 sm:pt-6">
              <div><label htmlFor="manual-name" className="mb-2 block text-sm font-semibold">番組名</label><Input id="manual-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} /></div>
              <div><label htmlFor="manual-channel" className="mb-2 block text-sm font-semibold">チャンネル</label><select id="manual-channel" className={controlClassName} value={channelId} onChange={(event) => setChannelId(event.target.value)} required><option value="">選択してください</option>{resource.data.channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name} ({channel.channelType})</option>)}</select></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label htmlFor="manual-start" className="mb-2 block text-sm font-semibold">開始日時</label><Input id="manual-start" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required /></div>
                <div><label htmlFor="manual-end" className="mb-2 block text-sm font-semibold">終了日時</label><Input id="manual-end" type="datetime-local" value={endAt} min={startAt} onChange={(event) => setEndAt(event.target.value)} required /></div>
              </div>
              <div className="flex items-start justify-between gap-5 glass-field rounded-lg border p-3"><div><p id="end-lack-label" className="text-sm font-semibold">末尾切れを許可</p><p className="mt-1 text-xs text-muted-foreground">チューナー競合時に録画終了が短くなることを許可します。</p></div><Switch checked={allowEndLack} aria-labelledby="end-lack-label" onClick={() => setAllowEndLack((value) => !value)} /></div>
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader className="border-b"><CardTitle>保存とエンコード（任意）</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 pt-5 sm:grid-cols-2 sm:pt-6">
              <div><label htmlFor="manual-parent" className="mb-2 block text-sm font-semibold">保存先</label><select id="manual-parent" className={controlClassName} value={parentDirectoryName} onChange={(event) => setParentDirectoryName(event.target.value)}><option value="">既定の保存先</option>{resource.data.config.recorded.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
              <div><label htmlFor="manual-directory" className="mb-2 block text-sm font-semibold">サブディレクトリ</label><Input id="manual-directory" value={directory} onChange={(event) => setDirectory(event.target.value)} placeholder="例: drama/2026" maxLength={255} /></div>
              <div><label htmlFor="manual-encode" className="mb-2 block text-sm font-semibold">エンコード設定</label><select id="manual-encode" className={controlClassName} value={encodeMode} onChange={(event) => setEncodeMode(event.target.value)}><option value="">エンコードしない</option>{resource.data.config.encode.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></div>
              <div className="flex items-center justify-between gap-4 glass-field rounded-lg border p-3"><span id="manual-remove-label" className="text-sm font-semibold">完了後に元ファイルを削除</span><Switch checked={removeOriginal} disabled={!encodeMode} aria-labelledby="manual-remove-label" onClick={() => setRemoveOriginal((value) => !value)} /></div>
            </CardContent>
          </Card>
          <div className="flex justify-end"><Button type="submit" size="lg" disabled={submitting}><CalendarPlus aria-hidden="true" />{submitting ? "予約中…" : "予約を追加"}</Button></div>
        </form>
      ) : null}
      <ConfirmDialog
        open={confirmRemoveOriginal}
        title="元ファイルを削除する予約を追加しますか？"
        description="この予約ではエンコード成功後に元の録画ファイルが削除されます。元ファイルを残す場合はキャンセルして設定を解除してください。"
        confirmLabel="削除設定で予約"
        busy={submitting}
        onConfirm={() => void submit()}
        onCancel={() => setConfirmRemoveOriginal(false)}
      />
    </>
  );
}
