import { describe, expect, it } from "vitest";

import { availableBroadcastTypes, BROADCAST_TYPE_ORDER } from "./broadcast-types";

describe("availableBroadcastTypes", () => {
  it("keeps only what the tuner can receive, in a fixed order", () => {
    expect(availableBroadcastTypes({ GR: true, BS: false, CS: true, SKY: false })).toEqual(["GR", "CS"]);
  });

  /** 出ていた選択肢が一瞬消えるより、多いまま待って絞り込むほうが揺れない。 */
  it("shows every type before the config arrives", () => {
    expect(availableBroadcastTypes(undefined)).toEqual(BROADCAST_TYPE_ORDER);
  });

  /** 1 つも受信できないと報告されたときに絞ると、選ぶ手段が無くなる。 */
  it("does not narrow down to nothing", () => {
    expect(availableBroadcastTypes({ GR: false, BS: false, CS: false, SKY: false })).toEqual(BROADCAST_TYPE_ORDER);
  });
});
