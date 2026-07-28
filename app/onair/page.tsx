import type { Metadata } from "next";

import { OnAirView } from "@/components/onair/onair-view";

export const metadata: Metadata = { title: "放映中" };

export default function OnAirPage() {
  return <OnAirView />;
}
