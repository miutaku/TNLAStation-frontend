import type { Metadata } from "next";

import { parseRuleCreateDraft } from "@/components/rules/rule-create-draft";
import { RuleCreateView } from "@/components/rules/rule-editor-view";

export const metadata: Metadata = { title: "録画ルールを作成" };

export default async function NewRulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialDraft = parseRuleCreateDraft(params.name, params.option);
  return <RuleCreateView initialDraft={initialDraft} />;
}
