import { describe, expect, it } from "vitest";

import { dashboardMetrics, type DashboardData } from "./dashboard-view";

function data(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    config: {} as DashboardData["config"],
    reserves: [],
    reserveTotal: 12,
    recorded: [],
    recordedTotal: 340,
    recordingTotal: 0,
    ruleTotal: 7,
    encodeTotal: 0,
    ...overrides,
  };
}

describe("dashboardMetrics", () => {
  /** 放送波は受信できるかどうかが分かるだけで、日々見る値ではない。 */
  it("shows what changes day to day, not the tuner capability", () => {
    const labels = dashboardMetrics(data(), 0).map((metric) => metric.label);

    expect(labels).toEqual(["予約", "競合", "録画中", "録画ルール", "エンコード", "録画済み", "空き容量"]);
    expect(labels).not.toContain("放送波");
  });

  /** 目を向けてほしいものだけ強調する。常に光っていると意味がなくなる。 */
  it("highlights only what needs attention", () => {
    const idle = dashboardMetrics(data(), 0);
    expect(idle.filter((metric) => metric.emphasis)).toEqual([]);

    const busy = dashboardMetrics(data({ recordingTotal: 2, encodeTotal: 3 }), 1);
    expect(busy.filter((metric) => metric.emphasis).map((metric) => metric.label))
      .toEqual(["競合", "録画中", "エンコード"]);
  });

  it("says so when the storage could not be read", () => {
    const withoutStorage = dashboardMetrics(data(), 0).find((metric) => metric.label === "空き容量");

    expect(withoutStorage?.value).toBe("—");
    expect(withoutStorage?.helper).toContain("取得できていません");
  });

  it("shows the free space of the first destination", () => {
    const storage = { name: "recorded", available: 1_073_741_824, used: 0, total: 1_073_741_824, fileTypes: [] };
    const metric = dashboardMetrics(data({ storage }), 0).find((item) => item.label === "空き容量");

    expect(metric?.value).toBe("1.0 GB");
    expect(metric?.helper).toContain("recorded");
  });
});
