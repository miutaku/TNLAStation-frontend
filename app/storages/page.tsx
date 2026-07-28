import type { Metadata } from "next";

import { StoragesView } from "@/components/storages/storages-view";

export const metadata: Metadata = { title: "ストレージ" };

export default function StoragesPage() {
  return <StoragesView />;
}
