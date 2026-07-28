"use client";

import { ArrowLeft, CheckCircle2, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";

import { ErrorState } from "@/components/async-state";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import type { ChannelItem, Config, VideoFileType } from "@/lib/api/types";
import { useApiResource } from "@/lib/hooks/use-api-resource";

const controlClassName = "h-10 min-w-0 w-full max-w-full rounded-lg border border-input bg-background/75 px-3 text-sm shadow-xs";

function localDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function RecordedUploadView() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channelId, setChannelId] = useState("");
  const [startAt, setStartAt] = useState(() => localDateTime(Date.now() - 60 * 60_000));
  const [endAt, setEndAt] = useState(() => localDateTime(Date.now()));
  const [parentDirectoryName, setParentDirectoryName] = useState("");
  const [subDirectory, setSubDirectory] = useState("");
  const [viewName, setViewName] = useState("");
  const [fileType, setFileType] = useState<VideoFileType>("ts");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadOptions = useCallback(async (signal: AbortSignal): Promise<{ channels: ChannelItem[]; config: Config }> => {
    const [channels, config] = await Promise.all([apiClient.getChannels(signal), apiClient.getConfig(signal)]);
    return { channels, config };
  }, []);
  const resource = useApiResource(loadOptions);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("アップロードするファイルを選択してください。");
      return;
    }
    const startTimestamp = new Date(startAt).getTime();
    const endTimestamp = new Date(endAt).getTime();
    if (endTimestamp <= startTimestamp) {
      setError("終了日時は開始日時より後にしてください。");
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    let recordedId: number | null = null;
    try {
      recordedId = await apiClient.createRecorded({
        channelId: Number(channelId),
        startAt: startTimestamp,
        endAt: endTimestamp,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      await apiClient.uploadVideo({
        recordedId,
        parentDirectoryName,
        subDirectory: subDirectory.trim() || undefined,
        viewName: viewName.trim() || file.name,
        fileType,
        file,
      });
      setMessage(`録画 #${recordedId} とファイルを登録しました。`);
      setName("");
      setDescription("");
      setViewName("");
      setFile(null);
    } catch (reason) {
      if (recordedId !== null) {
        try {
          await apiClient.deleteRecorded(recordedId);
        } catch {
          // The original error is more useful; an orphan can be removed from the detail screen.
        }
      }
      setError(reason instanceof Error ? reason.message : "録画ファイルを登録できませんでした。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Import recording"
        title="録画ファイルを登録"
        description="番組情報を作成し、既存の TS またはエンコード済み動画を保存先へアップロードします。"
        actions={<Button asChild variant="ghost"><Link href="/recorded"><ArrowLeft aria-hidden="true" />録画済みへ戻る</Link></Button>}
      />

      {resource.isLoading ? <div className="mx-auto max-w-3xl space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div> : null}
      {resource.error ? <ErrorState title="登録に必要な情報を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /> : null}
      {resource.data ? (
        <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
          {message ? <Alert role="status" className="border-emerald-500/35"><AlertDescription className="flex items-center gap-2"><CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" />{message}</AlertDescription></Alert> : null}
          {error ? <Alert role="alert" className="border-destructive/40"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <Card className="">
            <CardHeader className="border-b"><CardTitle>番組情報</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 pt-5 sm:pt-6">
              <div><label htmlFor="upload-name" className="mb-2 block text-sm font-semibold">番組名</label><Input id="upload-name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
              <div><label htmlFor="upload-description" className="mb-2 block text-sm font-semibold">概要（任意）</label><textarea id="upload-description" className="min-h-24 w-full rounded-lg border border-input bg-background/75 px-3 py-2 text-sm shadow-xs" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
              <div><label htmlFor="upload-channel" className="mb-2 block text-sm font-semibold">チャンネル</label><select id="upload-channel" className={controlClassName} value={channelId} onChange={(event) => setChannelId(event.target.value)} required><option value="">選択してください</option>{resource.data.channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name} ({channel.channelType})</option>)}</select></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="min-w-0"><label htmlFor="upload-start" className="mb-2 block text-sm font-semibold">開始日時</label><Input id="upload-start" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required /></div><div className="min-w-0"><label htmlFor="upload-end" className="mb-2 block text-sm font-semibold">終了日時</label><Input id="upload-end" type="datetime-local" value={endAt} min={startAt} onChange={(event) => setEndAt(event.target.value)} required /></div></div>
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader className="border-b"><CardTitle>動画ファイル</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 pt-5 sm:grid-cols-2 sm:pt-6">
              <div className="sm:col-span-2"><label htmlFor="upload-file" className="mb-2 block text-sm font-semibold">ファイル</label><Input id="upload-file" type="file" required onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); if (selected && !viewName) setViewName(selected.name); }} /></div>
              <div><label htmlFor="upload-parent" className="mb-2 block text-sm font-semibold">保存先</label><select id="upload-parent" className={controlClassName} value={parentDirectoryName} onChange={(event) => setParentDirectoryName(event.target.value)} required><option value="">選択してください</option>{resource.data.config.recorded.map((directory) => <option key={directory} value={directory}>{directory}</option>)}</select></div>
              <div><label htmlFor="upload-subdir" className="mb-2 block text-sm font-semibold">サブディレクトリ（任意）</label><Input id="upload-subdir" value={subDirectory} onChange={(event) => setSubDirectory(event.target.value)} /></div>
              <div><label htmlFor="upload-view-name" className="mb-2 block text-sm font-semibold">表示名</label><Input id="upload-view-name" value={viewName} onChange={(event) => setViewName(event.target.value)} required /></div>
              <div><label htmlFor="upload-file-type" className="mb-2 block text-sm font-semibold">ファイル種別</label><select id="upload-file-type" className={controlClassName} value={fileType} onChange={(event) => setFileType(event.target.value as VideoFileType)}><option value="ts">TS（元ファイル）</option><option value="encoded">エンコード済み</option></select></div>
            </CardContent>
          </Card>
          <div className="flex justify-end"><Button type="submit" size="lg" disabled={submitting || !file}><Upload aria-hidden="true" />{submitting ? "アップロード中…" : "登録してアップロード"}</Button></div>
        </form>
      ) : null}
    </>
  );
}
