import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  createRuleDraftUrl,
  parseRuleCreateDraft,
} from "./rule-create-draft";

const listSource = readFileSync(new URL("./rules-view.tsx", import.meta.url), "utf8");
const editorSource = readFileSync(new URL("./rule-editor-view.tsx", import.meta.url), "utf8");
const searchSource = readFileSync(new URL("../search/search-view.tsx", import.meta.url), "utf8");

describe("recording rule pages", () => {
  it("keeps the rule index list-only and links to dedicated create/edit pages", () => {
    expect(listSource).toContain('href="/rule/new"');
    expect(listSource).toContain("href={`/rule/${rule.id}/edit`}");
    expect(listSource).not.toContain("<RuleForm");
  });

  it("uses a real table with column headings for list mode", () => {
    expect(listSource).toContain("<table");
    expect(listSource).toContain("<thead>");
    expect(listSource).toContain("ルール名・キーワード");
    expect(listSource).toContain('viewMode === "cards"');
  });

  it("returns to the list only after create and edit requests succeed", () => {
    expect(editorSource.split('router.push("/rule")')).toHaveLength(5);
    expect(editorSource.indexOf("await apiClient.addRule")).toBeLessThan(
      editorSource.indexOf('router.push("/rule")'),
    );
    expect(editorSource.indexOf("await apiClient.updateRule")).toBeLessThan(
      editorSource.indexOf('router.push("/rule")', editorSource.indexOf("await apiClient.updateRule")),
    );
  });

  it("shows a distinct error for a rule that no longer exists", () => {
    expect(editorSource).toContain("resource.error.status === 404");
    expect(editorSource).toContain("録画ルールが見つかりません");
  });

  it("moves search conditions to the create page instead of creating immediately", () => {
    expect(searchSource).toContain("createRuleDraftUrl(");
    expect(searchSource).not.toContain("apiClient.addRule(");
  });
});

describe("recording rule create draft", () => {
  it("round-trips a name and search options through the create URL", () => {
    const url = createRuleDraftUrl(" 日曜映画 ", {
      keyword: "映画",
      GR: true,
      channelIds: [1, 2],
      genres: [{ genre: 6 }],
    });
    const parsedUrl = new URL(url, "https://tnlastation.test");

    expect(parseRuleCreateDraft(
      parsedUrl.searchParams.get("name") ?? undefined,
      parsedUrl.searchParams.get("option") ?? undefined,
    )).toEqual({
      name: "日曜映画",
      searchOption: {
        keyword: "映画",
        GR: true,
        channelIds: [1, 2],
        genres: [{ genre: 6 }],
      },
    });
  });

  it("ignores missing, malformed, and non-object drafts", () => {
    expect(parseRuleCreateDraft(undefined, undefined)).toBeNull();
    expect(parseRuleCreateDraft(undefined, "{")).toBeNull();
    expect(parseRuleCreateDraft(undefined, "[]")).toBeNull();
    expect(parseRuleCreateDraft(undefined, '{"genres":"not-an-array"}')).toBeNull();
    expect(parseRuleCreateDraft(undefined, '{"times":[null]}')).toBeNull();
  });
});
