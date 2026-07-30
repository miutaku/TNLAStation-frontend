import type { Metadata } from "next";

import { OnAirView } from "@/components/onair/onair-view";

export const metadata: Metadata = { title: "放送中" };

export default function OnAirPage() {
  return <OnAirView />;
}
