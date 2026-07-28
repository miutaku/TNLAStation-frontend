"use client";

import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

import { ContentSkeleton, ErrorState } from "@/components/async-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoSurface } from "@/components/video/video-surface";
import { apiClient } from "@/lib/api/client";
import type { RecordedItem } from "@/lib/api/types";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { usePreferences } from "@/lib/hooks/use-preferences";

export function RecordedWatchView({ videoFileId, recordedId }: { videoFileId: number; recordedId: number }) {
  const { preferences } = usePreferences();
  const loadRecorded = useCallback((signal: AbortSignal): Promise<RecordedItem> => apiClient.getRecordedDetail(recordedId, preferences.isHalfWidthDisplayed, signal), [preferences.isHalfWidthDisplayed, recordedId]);
  const resource = useApiResource(loadRecorded);
  const source = apiClient.videoUrl(videoFileId);

  return (
    <>
      <PageHeader
        eyebrow="Direct playback"
        title={resource.data?.name ?? "録画を再生"}
        description={resource.data ? `${formatDateTime(resource.data.startAt)} ・ ${formatDuration(resource.data.startAt, resource.data.endAt)}` : "動画ファイルを直接再生します。"}
        actions={<><Button asChild variant="ghost"><Link href={`/recorded/detail/${recordedId}`}><ArrowLeft aria-hidden="true" />録画詳細へ戻る</Link></Button><Button asChild variant="outline"><a href={apiClient.videoUrl(videoFileId, true)} download><Download aria-hidden="true" />ダウンロード</a></Button></>}
      />
      <div className="mx-auto max-w-6xl">
        <VideoSurface source={source} label={resource.data ? `${resource.data.name} を再生` : "録画を再生"} />
        {resource.isLoading ? <div className="mt-5"><ContentSkeleton cards={1} /></div> : null}
        {resource.error ? <div className="mt-5"><ErrorState title="番組情報を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /></div> : null}
        {resource.data ? <Card className="mt-5"><CardContent className="pt-5 sm:pt-6"><h2 className="font-semibold">番組情報</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{resource.data.description || "概要はありません。"}</p></CardContent></Card> : null}
      </div>
    </>
  );
}
