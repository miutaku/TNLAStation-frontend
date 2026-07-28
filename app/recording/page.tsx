import type { Metadata } from "next";

import { RecordingView } from "@/components/recording/recording-view";

export const metadata: Metadata = { title: "録画中" };

export default function RecordingPage() {
  return <RecordingView />;
}
