import { describe, expect, it } from "vitest";

import { reserveMethodLabel } from "./reserves-view";

describe("reserveMethodLabel", () => {
  it("uses the rule name for a rule-generated reservation", () => {
    expect(reserveMethodLabel({ ruleId: 2, ruleName: "週末ドラマ" })).toBe("週末ドラマ");
  });

  it("falls back to the rule id when an older backend omits the name", () => {
    expect(reserveMethodLabel({ ruleId: 2 })).toBe("ルール #2");
  });

  it("shows reservations without a rule as manual", () => {
    expect(reserveMethodLabel({})).toBe("手動予約");
  });
});
