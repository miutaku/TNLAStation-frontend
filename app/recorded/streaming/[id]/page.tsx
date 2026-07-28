import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RecordedStreamingView } from "@/components/recorded/recorded-streaming-view";

export const metadata: Metadata = { title: "録画ストリーミング" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RecordedStreamingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const videoFileId = Number(id);
  const recordedId = Number(first(query.recordedId));
  const mode = Number(first(query.mode) ?? "0");
  const playPosition = Math.max(0, Number(first(query.ss) ?? "0"));
  const streamType = first(query.streamingType) ?? "hls";
  if (!Number.isSafeInteger(videoFileId) || videoFileId <= 0 || !Number.isSafeInteger(recordedId) || recordedId <= 0 || !Number.isSafeInteger(mode) || mode < 0 || !Number.isFinite(playPosition)) notFound();
  return <RecordedStreamingView videoFileId={videoFileId} recordedId={recordedId} streamType={streamType} mode={mode} playPosition={playPosition} />;
}
