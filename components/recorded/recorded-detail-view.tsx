"use client";

import { ArrowLeft, ChevronDown, CircleStop, Cpu, Download, Film, HardDrive, Image as ImageIcon, LockKeyhole, Play, RadioTower, ShieldOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type FormEvent } from "react";

import { ContentSkeleton, EmptyState, ErrorState } from "@/components/async-state";
import { PageHeader } from "@/components/page-header";
import { RecordedTagEditor } from "@/components/recorded/recorded-tags";
import { RecordedThumbnail } from "@/components/recorded/recorded-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/client";
import type { Config, RecordedItem, VideoFile } from "@/lib/api/types";
import { formatBytes, formatDateTime, formatDuration, genreName } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { thumbnailSkipLabel, toThumbnailTarget } from "@/lib/recorded-thumbnail";
import { useChannelNames } from "@/lib/hooks/use-channel-names";
import { usePreferences } from "@/lib/hooks/use-preferences";

type ConfirmAction = "delete" | "unprotect" | "stop-encode" | "encode-remove";
const controlClassName = "h-10 min-w-0 w-full max-w-full rounded-lg border border-input bg-background/75 px-3 text-sm shadow-xs";

/**
 * 動画ファイル 1 つ。押せる操作が 3 つ並ぶと、どれが本命か分からない。再生を 1 つだけ
 * 目立たせ、残りは控えめに置く。
 *
 * 元の TS は MPEG-2 で、ブラウザーはそのままでは再生できない。押しても何も起きない
 * ボタンを置くより、変換して再生するほうへ寄せる。
 */
function VideoFileCard({ file, recordedId }: { file: VideoFile; recordedId: number }) {
  const playsInBrowser = file.type !== "ts";
  const directHref = `/recorded/watch?videoId=${file.id}&recordedId=${recordedId}`;
  const convertedHref = `/recorded/streaming/${file.id}?recordedId=${recordedId}&streamingType=hls&mode=0`;

  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
        <article aria-labelledby={`video-${file.id}`}>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Film aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id={`video-${file.id}`} className="truncate font-semibold">{file.name}</h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">{file.filename}</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <HardDrive aria-hidden="true" className="size-4" />
                {formatBytes(file.size)} ・ {playsInBrowser ? "エンコード済み" : "元 TS"}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
            <Button asChild size="sm">
              <Link href={playsInBrowser ? directHref : convertedHref}><Play aria-hidden="true" />再生</Link>
            </Button>
            {playsInBrowser ? (
              <Button asChild size="sm" variant="ghost">
                <Link href={convertedHref}><RadioTower aria-hidden="true" />変換して再生</Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="ghost">
              <a href={apiClient.videoUrl(file.id, true)} download><Download aria-hidden="true" />ダウンロード</a>
            </Button>
          </div>
          {playsInBrowser ? null : (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              放送そのままの形式です。ブラウザーで見るときは変換しながら再生します。元のまま扱うにはダウンロードしてください。
            </p>
          )}
        </article>
      </CardContent>
    </Card>
  );
}

export function RecordedDetailView({ recordedId }: { recordedId: number }) {
  const channelName = useChannelNames();
  const router = useRouter();
  const { preferences } = usePreferences();
  const { notify } = useToast();
  const notifySuccess = useCallback((text: string) => notify("success", text), [notify]);
  const notifyError = useCallback((text: string) => notify("error", text), [notify]);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [deleteVideoFileIds, setDeleteVideoFileIds] = useState<Set<number>>(new Set());
  const [sourceVideoFileId, setSourceVideoFileId] = useState("");
  const [encodeMode, setEncodeMode] = useState("");
  const [removeOriginal, setRemoveOriginal] = useState(false);
  const [programDetailsOpen, setProgramDetailsOpen] = useState(false);
  const loadDetail = useCallback(async (signal: AbortSignal): Promise<{ recorded: RecordedItem; config: Config }> => {
    const [recorded, config] = await Promise.all([
      apiClient.getRecordedDetail(recordedId, preferences.isHalfWidthDisplayed, signal),
      apiClient.getConfig(signal),
    ]);
    return { recorded, config };
  }, [preferences.isHalfWidthDisplayed, recordedId]);
  const resource = useApiResource(loadDetail);
  const recorded = resource.data?.recorded ?? null;
  const files = useMemo(() => recorded?.videoFiles ?? [], [recorded?.videoFiles]);
  const thumbnailTarget = useMemo(() => (recorded ? toThumbnailTarget(recorded) : "unknown" as const), [recorded]);

  const openDeleteDialog = () => {
    setDeleteVideoFileIds(new Set(files.map((file) => file.id)));
    setConfirmAction("delete");
  };

  const toggleDeleteVideoFile = (videoFileId: number) => {
    setDeleteVideoFileIds((current) => {
      const next = new Set(current);
      if (next.has(videoFileId)) next.delete(videoFileId);
      else next.add(videoFileId);
      return next;
    });
  };

  const runAction = async (operation: () => Promise<void>, success: string, after?: () => void) => {
    setBusy(true);
    
    
    try {
      await operation();
      setConfirmAction(null);
      notifySuccess(success);
      after?.();
      if (!after) resource.revalidate();
    } catch (reason) {
      notifyError(reason instanceof Error ? reason.message : "操作を完了できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const submitEncode = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!sourceVideoFileId || !encodeMode) return;
    if (removeOriginal && confirmAction !== "encode-remove") {
      setConfirmAction("encode-remove");
      return;
    }
    await runAction(
      async () => {
        const encodeId = await apiClient.addEncode({
          recordedId,
          sourceVideoFileId: Number(sourceVideoFileId),
          isSaveSameDirectory: true,
          mode: encodeMode,
          removeOriginal,
        });
        notifySuccess(`エンコード #${encodeId} を追加しました。`);
      },
      "エンコードを追加しました。",
    );
    setConfirmAction(null);
  };

  const confirmDetails: Record<ConfirmAction, { title: string; description: string; label: string }> = {
    delete: { title: "録画ファイルを削除しますか？", description: `「${recorded?.name ?? "この録画"}」から削除するファイルを選択してください。すべて選択すると番組情報も削除されます。この操作は元に戻せません。`, label: "選択したファイルを削除" },
    unprotect: { title: "保護を解除しますか？", description: "保護を解除すると、この録画は自動削除の対象になる可能性があります。", label: "保護を解除" },
    "stop-encode": { title: "エンコードを停止しますか？", description: "実行中のエンコードを停止します。途中の出力は利用できない場合があります。", label: "エンコードを停止" },
    "encode-remove": { title: "元ファイルを削除する設定で開始しますか？", description: "エンコード成功後に選択した元ファイルが削除されます。出力を確認するまで元ファイルを残す場合はキャンセルしてください。", label: "削除設定で開始" },
  };

  const performConfirmedAction = () => {
    if (!recorded || !confirmAction) return;
    if (confirmAction === "delete") {
      const selectedFiles = files.filter((file) => deleteVideoFileIds.has(file.id));
      if (selectedFiles.length === 0) return;
      if (selectedFiles.length === files.length) {
        void runAction(() => apiClient.deleteRecorded(recordedId), "録画を削除しました。", () => router.replace("/recorded"));
      } else {
        void runAction(
          async () => {
            for (const file of selectedFiles) await apiClient.deleteVideo(file.id);
          },
          `${selectedFiles.length} 件の録画ファイルを削除しました。`,
        );
      }
    }
    if (confirmAction === "unprotect") void runAction(() => apiClient.unprotectRecorded(recordedId), "保護を解除しました。");
    if (confirmAction === "stop-encode") void runAction(() => apiClient.stopRecordedEncode(recordedId), "エンコードを停止しました。");
    if (confirmAction === "encode-remove") void submitEncode();
  };

  return (
    <>
      <PageHeader
        eyebrow="Recording detail"
        title={recorded?.name ?? "録画詳細"}
        description={recorded ? `${formatDateTime(recorded.startAt)} ・ ${formatDuration(recorded.startAt, recorded.endAt)} ・ ${genreName(recorded.genre1)}` : "録画情報と動画ファイルを読み込んでいます。"}
        subActions={recorded ? (
          <>
            {recorded.isProtected ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmAction("unprotect")}>
                <ShieldOff aria-hidden="true" />保護を解除
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={busy} onClick={() => void runAction(() => apiClient.protectRecorded(recordedId), "録画を保護しました。")}>
                <LockKeyhole aria-hidden="true" />保護
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy || typeof thumbnailTarget === "string"}
              title={typeof thumbnailTarget === "string" ? thumbnailSkipLabel(thumbnailTarget) : undefined}
              onClick={() => {
                if (typeof thumbnailTarget === "string") return;
                void runAction(() => apiClient.regenerateThumbnail(thumbnailTarget), "サムネイルを作り直しました。");
              }}
            >
              <ImageIcon aria-hidden="true" />サムネイル再生成
            </Button>
            <Button type="button" variant="destructive" disabled={busy || recorded.isRecording || files.length === 0} onClick={openDeleteDialog}>
              <Trash2 aria-hidden="true" />削除
            </Button>
          </>
        ) : undefined}
        actions={<Button asChild variant="ghost"><Link href="/recorded"><ArrowLeft aria-hidden="true" />録画済みへ戻る</Link></Button>}
      />

      {resource.isLoading ? <ContentSkeleton cards={4} /> : null}
      {resource.error ? <ErrorState title="録画詳細を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /> : null}
      {recorded && resource.data ? (
        <div className="space-y-6">
          <div className="grid aspect-[16/7] place-items-center overflow-hidden rounded-2xl border bg-secondary">
            <RecordedThumbnail item={recorded} />
          </div>

          <Card>
            <CardHeader className="border-b">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle id="program-details-title">番組詳細</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recorded.isRecording ? <Badge variant="destructive">録画中</Badge> : null}
                    {recorded.isEncoding ? <Badge variant="warning">エンコード中</Badge> : null}
                    {recorded.isProtected ? <Badge variant="success"><LockKeyhole aria-hidden="true" />保護中</Badge> : <Badge variant="secondary">未保護</Badge>}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-expanded={programDetailsOpen}
                  aria-controls="program-details-content"
                  onClick={() => setProgramDetailsOpen((open) => !open)}
                >
                  {programDetailsOpen ? "番組詳細を閉じる" : "番組詳細を表示"}
                  <ChevronDown aria-hidden="true" className={`transition-transform ${programDetailsOpen ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent id="program-details-content" hidden={!programDetailsOpen} aria-labelledby="program-details-title" className="pt-5 sm:pt-6">
              {recorded.description ? <p className="text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]">{recorded.description}</p> : null}
              {recorded.extended ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]">{recorded.extended}</p> : null}
              <dl className="mt-5 grid grid-cols-1 gap-3 border-t pt-4 text-sm sm:grid-cols-2">
                <div className="min-w-0"><dt className="text-xs text-muted-foreground">チャンネル</dt><dd className="mt-1 font-medium [overflow-wrap:anywhere]">{channelName(recorded.channelId)}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-muted-foreground">録画 ID</dt><dd className="mt-1 font-medium">#{recorded.id}</dd></div>
              </dl>
            </CardContent>
          </Card>

          <section aria-labelledby="video-files-title">
            <h2 id="video-files-title" className="mb-3 text-xl font-bold">録画ファイル</h2>
            {files.length === 0 ? <EmptyState title="録画ファイルがありません" description="録画情報はありますが、再生できるファイルは登録されていません。" /> : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {files.map((file: VideoFile) => (
                  <VideoFileCard key={file.id} file={file} recordedId={recorded.id} />
                ))}
              </div>
            )}
          </section>

          <Card>
            <CardHeader className="border-b">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <CardTitle>エンコードする</CardTitle>
                {recorded.isEncoding ? (
                  <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => setConfirmAction("stop-encode")}>
                    <CircleStop aria-hidden="true" />エンコード停止
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="pt-5 sm:pt-6">
              {files.length === 0 || resource.data.config.encode.length === 0 ? <p className="text-sm text-muted-foreground">利用できる動画ファイルまたはエンコード設定がありません。</p> : (
                <form onSubmit={(event) => void submitEncode(event)} className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                  <div className="min-w-0"><label htmlFor="encode-source" className="mb-2 block text-sm font-semibold">元ファイル</label><select id="encode-source" className={controlClassName} value={sourceVideoFileId} onChange={(event) => setSourceVideoFileId(event.target.value)} required><option value="">選択してください</option>{files.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}</select></div>
                  <div className="min-w-0"><label htmlFor="encode-mode" className="mb-2 block text-sm font-semibold">エンコード設定</label><select id="encode-mode" className={controlClassName} value={encodeMode} onChange={(event) => setEncodeMode(event.target.value)} required><option value="">選択してください</option>{resource.data.config.encode.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></div>
                  <Button type="submit" disabled={busy || !sourceVideoFileId || !encodeMode}><Cpu aria-hidden="true" />エンコードを開始</Button>
                  <div className="flex min-w-0 items-center justify-between gap-4 glass-field rounded-lg border p-3 lg:col-span-3"><div className="min-w-0"><p id="remove-original-label" className="text-sm font-semibold">成功後に元ファイルを削除</p><p className="mt-1 text-xs text-muted-foreground">有効にした場合は実行前に再確認します。</p></div><Switch checked={removeOriginal} aria-labelledby="remove-original-label" onClick={() => setRemoveOriginal((value) => !value)} /></div>
                </form>
              )}
            </CardContent>
          </Card>

          <RecordedTagEditor
            recordedId={recorded.id}
            attached={recorded.tags ?? []}
            onChanged={resource.revalidate}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction ? confirmDetails[confirmAction].title : "確認"}
        description={confirmAction ? confirmDetails[confirmAction].description : ""}
        confirmLabel={confirmAction ? confirmDetails[confirmAction].label : "実行"}
        busy={busy}
        confirmDisabled={confirmAction === "delete" && deleteVideoFileIds.size === 0}
        onConfirm={performConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      >
        {confirmAction === "delete" ? (
          <fieldset className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-lg border bg-muted/40 p-3">
            <legend className="sr-only">削除する録画ファイル</legend>
            {files.map((file) => (
              <label key={file.id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                  checked={deleteVideoFileIds.has(file.id)}
                  onChange={() => toggleDeleteVideoFile(file.id)}
                />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-medium">{file.name}</span>
                  <span className="block text-xs text-muted-foreground">{file.type === "ts" ? "元 TS" : "エンコード済み"} ・ {formatBytes(file.size)}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
