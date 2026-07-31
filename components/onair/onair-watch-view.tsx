"use client";

import { ArrowLeft, CircleStop, Radio } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { ContentSkeleton, ErrorState } from "@/components/async-state";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VideoSurface } from "@/components/video/video-surface";
import { apiClient } from "@/lib/api/client";
import type { ChannelItem, ScheduleProgramItem } from "@/lib/api/types";
import { formatTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { useManagedStream } from "@/lib/hooks/use-managed-stream";
import { usePreferences } from "@/lib/hooks/use-preferences";

export function OnAirWatchView({ channelId, streamType, mode }: { channelId: number; streamType: string; mode: number }) {
  const router = useRouter();
  const { preferences } = usePreferences();
  const [confirmStop, setConfirmStop] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  const stream = useManagedStream({ kind: "live", channelId, streamType, mode });
  // 番組は配信一覧ではなく番組表から引く。配信はこの画面を開いた後に作られるので、
  // 一覧から探すと最初の読み込みでは必ず空になる。
  const loadInfo = useCallback(async (signal: AbortSignal): Promise<{ channel?: ChannelItem; program?: ScheduleProgramItem }> => {
    const [channels, schedules] = await Promise.all([
      apiClient.getChannels(signal),
      apiClient.getBroadcastingSchedules(preferences.isHalfWidthDisplayed, signal),
    ]);
    return {
      channel: channels.find((channel) => channel.id === channelId),
      program: schedules.find((schedule) => schedule.channel.id === channelId)?.programs[0],
    };
  }, [channelId, preferences.isHalfWidthDisplayed]);
  const resource = useApiResource(loadInfo);
  const title = resource.data?.program?.name ?? resource.data?.channel?.name ?? "ライブ視聴";

  const stop = async () => {
    setStopping(true);
    setStopError(null);
    try {
      await stream.stop();
      router.replace("/onair");
    } catch (reason) {
      setStopError(reason instanceof Error ? reason.message : "ストリームを停止できませんでした。");
      setStopping(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Live playback"
        title={title}
        description={`${resource.data?.channel?.name ?? "放送局を確認中"} ・ ${streamType.toUpperCase()} モード ${mode}`}
        actions={<><Button asChild variant="ghost"><Link href="/onair"><ArrowLeft aria-hidden="true" />放送中へ戻る</Link></Button><Button type="button" variant="destructive" onClick={() => setConfirmStop(true)} disabled={stopping}><CircleStop aria-hidden="true" />視聴を終了</Button></>}
      />
      <div className="mx-auto max-w-6xl">
        {stopError ? <Alert role="alert" className="mb-4 border-destructive/40"><AlertDescription>{stopError}</AlertDescription></Alert> : null}
        <div className="mb-3 flex flex-wrap gap-2">{stream.streamId !== null ? <Badge variant="success">Stream #{stream.streamId}</Badge> : null}{resource.data?.channel ? <Badge variant="outline"><Radio aria-hidden="true" />{resource.data.channel.channelType} ・ {resource.data.channel.remoteControlKeyId ? `${resource.data.channel.remoteControlKeyId}ch` : resource.data.channel.channel}</Badge> : null}</div>
        <VideoSurface source={stream.source} label={`${title} のライブ再生`} isLoading={stream.isLoading} error={stream.error} onRetry={stream.retry} />
        {resource.isLoading ? <div className="mt-5"><ContentSkeleton cards={1} /></div> : null}
        {resource.error ? <div className="mt-5"><ErrorState title="放送情報を取得できませんでした" description={resource.error.message} onRetry={resource.reload} /></div> : null}
        {resource.data?.program ? <Card className="mt-5"><CardContent className="pt-5 sm:pt-6"><p className="text-xs font-medium text-primary">{formatTime(resource.data.program.startAt)} – {formatTime(resource.data.program.endAt)}</p><h2 className="mt-2 font-semibold">{resource.data.program.name}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{resource.data.program.description || "番組概要はありません。"}</p></CardContent></Card> : null}
      </div>
      <ConfirmDialog open={confirmStop} title="ライブ視聴を終了しますか？" description="ライブストリームを停止してチャンネル一覧へ戻ります。" confirmLabel="ストリームを停止" busy={stopping} onConfirm={() => void stop()} onCancel={() => setConfirmStop(false)} />
    </>
  );
}
