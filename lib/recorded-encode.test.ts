import { describe, expect, it } from "vitest";

import type { RecordedItem } from "@/lib/api/types";
import { createRecordedEncodePlan } from "@/lib/recorded-encode";

const recorded = (id: number, overrides: Partial<RecordedItem> = {}): RecordedItem => ({
  id,
  startAt: 1,
  endAt: 2,
  name: `番組 ${id}`,
  channelId: 1,
  isRecording: false,
  isEncoding: false,
  isProtected: false,
  videoFiles: [{ id: id * 10, name: "TS", filename: `${id}.m2ts`, type: "ts", size: 100 }],
  ...overrides,
});

const index = (...items: RecordedItem[]) => new Map(items.map((item) => [item.id, item]));

describe("createRecordedEncodePlan", () => {
  it("元 TS を変換元にする", () => {
    const plan = createRecordedEncodePlan([1], index(recorded(1)));

    expect(plan.targets).toEqual([{ recordedId: 1, name: "番組 1", sourceVideoFileId: 10 }]);
    expect(plan.skipped).toEqual([]);
  });

  it("エンコード済みしかない番組は変換元がないので外す", () => {
    const item = recorded(1, {
      videoFiles: [{ id: 11, name: "MP4", filename: "1.mp4", type: "encoded", size: 50 }],
    });

    expect(createRecordedEncodePlan([1], index(item))).toEqual({
      targets: [],
      skipped: [{ recordedId: 1, name: "番組 1", reason: "no-source" }],
    });
  });

  it("録画中の番組は書き込み途中なので外す", () => {
    const plan = createRecordedEncodePlan([1], index(recorded(1, { isRecording: true })));

    expect(plan.skipped).toEqual([{ recordedId: 1, name: "番組 1", reason: "recording" }]);
  });

  it("手元に情報がない id も理由付きで残す", () => {
    const plan = createRecordedEncodePlan([1, 2], index(recorded(1)));

    expect(plan.targets.map((target) => target.recordedId)).toEqual([1]);
    expect(plan.skipped).toEqual([{ recordedId: 2, name: "録画 #2", reason: "unknown" }]);
  });

  it("既にエンコード中でも、別の設定で積めるように対象へ残す", () => {
    const plan = createRecordedEncodePlan([1], index(recorded(1, { isEncoding: true })));

    expect(plan.targets.map((target) => target.recordedId)).toEqual([1]);
  });
});
