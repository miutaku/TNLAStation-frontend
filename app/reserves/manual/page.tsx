import type { Metadata } from "next";

import { ManualReserveView } from "@/components/reserves/manual-reserve-view";

export const metadata: Metadata = { title: "時刻指定予約" };

export default function ManualReservePage() {
  return <ManualReserveView />;
}
