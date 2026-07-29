import { describe, expect, it } from "vitest";

import { validateDateRange, validateRelativePath, validateRequiredText } from "@/lib/form-validation";

describe("form validation", () => {
  it("rejects blank required text and overly long text", () => {
    expect(validateRequiredText("   ", "番組名")).toContain("番組名を入力してください。");
    expect(validateRequiredText("1234", "番組名", 3)).toContain("番組名は3文字以内で入力してください。");
    expect(validateRequiredText("番組", "番組名", 3)).toEqual([]);
  });

  it("requires an ordered, valid date range", () => {
    expect(validateDateRange("", "")).not.toEqual([]);
    expect(validateDateRange("2026-07-29T12:00", "2026-07-29T11:00")).not.toEqual([]);
    expect(validateDateRange("2026-07-29T11:00", "2026-07-29T12:00")).toEqual([]);
  });

  it("rejects absolute paths and parent traversal", () => {
    expect(validateRelativePath("../secret", "保存先")).not.toEqual([]);
    expect(validateRelativePath("/recorded", "保存先")).not.toEqual([]);
    expect(validateRelativePath("drama/2026", "保存先")).toEqual([]);
  });
});
