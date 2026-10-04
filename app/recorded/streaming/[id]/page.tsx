import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/async-state";
import { RecordedStreamingRoute } from "@/components/watch-route-views";

export const metadata: Metadata = { title: "録画ストリーミング" };

export function generateStaticParams() {
  return [{ id: "501" }, { id: "502" }];
}

export default async function RecordedStreamingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const videoFileId = Number(id);
  if (!Number.isSafeInteger(videoFileId) || videoFileId <= 0) notFound();
  return (
    <Suspense fallback={<ContentSkeleton cards={1} />}>
      <RecordedStreamingRoute videoFileId={videoFileId} />
    </Suspense>
  );
}
