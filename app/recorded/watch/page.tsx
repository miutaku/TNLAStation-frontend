import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RecordedWatchView } from "@/components/recorded/recorded-watch-view";

export const metadata: Metadata = { title: "録画を再生" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RecordedWatchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const videoFileId = Number(first(query.videoId));
  const recordedId = Number(first(query.recordedId));
  if (!Number.isSafeInteger(videoFileId) || videoFileId <= 0 || !Number.isSafeInteger(recordedId) || recordedId <= 0) notFound();
  return <RecordedWatchView videoFileId={videoFileId} recordedId={recordedId} />;
}
