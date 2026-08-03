import { describe, expect, it } from "vitest";

import {
  DEFAULT_SEARCH_CONDITIONS,
  hasNestedUnboundedQuantifier,
  searchConditionsToOption,
  validateSearchConditions,
} from "./search-conditions";

describe("searchConditionsToOption", () => {
  it("does not send keyword target flags when the corresponding keyword is empty", () => {
    const option = searchConditionsToOption({
      ...DEFAULT_SEARCH_CONDITIONS,
      genres: [7],
    });

    expect(option.keyword).toBeUndefined();
    expect(option.name).toBe(false);
    expect(option.description).toBe(false);
    expect(option.ignoreKeyword).toBeUndefined();
    expect(option.ignoreName).toBe(false);
    expect(option.ignoreDescription).toBe(false);
  });

  it("keeps selected target flags when a keyword is present", () => {
    const option = searchConditionsToOption({
      ...DEFAULT_SEARCH_CONDITIONS,
      keyword: "ニュース",
      ignoreKeyword: "再放送",
    });

    expect(option.name).toBe(true);
    expect(option.description).toBe(true);
    expect(option.ignoreName).toBe(true);
    expect(option.ignoreDescription).toBe(true);
  });

  it("validates regular expressions, ranges, and paired periods", () => {
    const errors = validateSearchConditions({
      ...DEFAULT_SEARCH_CONDITIONS,
      keyword: "[",
      keyRegExp: true,
      durationMin: "60",
      durationMax: "30",
      periodStart: "2026-07-29T12:00",
    });

    expect(errors).toContain("検索キーワードの正規表現が正しくありません。");
    expect(errors).toContain("最大の長さは最小の長さ以上にしてください。");
    expect(errors).toContain("放送期間は開始と終了の両方を入力してください。");
  });

  it("rejects a regular expression with nested unbounded repetition", () => {
    const errors = validateSearchConditions({
      ...DEFAULT_SEARCH_CONDITIONS,
      keyword: "(a+)+$",
      keyRegExp: true,
    });

    expect(errors.some((error) => error.includes("入れ子になった繰り返し"))).toBe(true);
  });
});

describe("hasNestedUnboundedQuantifier", () => {
  it.each([
    "ニュース",
    "^ドラマ.*$",
    "(abc)+",
    "[a-z]+",
    "a{3}",
    "a{3,7}",
    "\\(a\\)+",
    "(?:abc)+",
  ])("does not flag %s", (pattern) => {
    expect(hasNestedUnboundedQuantifier(pattern)).toBe(false);
  });

  it.each([
    "(a+)+",
    "(a*)*",
    "(a+)*",
    "([a-z]+)+",
    "(a{2,})+",
    "((a+)+)+",
  ])("flags %s", (pattern) => {
    expect(hasNestedUnboundedQuantifier(pattern)).toBe(true);
  });
});
