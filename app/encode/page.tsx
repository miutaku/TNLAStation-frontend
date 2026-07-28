import type { Metadata } from "next";

import { EncodeView } from "@/components/encode/encode-view";

export const metadata: Metadata = { title: "エンコード" };

export default function EncodePage() {
  return <EncodeView />;
}
