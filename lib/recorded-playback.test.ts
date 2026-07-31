import { describe, expect, it } from "vitest";

import type { VideoFile } from "@/lib/api/types";
import { defaultPlaybackFileId, playableFiles, playbackHref, playbackLabel } from "./recorded-playback";

function file(id: number, type: VideoFile["type"], name = type.toUpperCase()): VideoFile {
  return { id, name, filename: `${id}.bin`, type, size: 1 };
}

describe("playbackHref", () => {
  /** 元の TS は MPEG-2。ブラウザーはそのままでは再生できないので、変換の画面へ送る。 */
  it("sends a TS file through the converting player", () => {
    expect(playbackHref(file(1, "ts"), 9)).toBe("/recorded/streaming/1?recordedId=9&streamingType=hls&mode=0");
  });

  it("plays an encoded file directly", () => {
    expect(playbackHref(file(2, "encoded"), 9)).toBe("/recorded/watch?videoId=2&recordedId=9");
  });
});

describe("playableFiles", () => {
  it("puts what plays without converting first", () => {
    const files = [file(1, "ts"), file(2, "encoded", "H.265"), file(3, "encoded", "H.264")];

    expect(playableFiles(files).map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it("keeps the order of files that need no converting", () => {
    const files = [file(2, "encoded", "H.265"), file(3, "encoded", "H.264")];

    expect(playableFiles(files).map((item) => item.name)).toEqual(["H.265", "H.264"]);
  });
});

describe("defaultPlaybackFileId", () => {
  it("has nothing to play when every file is gone", () => {
    expect(defaultPlaybackFileId([])).toBeNull();
  });

  it("picks the file that needs no converting", () => {
    expect(defaultPlaybackFileId([file(1, "ts"), file(2, "encoded")])).toBe(2);
  });
});

describe("playbackLabel", () => {
  /** どれを再生するのかが分かるよう、変換が要るものはその旨を添える。 */
  it("names the file and marks the one that needs converting", () => {
    expect(playbackLabel(file(1, "encoded", "H.265"))).toBe("H.265");
    expect(playbackLabel(file(2, "ts", "TS"))).toBe("TS (変換して再生)");
  });
});
