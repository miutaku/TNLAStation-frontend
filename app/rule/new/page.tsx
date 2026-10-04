import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/async-state";
import { RuleCreateRoute } from "@/components/rules/rule-create-route";

export const metadata: Metadata = { title: "録画ルールを作成" };

export default function NewRulePage() {
  return (
    <Suspense fallback={<ContentSkeleton cards={1} />}>
      <RuleCreateRoute />
    </Suspense>
  );
}
