import { describe, expect, it } from "vitest";

import {
  EMPTY_PROGRAM_COLLECTION_SEARCH,
  hasProgramCollectionQuery,
  ruleOptionLabel,
  toProgramCollectionQuery,
} from "./program-collection-search";
import type { Rule } from "@/lib/api/types";

describe("program collection search query", () => {
  it("normalizes the shared reservation and recording filters", () => {
    expect(
      toProgramCollectionQuery({
        keyword: "  朝ドラ  ",
        ruleId: "0",
        channelId: "3273601024",
        genre: "7",
      }),
    ).toEqual({
      keyword: "朝ドラ",
      ruleId: 0,
      channelId: 3273601024,
      genre: 7,
    });
  });

  it("omits blank and invalid values", () => {
    expect(toProgramCollectionQuery({ ...EMPTY_PROGRAM_COLLECTION_SEARCH, channelId: "invalid" })).toEqual({
      keyword: undefined,
      ruleId: undefined,
      channelId: undefined,
      genre: undefined,
    });
    expect(hasProgramCollectionQuery(EMPTY_PROGRAM_COLLECTION_SEARCH)).toBe(false);
    expect(hasProgramCollectionQuery({ ...EMPTY_PROGRAM_COLLECTION_SEARCH, keyword: "番組" })).toBe(true);
  });

  it("uses only the rule name for rule filter labels", () => {
    const unnamedRule = {
      id: 2,
      name: "   ",
      searchOption: { keyword: "アニメ" },
    } as Rule;

    expect(ruleOptionLabel(unnamedRule)).toBe("無題のルール");
    expect(ruleOptionLabel({ ...unnamedRule, name: "  週末ドラマ  " })).toBe("週末ドラマ");
  });
});
