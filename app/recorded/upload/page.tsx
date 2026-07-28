import type { Metadata } from "next";

import { RecordedUploadView } from "@/components/recorded/recorded-upload-view";

export const metadata: Metadata = { title: "録画ファイルを登録" };

export default function RecordedUploadPage() {
  return <RecordedUploadView />;
}
