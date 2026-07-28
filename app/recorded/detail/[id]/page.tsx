import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RecordedDetailView } from "@/components/recorded/recorded-detail-view";

export const metadata: Metadata = { title: "録画詳細" };

export default async function RecordedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recordedId = Number(id);
  if (!Number.isSafeInteger(recordedId) || recordedId <= 0) notFound();
  return <RecordedDetailView recordedId={recordedId} />;
}
