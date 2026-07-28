import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReserveEditView } from "@/components/reserves/reserve-editor-view";

export const metadata: Metadata = { title: "予約を編集" };

export default async function EditReservePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reserveId = Number(id);
  if (!Number.isSafeInteger(reserveId) || reserveId <= 0) notFound();
  return <ReserveEditView reserveId={reserveId} />;
}
