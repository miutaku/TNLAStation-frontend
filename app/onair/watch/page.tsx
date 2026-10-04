import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/async-state";
import { OnAirWatchRoute } from "@/components/watch-route-views";

export const metadata: Metadata = { title: "ライブ視聴" };

export default function OnAirWatchPage() {
  return (
    <Suspense fallback={<ContentSkeleton cards={1} />}>
      <OnAirWatchRoute />
    </Suspense>
  );
}
