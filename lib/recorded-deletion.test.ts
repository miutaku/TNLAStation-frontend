import { describe, expect, it } from "vitest";

import type { RecordedItem } from "@/lib/api/types";
import { createRecordedDeletePlan } from "@/lib/recorded-deletion";

const recorded = (videoFiles: RecordedItem["videoFiles"]): RecordedItem => ({
  id: 1,
  startAt: 1,
  endAt: 2,
  name: "番組",
  channelId: 1,
  isRecording: false,
  isEncoding: false,
  isProtected: false,
  videoFiles,
});

describe("createRecordedDeletePlan", () => {
  it("TSしかない番組でTSを選ぶと番組情報ごと削除する", () => {
    const item = recorded([{ id: 10, name: "TS", filename: "a.ts", type: "ts", size: 100 }]);

    expect(createRecordedDeletePlan(item, "ts")).toEqual({ kind: "recorded", videoFileCount: 1 });
  });

  it("TSとエンコード済みがある番組では選択した種類のファイルだけ削除する", () => {
    const item = recorded([
      { id: 10, name: "TS", filename: "a.ts", type: "ts", size: 100 },
      { id: 11, name: "MP4", filename: "a.mp4", type: "encoded", size: 50 },
    ]);

    expect(createRecordedDeletePlan(item, "ts")).toEqual({ kind: "files", videoFileIds: [10] });
    expect(createRecordedDeletePlan(item, "encoded")).toEqual({ kind: "files", videoFileIds: [11] });
  });
});
