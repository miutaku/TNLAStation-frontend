import type { Metadata } from "next";

import { ReservesView } from "@/components/reserves/reserves-view";

export const metadata: Metadata = { title: "予約一覧" };

export default function ReservesPage() {
  return <ReservesView />;
}
