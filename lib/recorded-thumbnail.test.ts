import { describe, expect, it } from "vitest";

import type { RecordedItem } from "@/lib/api/types";
import { createThumbnailPlan, thumbnailSkipLabel, toThumbnailTarget } from "./recorded-thumbnail";

function recorded(overrides: Partial<RecordedItem> & { id: number }): RecordedItem {
  return {
    channelId: 1,
    startAt: 0,
    endAt: 1,
    name: `録画 ${overrides.id}`,
    isRecording: false,
    isEncoding: false,
    isProtected: false,
    videoFiles: [{ id: overrides.id * 10, name: "TS", filename: "a.m2ts", type: "ts", size: 1 }],
    ...overrides,
  } as RecordedItem;
}

describe("toThumbnailTarget", () => {
  it("prefers the original recording over an encoded copy", () => {
    const item = recorded({
      id: 1,
      videoFiles: [
        { id: 11, name: "H.264", filename: "a.mp4", type: "encoded", size: 1 },
        { id: 12, name: "TS", filename: "a.m2ts", type: "ts", size: 1 },
      ],
      thumbnails: [5],
    });

    expect(toThumbnailTarget(item)).toEqual({ recordedId: 1, videoFileId: 12, staleThumbnailIds: [5] });
  });

  it("falls back to whatever file exists when the original is gone", () => {
    const item = recorded({
      id: 2,
      videoFiles: [{ id: 21, name: "H.264", filename: "a.mp4", type: "encoded", size: 1 }],
    });

    expect(toThumbnailTarget(item)).toMatchObject({ videoFileId: 21, staleThumbnailIds: [] });
  });

  it("refuses while the recording is still running", () => {
    expect(toThumbnailTarget(recorded({ id: 3, isRecording: true }))).toBe("recording");
  });

  it("refuses when no video file is left", () => {
    expect(toThumbnailTarget(recorded({ id: 4, videoFiles: [] }))).toBe("no-source");
  });
});

describe("createThumbnailPlan", () => {
  it("splits what can be redone from what cannot, keeping the reason", () => {
    const items = [
      recorded({ id: 1 }),
      recorded({ id: 2, isRecording: true }),
      recorded({ id: 3, videoFiles: [] }),
    ];

    const plan = createThumbnailPlan([1, 2, 3, 99], items);

    expect(plan.targets.map((target) => target.recordedId)).toEqual([1]);
    expect(plan.skipped).toEqual([
      { recordedId: 2, reason: "recording" },
      { recordedId: 3, reason: "no-source" },
      { recordedId: 99, reason: "unknown" },
    ]);
  });

  it("labels every reason so the count never goes unexplained", () => {
    for (const reason of ["unknown", "recording", "no-source"] as const) {
      expect(thumbnailSkipLabel(reason)).not.toBe("");
    }
  });
});
