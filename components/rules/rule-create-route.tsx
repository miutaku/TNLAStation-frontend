"use client";

import { useSearchParams } from "next/navigation";

import { parseRuleCreateDraft } from "@/components/rules/rule-create-draft";
import { RuleCreateView } from "@/components/rules/rule-editor-view";

export function RuleCreateRoute() {
  const query = useSearchParams();
  const initialDraft = parseRuleCreateDraft(query.get("name") ?? undefined, query.get("option") ?? undefined);
  return <RuleCreateView initialDraft={initialDraft} />;
}
