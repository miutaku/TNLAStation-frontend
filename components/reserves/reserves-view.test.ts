import { describe, expect, it } from "vitest";

import { reserveMethodLabel } from "./reserves-view";

describe("reserveMethodLabel", () => {
  // EPGStation の予約項目にルール名は無い (api.d.ts にも ReserveApiModel にも存在しない)。
  // 互換面に無い鍵を足さないため、ルール由来かどうかは ruleId だけで決める。
  it("identifies a rule-generated reservation by its rule id", () => {
    expect(reserveMethodLabel({ ruleId: 2 })).toBe("ルール #2");
  });

  it("shows reservations without a rule as manual", () => {
    expect(reserveMethodLabel({})).toBe("手動予約");
  });
});
