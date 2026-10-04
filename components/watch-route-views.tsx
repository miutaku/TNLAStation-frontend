"use client";

import { useSearchParams } from "next/navigation";

import { ErrorState } from "@/components/async-state";
import { OnAirWatchView } from "@/components/onair/onair-watch-view";
import { RecordedStreamingView } from "@/components/recorded/recorded-streaming-view";
import { RecordedWatchView } from "@/components/recorded/recorded-watch-view";

function validId(value: string | null): number | null {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function validMode(value: string | null): number | null {
  const parsed = Number(value ?? "0");
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function InvalidWatchParameters() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <ErrorState title="視聴 URL が正しくありません" description="番組一覧から視聴する番組を選び直してください。" />
    </div>
  );
}

export function OnAirWatchRoute() {
  const query = useSearchParams();
  const channelId = validId(query.get("channel"));
  const mode = validMode(query.get("mode"));
  if (channelId === null || mode === null) return <InvalidWatchParameters />;
  return <OnAirWatchView channelId={channelId} streamType={query.get("type") ?? "hls"} mode={mode} />;
}

export function RecordedWatchRoute() {
  const query = useSearchParams();
  const videoFileId = validId(query.get("videoId"));
  const recordedId = validId(query.get("recordedId"));
  if (videoFileId === null || recordedId === null) return <InvalidWatchParameters />;
  return <RecordedWatchView videoFileId={videoFileId} recordedId={recordedId} />;
}

export function RecordedStreamingRoute({ videoFileId }: { videoFileId: number }) {
  const query = useSearchParams();
  const recordedId = validId(query.get("recordedId"));
  const mode = validMode(query.get("mode"));
  const playPosition = Number(query.get("ss") ?? "0");
  if (recordedId === null || mode === null || !Number.isFinite(playPosition) || playPosition < 0) {
    return <InvalidWatchParameters />;
  }
  return (
    <RecordedStreamingView
      videoFileId={videoFileId}
      recordedId={recordedId}
      streamType={query.get("streamingType") ?? "hls"}
      mode={mode}
      playPosition={playPosition}
    />
  );
}
