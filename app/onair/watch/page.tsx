import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OnAirWatchView } from "@/components/onair/onair-watch-view";

export const metadata: Metadata = { title: "ライブ視聴" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OnAirWatchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const channelId = Number(first(query.channel));
  const mode = Number(first(query.mode) ?? "0");
  const streamType = first(query.type) ?? "hls";
  if (!Number.isSafeInteger(channelId) || channelId <= 0 || !Number.isSafeInteger(mode) || mode < 0) notFound();
  return <OnAirWatchView channelId={channelId} streamType={streamType} mode={mode} />;
}
