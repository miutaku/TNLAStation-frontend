import { describe, expect, it } from "vitest";

import type { RecordedItem, ReserveItem } from "@/lib/api/types";
import { hasFinished, recordingProgramIds, reservedProgramIds } from "./program-marks";

function reserve(overrides: Partial<ReserveItem> & { id: number }): ReserveItem {
  return { isSkip: false, isConflict: false, isOverlap: false, ...overrides } as ReserveItem;
}

describe("reservedProgramIds", () => {
  it("marks only reserves that will actually record", () => {
    const reserves = [
      reserve({ id: 1, programId: 100 }),
      reserve({ id: 2, programId: 200, isSkip: true }),
      reserve({ id: 3, programId: 300, isOverlap: true }),
      // 時刻指定の予約は番組 id を持たず、番組表の行と結び付けられない。
      reserve({ id: 4 }),
    ];

    expect([...reservedProgramIds(reserves)]).toEqual([100]);
  });
});

describe("recordingProgramIds", () => {
  it("collects the programs being recorded right now", () => {
    const items = [{ id: 1, programId: 100 }, { id: 2 }] as RecordedItem[];

    expect([...recordingProgramIds(items)]).toEqual([100]);
  });
});

describe("hasFinished", () => {
  const now = 1_000;

  it("counts a program as finished the moment it ends", () => {
    expect(hasFinished({ endAt: now }, now)).toBe(true);
    expect(hasFinished({ endAt: now + 1 }, now)).toBe(false);
  });

  /** 時計が入る前に予約を塞ぐと、開いた直後だけ何も押せなくなる。 */
  it("treats nothing as finished before the clock is known", () => {
    expect(hasFinished({ endAt: 1 }, 0)).toBe(false);
  });
});
