import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RuleEditView } from "@/components/rules/rule-editor-view";

export const metadata: Metadata = { title: "録画ルールを編集" };

export default async function EditRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ruleId = Number(id);
  if (!Number.isSafeInteger(ruleId) || ruleId <= 0) notFound();
  return <RuleEditView ruleId={ruleId} />;
}
