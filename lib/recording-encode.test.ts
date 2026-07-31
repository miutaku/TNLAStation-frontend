import { describe, expect, it } from "vitest";

import type { RecordedItem, ReserveItem } from "@/lib/api/types";
import {
  buildEncodeOnlyReserveUpdate,
  findReserveForRecording,
  reserveEncodeModes,
  resolveReserveEncodeUpdate,
} from "@/lib/recording-encode";

const reserve = (overrides: Partial<ReserveItem> = {}): ReserveItem => ({
  id: 1,
  isSkip: false,
  isConflict: false,
  isOverlap: false,
  allowEndLack: true,
  isTimeSpecified: false,
  isDeleteOriginalAfterEncode: false,
  channelId: 100,
  startAt: 1_000,
  endAt: 2_000,
  name: "番組",
  ...overrides,
});

const recording = (overrides: Partial<RecordedItem> = {}): RecordedItem => ({
  id: 5,
  channelId: 100,
  startAt: 1_000,
  endAt: 2_000,
  name: "番組",
  isRecording: true,
  isEncoding: false,
  isProtected: false,
  ...overrides,
});

describe("findReserveForRecording", () => {
  it("番組 id が一致する予約を選ぶ", () => {
    const target = reserve({ id: 2, programId: 77, channelId: 999, startAt: 5 });
    const found = findReserveForRecording(recording({ programId: 77 }), [reserve(), target]);

    expect(found?.id).toBe(2);
  });

  it("番組 id を持たない時刻指定予約は放送局と開始時刻で引き当てる", () => {
    const target = reserve({ id: 3, isTimeSpecified: true, channelId: 100, startAt: 1_000 });
    const found = findReserveForRecording(recording(), [reserve({ id: 4, channelId: 200 }), target]);

    expect(found?.id).toBe(3);
  });

  it("対応する予約がなければ undefined", () => {
    expect(findReserveForRecording(recording(), [reserve({ channelId: 200, startAt: 9 })])).toBeUndefined();
  });
});

describe("reserveEncodeModes", () => {
  it("設定されている段だけを順に並べる", () => {
    expect(reserveEncodeModes(reserve({ encodeMode1: "H.264", encodeMode3: "H.265" })))
      .toEqual(["H.264", "H.265"]);
  });

  it("設定が無ければ空", () => {
    expect(reserveEncodeModes(reserve())).toEqual([]);
  });
});

describe("buildEncodeOnlyReserveUpdate", () => {
  it("画面で触らない保存先とタグは送り返して残す", () => {
    const item = reserve({
      tags: [7],
      parentDirectoryName: "recorded",
      directory: "anime",
      recordedFormat: "%TITLE%",
    });

    const update = buildEncodeOnlyReserveUpdate(item, { mode: "H.265", removeOriginal: true });

    expect(update.allowEndLack).toBe(true);
    expect(update.tags).toEqual([7]);
    expect(update.saveOption).toEqual({
      parentDirectoryName: "recorded",
      directory: "anime",
      recordedFormat: "%TITLE%",
    });
    expect(update.encodeOption).toMatchObject({ mode1: "H.265", isDeleteOriginalAfterEncode: true });
  });

  it("mode2/3 はそのまま持ち越す", () => {
    const item = reserve({ encodeMode1: "H.264", encodeMode2: "H.265", encodeDirectory2: "hevc" });

    const update = buildEncodeOnlyReserveUpdate(item, { mode: "H.264", removeOriginal: false });

    expect(update.encodeOption).toMatchObject({ mode2: "H.265", directory2: "hevc" });
  });

  it("エンコードしないを選ぶと encodeOption ごと落とす", () => {
    const item = reserve({ encodeMode1: "H.264", isDeleteOriginalAfterEncode: true });

    expect(buildEncodeOnlyReserveUpdate(item, { mode: "", removeOriginal: false }).encodeOption)
      .toBeUndefined();
  });

  it("mode1 を外しても mode2 が残っていれば encodeOption は送る", () => {
    const item = reserve({ encodeMode1: "H.264", encodeDirectory1: "avc", encodeMode2: "H.265" });

    const update = buildEncodeOnlyReserveUpdate(item, { mode: "", removeOriginal: false });

    // 出力先だけが残ると上流の検査 (mode1 なしの directory1) で弾かれる。
    expect(update.encodeOption).toMatchObject({ mode1: undefined, directory1: undefined, mode2: "H.265" });
  });
});

describe("resolveReserveEncodeUpdate", () => {
  it("書き込み先の id は渡された一覧から取る", () => {
    // id の出どころは渡された一覧だけ。行が作り直されても番組から引き直せる。
    const regenerated = reserve({ id: 44759, programId: 77, encodeMode1: "H.264" });

    const resolved = resolveReserveEncodeUpdate(
      recording({ programId: 77 }),
      [regenerated],
      { mode: "H.265", removeOriginal: true },
    );

    expect(resolved?.reserveId).toBe(44759);
    expect(resolved?.update.encodeOption).toMatchObject({
      mode1: "H.265",
      isDeleteOriginalAfterEncode: true,
    });
  });

  it("一覧に無ければ undefined を返し、呼び出し側に書かせない", () => {
    const resolved = resolveReserveEncodeUpdate(
      recording({ programId: 77 }),
      [reserve({ id: 1, programId: 78, channelId: 200, startAt: 9 })],
      { mode: "H.265", removeOriginal: false },
    );

    expect(resolved).toBeUndefined();
  });
});
