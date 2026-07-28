import type { Metadata } from "next";

import { RecordedView } from "@/components/recorded/recorded-view";

export const metadata: Metadata = { title: "録画済み一覧" };

export default function RecordedPage() {
  return <RecordedView />;
}
