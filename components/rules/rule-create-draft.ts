import type { RuleSearchOptions } from "@/lib/api/types";

export interface RuleCreateDraft {
  name: string;
  searchOption: RuleSearchOptions;
}

export function createRuleDraftUrl(name: string, searchOption: RuleSearchOptions): string {
  const params = new URLSearchParams();
  const trimmedName = name.trim();
  if (trimmedName) params.set("name", trimmedName);
  params.set("option", JSON.stringify(searchOption));
  return `/rule/new?${params.toString()}`;
}

export function parseRuleCreateDraft(
  rawName: string | string[] | undefined,
  rawOption: string | string[] | undefined,
): RuleCreateDraft | null {
  const optionValue = Array.isArray(rawOption) ? rawOption[0] : rawOption;
  if (!optionValue) return null;

  try {
    const parsed: unknown = JSON.parse(optionValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const option = parsed as Record<string, unknown>;
    if (
      !isNumberArray(option.channelIds)
      || !isObjectArrayWithNumber(option.genres, "genre")
      || !isObjectArrayWithNumber(option.times, "week")
      || !isObjectArray(option.searchPeriods)
    ) {
      return null;
    }
    const nameValue = Array.isArray(rawName) ? rawName[0] : rawName;
    return {
      name: typeof nameValue === "string" ? nameValue.slice(0, 100) : "",
      searchOption: parsed as RuleSearchOptions,
    };
  } catch {
    return null;
  }
}

function isNumberArray(value: unknown): boolean {
  return value === undefined
    || (Array.isArray(value) && value.every((item) => typeof item === "number"));
}

function isObjectArray(value: unknown): boolean {
  return value === undefined
    || (Array.isArray(value) && value.every(
      (item) => Boolean(item) && typeof item === "object" && !Array.isArray(item),
    ));
}

function isObjectArrayWithNumber(value: unknown, key: string): boolean {
  return value === undefined
    || (
      Array.isArray(value)
      && value.every(
        (item) => Boolean(item)
          && typeof item === "object"
          && !Array.isArray(item)
          && typeof (item as Record<string, unknown>)[key] === "number",
      )
    );
}
