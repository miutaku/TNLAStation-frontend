import type { Metadata } from "next";

import { GuideView } from "@/components/guide/guide-view";

export const metadata: Metadata = { title: "番組表" };

export default function GuidePage() {
  return <GuideView />;
}
