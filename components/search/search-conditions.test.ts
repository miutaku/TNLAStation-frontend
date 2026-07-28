import { describe, expect, it } from "vitest";

import { DEFAULT_SEARCH_CONDITIONS, searchConditionsToOption } from "./search-conditions";

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
});
