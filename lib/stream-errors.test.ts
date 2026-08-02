import { describe, expect, it } from "vitest";

import { ApiError } from "./api/client";
import { describeStreamFailure } from "./stream-errors";

function apiFailure(reason?: string): ApiError {
  return new ApiError("TNLAStation API returned 500", 500, "/api/streams", "Internal Server Error", reason);
}

describe("describeStreamFailure", () => {
  it("explains the concurrent stream limit instead of showing a 500", () => {
    expect(describeStreamFailure(apiFailure("StreamIsFull")).message).toBe(
      "同時に視聴できる数の上限に達しています。ほかの視聴を終了してから開いてください。",
    );
  });

  it("never shows the placeholder message EPGStation puts in every failure", () => {
    for (const reason of ["StreamIsFull", "ChannelIsNotFound", "StreamProcessStartFailed"]) {
      expect(describeStreamFailure(apiFailure(reason)).message).not.toContain("Internal Server Error");
    }
  });

  it("tells the viewer to reopen when the backend has already dropped the session", () => {
    expect(describeStreamFailure(apiFailure("StreamIsUndefined")).message).toBe(
      "配信が見つかりません。開き直してください。",
    );
  });

  it("shows the raw code when the reason is unknown so it stays traceable", () => {
    expect(describeStreamFailure(apiFailure("SomethingNewUpstream")).message).toBe("SomethingNewUpstream");
  });

  it("falls back when the body carried no reason at all", () => {
    expect(describeStreamFailure(apiFailure()).message).toBe("配信を開始できませんでした。");
  });

  it("passes through failures that never reached the API", () => {
    const offline = new TypeError("Failed to fetch");

    expect(describeStreamFailure(offline)).toBe(offline);
  });
});
