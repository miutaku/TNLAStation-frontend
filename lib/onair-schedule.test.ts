import { describe, expect, it } from "vitest";

import type { Schedule, ScheduleProgramItem } from "@/lib/api/types";
import { describeMissingProgram, findCurrentProgram, nextScheduleRefreshAt } from "./onair-schedule";

const NOON = Date.parse("2026-08-01T12:00:00+09:00");

function program(startAt: number, endAt: number): ScheduleProgramItem {
  return { id: startAt, channelId: 1, startAt, endAt, name: "番組", isFree: true } as ScheduleProgramItem;
}

function schedule(programs: ScheduleProgramItem[]): Schedule {
  return { channel: { id: 1 }, programs } as Schedule;
}

describe("findCurrentProgram", () => {
  it("takes the program covering the moment, with the end exclusive", () => {
    const airing = program(NOON - 600_000, NOON + 600_000);
    const next = program(NOON + 600_000, NOON + 1_200_000);

    expect(findCurrentProgram(schedule([airing, next]), NOON)).toBe(airing);
    expect(findCurrentProgram(schedule([airing, next]), NOON + 600_000)).toBe(next);
  });

  it("finds nothing for a channel with no schedule", () => {
    expect(findCurrentProgram(undefined, NOON)).toBeUndefined();
  });
});

describe("describeMissingProgram", () => {
  it("separates a gap in the schedule from having no schedule at all", () => {
    expect(describeMissingProgram(schedule([program(NOON, NOON + 1)]))).toBe("off-air");
    expect(describeMissingProgram(schedule([]))).toBe("unknown");
    expect(describeMissingProgram(undefined)).toBe("unknown");
  });
});

describe("nextScheduleRefreshAt", () => {
  /**
   * 番組が終わると手元の一式が古くなる。取り直さないと、放送しているのに
   * 「番組情報を取得できませんでした」に見える。
   */
  it("points at the first program to end", () => {
    const schedules = [
      schedule([program(NOON - 1_000, NOON + 900_000)]),
      schedule([program(NOON - 1_000, NOON + 300_000)]),
    ];

    expect(nextScheduleRefreshAt(schedules, NOON)).toBe(NOON + 300_000);
  });

  it("ignores programs that are not on air right now", () => {
    const schedules = [schedule([program(NOON + 600_000, NOON + 1_200_000)])];

    expect(nextScheduleRefreshAt(schedules, NOON)).toBeNull();
  });

  it("has nothing to wait for when no channel reports a schedule", () => {
    expect(nextScheduleRefreshAt([], NOON)).toBeNull();
  });
});
