import { describe, expect, it } from "vitest";

import type { Rule } from "@/lib/api/types";

import { buildRuleUpdateOptions, ruleSearchOptionToConditions } from "./rule-form";

const originalRule: Rule = {
  id: 42,
  name: "深夜アニメ",
  isTimeSpecification: true,
  searchOption: {
    keyword: "アニメ",
    ignoreKeyword: "再放送",
    keyCS: true,
    keyRegExp: false,
    name: true,
    description: false,
    extended: true,
    ignoreKeyCS: true,
    ignoreKeyRegExp: true,
    ignoreName: true,
    ignoreDescription: false,
    ignoreExtended: true,
    GR: true,
    BS: true,
    CS: false,
    SKY: false,
    channelIds: [11, 12],
    genres: [{ genre: 7, subGenre: 1 }, { genre: 7, subGenre: 2 }, { genre: 3 }],
    times: [{ week: 0b0000010, start: 23, range: 2 }, { week: 0b0000100, start: 1, range: 1 }],
    isFree: true,
    durationMin: 1_800,
    durationMax: 7_200,
    searchPeriods: [
      { startAt: 1_800_000_000_000, endAt: 1_800_086_400_000 },
      { startAt: 1_900_000_000_000, endAt: 1_900_086_400_000 },
    ],
  },
  reserveOption: {
    enable: false,
    allowEndLack: false,
    avoidDuplicate: true,
    periodToAvoidDuplicate: 12,
    tags: [4, 9],
  },
  saveOption: {
    parentDirectoryName: "recorded",
    directory: "anime/late-night",
    recordedFormat: "%TITLE%",
  },
  encodeOption: {
    mode1: "H.265",
    encodeParentDirectoryName1: "encoded",
    directory1: "anime",
    mode2: "H.264",
    encodeParentDirectoryName2: "mobile",
    directory2: "anime",
    isDeleteOriginalAfterEncode: true,
  },
};

describe("recording rule editor payload", () => {
  it("preserves every non-edited search, reserve, save and encode option", () => {
    const initial = ruleSearchOptionToConditions(originalRule.searchOption);

    const update = buildRuleUpdateOptions(
      originalRule,
      initial,
      initial,
      " 深夜アニメ・更新版 ",
      false,
      originalRule.encodeOption,
    );

    expect(update.name).toBe("深夜アニメ・更新版");
    expect(update.isTimeSpecification).toBe(true);
    expect(update.searchOption).toEqual(originalRule.searchOption);
    expect(update.reserveOption).toEqual({
      ...originalRule.reserveOption,
      avoidDuplicate: false,
    });
    expect(update.reserveOption.enable).toBe(false);
    expect(update.reserveOption.allowEndLack).toBe(false);
    expect(update.reserveOption.periodToAvoidDuplicate).toBe(12);
    expect(update.reserveOption.tags).toEqual([4, 9]);
    expect(update.saveOption).toEqual(originalRule.saveOption);
    expect(update.encodeOption).toEqual(originalRule.encodeOption);
  });

  it("replaces a changed form field while retaining hidden compatibility fields", () => {
    const initial = ruleSearchOptionToConditions(originalRule.searchOption);
    const edited = {
      ...initial,
      keyword: "新作アニメ",
      genres: [6],
    };

    const update = buildRuleUpdateOptions(
      originalRule,
      initial,
      edited,
      originalRule.name ?? "",
      true,
      originalRule.encodeOption,
    );

    expect(update.searchOption.keyword).toBe("新作アニメ");
    expect(update.searchOption.genres).toEqual([{ genre: 6 }]);
    expect(update.searchOption.times).toEqual(originalRule.searchOption.times);
    expect(update.searchOption.searchPeriods).toEqual(originalRule.searchOption.searchPeriods);
    expect(update.searchOption.ignoreKeyCS).toBe(true);
    expect(update.searchOption.ignoreKeyRegExp).toBe(true);
  });

  it("updates or clears the encode option selected in detailed options", () => {
    const initial = ruleSearchOptionToConditions(originalRule.searchOption);
    const changedEncodeOption = {
      ...originalRule.encodeOption!,
      mode1: "AV1",
      isDeleteOriginalAfterEncode: false,
    };

    const changed = buildRuleUpdateOptions(
      originalRule,
      initial,
      initial,
      originalRule.name ?? "",
      true,
      changedEncodeOption,
    );
    const cleared = buildRuleUpdateOptions(
      originalRule,
      initial,
      initial,
      originalRule.name ?? "",
      true,
      undefined,
    );

    expect(changed.encodeOption).toEqual(changedEncodeOption);
    expect(cleared.encodeOption).toBeUndefined();
  });
});
