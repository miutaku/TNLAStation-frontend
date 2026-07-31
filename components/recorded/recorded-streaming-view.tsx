"use client";

import { ArrowLeft, CircleStop } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { ContentSkeleton, ErrorState } from "@/components/async-state";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VideoSurface } from "@/components/video/video-surface";
import { apiClient } from "@/lib/api/client";
import type { RecordedItem } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { useManagedStream } from "@/lib/hooks/use-managed-stream";
import { usePreferences } from "@/lib/hooks/use-preferences";

export function RecordedStreamingView({ videoFileId, recordedId, streamType, mode, playPosition }: { videoFileId: number; recordedId: number; streamType: string; mode: number; playPosition: number }) {
  const router = useRouter();
  const { preferences } = usePreferences();
  const [confirmStop, setConfirmStop] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  const stream = useManagedStream({ kind: "recorded", videoFileId, streamType, mode, playPosition });
  const loadRecorded = useCallback((signal: AbortSignal): Promise<RecordedItem> => apiClient.getRecordedDetail(recordedId, preferences.isHalfWidthDisplayed, signal), [preferences.isHalfWidthDisplayed, recordedId]);
  const resource = useApiResource(loadRecorded);

  const stop = async () => {
    setStopping(true);
    setStopError(null);
    try {
      await stream.stop();
      router.replace(`/recorded/detail/${recordedId}`);
    } catch (reason) {
      setStopError(reason instanceof Error ? reason.message : "ストリームを停止できませんでした。");
      setStopping(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Recorded stream"
        title={resource.data?.name ?? "録画ストリーミング"}
        description={resource.data ? `${formatDateTime(resource.data.startAt)} ・ ${streamType.toUpperCase()} モード ${mode}` : `${streamType.toUpperCase()} ストリームを準備しています。`}
        actions={<><Button asChild variant="ghost"><Link href={`/recorded/detail/${recordedId}`}><ArrowLeft aria-hidden="true" />録画詳細へ戻る</Link></Button><Button type="button" variant="destructive" onClick={() => setConfirmStop(true)} disabled={stopping}><CircleStop aria-hidden="true" />視聴を終了</Button></>}
      />
      <div className="mx-auto max-w-6xl">
        {stopError ? <Alert role="alert" className="mb-4 border-destructive/40"><AlertDescription>{stopError}</AlertDescription></Alert> : null}
        {stream.streamId !== null ? <Badge variant="success" className="mb-3">Stream #{stream.streamId}</Badge> : null}
        <VideoSurface source={stream.source} label={resource.data ? `${resource.data.name} のストリーミング再生` : "録画ストリーミング"} isLoading={stream.isLoading} error={stream.error} onRetry={stream.retry} />
        {resource.isLoading ? <div className="mt-5"><ContentSkeleton cards={1} /></div> : null}
        {resource.error ? <div className="mt-5"><ErrorState title="番組情報を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /></div> : null}
      </div>
      <ConfirmDialog open={confirmStop} title="視聴を終了しますか？" description="ストリームを停止して録画詳細へ戻ります。" confirmLabel="ストリームを停止" busy={stopping} onConfirm={() => void stop()} onCancel={() => setConfirmStop(false)} />
    </>
  );
}
