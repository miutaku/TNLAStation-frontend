import { describe, expect, it } from "vitest";

import { calculateElapsedPercentage, calculatePercentage, formatBytes, formatDateTime, formatDuration, formatLongDate, formatTime, genreName } from "./format";

describe("display formatting", () => {
  it("formats EPG timestamps in JST", () => {
    const timestamp = Date.UTC(2026, 6, 20, 0, 5);
    expect(formatDateTime(timestamp)).toBe("2026/07/20 09:05");
    expect(formatTime(timestamp)).toBe("09:05");
  });

  it("formats a full date with the JST weekday past the 32-bit Unix time overflow", () => {
    const timestamp = 2_147_483_647 * 1000;
    expect(formatLongDate(timestamp)).toBe("2038/01/19 (火)");
  });

  it("formats program durations", () => {
    expect(formatDuration(0, 45 * 60_000)).toBe("45分");
    expect(formatDuration(0, 90 * 60_000)).toBe("1時間30分");
  });

  it("formats file sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1.5 * 1024 ** 3)).toBe("1.5 GB");
  });

  it("uses a fallback for unknown genres", () => {
    expect(genreName(3)).toBe("ドラマ");
    expect(genreName(99)).toBe("その他");
  });

  it("clamps storage and elapsed progress", () => {
    expect(calculatePercentage(75, 100)).toBe(75);
    expect(calculatePercentage(120, 100)).toBe(100);
    expect(calculatePercentage(1, 0)).toBe(0);
    expect(calculateElapsedPercentage(1_000, 2_000, 1_250)).toBe(25);
  });
});
