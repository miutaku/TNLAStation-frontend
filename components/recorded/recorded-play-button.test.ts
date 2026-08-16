import { describe, expect, it } from "vitest";

import type { Config } from "@/lib/api/types";

import { recordedChoices } from "./recorded-play-button";

function config(overrides: Partial<Config> = {}): Config {
  return {
    socketIOPort: 8888,
    broadcast: { GR: true, BS: true, CS: false, SKY: false },
    recorded: [],
    encode: [],
    urlscheme: { m2ts: {}, video: {}, download: {} },
    isEnableTSLiveStream: true,
    isEnableTSRecordedStream: true,
    isEnableEncodedRecordedStream: true,
    streamConfig: {
      recorded: {
        ts: { hls: ["TS 720p"], webm: ["TS WebM"] },
        encoded: { hls: ["Encoded copy", "Encoded 720p"], mp4: ["Encoded MP4"] },
      },
    },
    ...overrides,
  };
}

describe("recorded streaming choices", () => {
  it("uses the TS and encoded branches independently", () => {
    expect(recordedChoices(config(), { type: "ts" })).toEqual([
      { type: "hls", modes: ["TS 720p"] },
      { type: "webm", modes: ["TS WebM"] },
    ]);
    expect(recordedChoices(config(), { type: "encoded" })).toEqual([
      { type: "hls", modes: ["Encoded copy", "Encoded 720p"] },
      { type: "mp4", modes: ["Encoded MP4"] },
    ]);
  });

  it("does not invent a fallback when EPGStation disables the file type", () => {
    expect(recordedChoices(config({ isEnableTSRecordedStream: false }), { type: "ts" })).toEqual([]);
    expect(recordedChoices(config({ isEnableEncodedRecordedStream: false }), { type: "encoded" })).toEqual([]);
  });

  it("does not invent HLS when no recorded stream format is configured", () => {
    expect(recordedChoices(config({ streamConfig: { recorded: { encoded: {} } } }), { type: "encoded" })).toEqual([]);
  });
});
