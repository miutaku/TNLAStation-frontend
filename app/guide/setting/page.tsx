import type { Metadata } from "next";

import { GuideSettingView } from "@/components/guide/guide-setting-view";

export const metadata: Metadata = { title: "番組表設定" };

export default function GuideSettingPage() {
  return <GuideSettingView />;
}
