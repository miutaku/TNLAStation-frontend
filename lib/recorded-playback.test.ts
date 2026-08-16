import { describe, expect, it } from "vitest";

import type { VideoFile } from "@/lib/api/types";
import { playableFiles } from "./recorded-playback";

function file(id: number, type: VideoFile["type"], name = type.toUpperCase()): VideoFile {
  return { id, name, filename: `${id}.bin`, type, size: 1 };
}

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
