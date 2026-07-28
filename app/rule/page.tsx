import type { Metadata } from "next";

import { RulesView } from "@/components/rules/rules-view";

export const metadata: Metadata = { title: "録画ルール" };

export default function RulePage() {
  return <RulesView />;
}
