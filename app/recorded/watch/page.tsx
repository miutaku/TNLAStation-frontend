import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/async-state";
import { RecordedWatchRoute } from "@/components/watch-route-views";

export const metadata: Metadata = { title: "録画を再生" };

export default function RecordedWatchPage() {
  return (
    <Suspense fallback={<ContentSkeleton cards={1} />}>
      <RecordedWatchRoute />
    </Suspense>
  );
}
